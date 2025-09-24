const Stripe = require('stripe');
const paypal = require('@paypal/checkout-server-sdk');
const { validationResult } = require('express-validator');
const Payment = require('../models/Payment');
const Reservation = require('../models/Reservation');
const User = require('../models/User');
const Event = require('../models/Event');

const { sendBookingConfirmation } = require('../services/email.service');
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

function buildPayPalClient() {
	if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
		console.error('PayPal credentials (PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET) are missing from your .env file.');
		return null;
	}

	const isProduction = process.env.NODE_ENV === 'production';
	const Environment = isProduction ? paypal.core.LiveEnvironment : paypal.core.SandboxEnvironment;

	// Diagnostic logging
	console.log(`[PayPal] Initializing client for ${isProduction ? 'production' : 'sandbox'} environment.`);
	console.log(`[PayPal] Using Client ID: ${process.env.PAYPAL_CLIENT_ID.substring(0, 8)}...`);

	return new paypal.core.PayPalHttpClient(new Environment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET));
}

exports.checkout = async (req, res, next) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
		const { reservationId, method } = req.body;
		const reservation = await Reservation.findById(reservationId);
		if (!reservation || reservation.userId.toString() !== req.user.id) return res.status(404).json({ message: 'Reservation not found' });
		if (reservation.status !== 'reserved') return res.status(400).json({ message: 'Invalid reservation status' });

		let payment;
		if (method === 'stripe') {
			if (!stripe) return res.status(500).json({ message: 'Stripe not configured' });
			const intent = await stripe.paymentIntents.create({
				amount: Math.round(reservation.totalPrice * 100),
				currency: 'usd',
				metadata: { reservationId: reservation._id.toString() },
			});
			payment = await Payment.create({ reservationId, userId: req.user.id, eventId: reservation.eventId, amount: reservation.totalPrice, method: 'stripe', transactionId: intent.id, status: 'pending' });
			return res.json({ clientSecret: intent.client_secret, paymentId: payment._id });
		}

		if (method === 'paypal') {
			const client = buildPayPalClient();
			if (!client) return res.status(500).json({ message: 'PayPal not configured' });
			const request = new paypal.orders.OrdersCreateRequest();
			request.prefer('return=representation');
			request.requestBody({
				intent: 'CAPTURE',
				purchase_units: [{ amount: { currency_code: 'USD', value: reservation.totalPrice.toFixed(2) } }],
			});
			const response = await client.execute(request);
			payment = await Payment.create({ reservationId, userId: req.user.id, eventId: reservation.eventId, amount: reservation.totalPrice, method: 'paypal', transactionId: response.result.id, status: 'pending' });
			return res.json({ orderId: response.result.id, paymentId: payment._id });
		}

		// local method (cash or offline)
		payment = await Payment.create({ reservationId, userId: req.user.id, eventId: reservation.eventId, amount: reservation.totalPrice, method: 'local', status: 'pending' });
		return res.json({ paymentId: payment._id });
	} catch (err) {
		return next(err);
	}
};

exports.confirmPayment = async (req, res, next) => {
	try {
		const { paymentId } = req.params;
		const payment = await Payment.findById(paymentId);

		if (!payment || payment.userId.toString() !== req.user.id) return res.status(404).json({ message: 'Payment not found' });
		if (payment.status === 'completed') return res.json({ success: true, message: 'Payment was already completed.', data: payment });
		if (payment.method === 'local') return res.status(400).json({ success: false, message: 'Local payments must be confirmed by an administrator.' });

		let isSuccess = false;

		if (payment.method === 'stripe') {
			if (!stripe) return res.status(500).json({ message: 'Stripe not configured' });
			const intent = await stripe.paymentIntents.retrieve(payment.transactionId);
			if (intent.status === 'succeeded') {
				payment.status = 'completed';
				isSuccess = true;
			} else {
				payment.status = 'failed';
			}
		}

		if (payment.method === 'paypal') {
			const client = buildPayPalClient();
			if (!client) return res.status(500).json({ message: 'PayPal not configured' });
			const request = new paypal.orders.OrdersCaptureRequest(payment.transactionId);
			request.requestBody({});
			try {
				const capture = await client.execute(request);
				if (capture.result.status === 'COMPLETED') {
					payment.status = 'completed';
					isSuccess = true;
				} else {
					payment.status = 'failed';
				}
			} catch (paypalError) {
				console.error('PayPal capture error:', paypalError);
				return res.status(400).json({ success: false, message: 'Failed to capture PayPal payment. It may have already been processed or expired.' });
			}
		}

		await payment.save();

		if (isSuccess) {
			const reservation = await Reservation.findByIdAndUpdate(payment.reservationId, { status: 'completed' }, { new: true });

			// Send booking confirmation email with QR code (fire and forget)
			try {
				const [user, event] = await Promise.all([
					User.findById(payment.userId).select('name email').lean(),
					Event.findById(payment.eventId).select('title').lean(),
				]);

				if (user && event && reservation) {
					await sendBookingConfirmation({
						to: user.email,
						name: user.name,
						eventTitle: event.title,
						quantity: reservation.ticketQuantity,
						reservationId: reservation._id.toString(),
						eventId: event._id.toString(),
						userId: user._id.toString(),
					});
				}
			} catch (emailError) {
				console.error(`Failed to send booking confirmation for payment ${payment._id}:`, emailError);
			}
		}

		return res.json({ success: true, message: `Payment status updated to ${payment.status}`, data: payment });
	} catch (err) {
		return next(err);
	}
};

exports.updatePaymentStatusByAdmin = async (req, res, next) => {
	try {
		const { paymentId } = req.params;
		const { status } = req.body;

		const payment = await Payment.findById(paymentId);
		if (!payment) return res.status(404).json({ message: 'Payment not found' });

		payment.status = status;
		await payment.save();

		if (status === 'completed') {
			await Reservation.findByIdAndUpdate(payment.reservationId, { status: 'completed' });
		}

		return res.json(payment);
	} catch (err) {
		return next(err);
	}
};

exports.getMyPayments = async (req, res, next) => {
	try {
		const payments = await Payment.find({ userId: req.user.id }).sort({ createdAt: -1 });
		return res.json(payments);
	} catch (err) {
		return next(err);
	}
};
