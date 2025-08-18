const Stripe = require('stripe');
const paypal = require('@paypal/checkout-server-sdk');
const { validationResult } = require('express-validator');
const Payment = require('../models/Payment');
const Reservation = require('../models/Reservation');

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

function buildPayPalClient() {
	if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) return null;
	const env = new paypal.core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET);
	return new paypal.core.PayPalHttpClient(env);
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
			payment = await Payment.create({ userId: req.user.id, eventId: reservation.eventId, amount: reservation.totalPrice, method: 'stripe', transactionId: intent.id, status: 'pending' });
			return res.json({ clientSecret: intent.client_secret, paymentId: payment._id });
		}

		if (method === 'paypal') {
			const client = buildPayPalClient();
			if (!client) return res.status(500).json({ message: 'PayPal not configured' });
			const order = {
				intent: 'CAPTURE',
				purchase_units: [{ amount: { currency_code: 'USD', value: reservation.totalPrice.toFixed(2) } }],
			};
			const request = new paypal.orders.OrdersCreateRequest();
			request.requestBody(order);
			const response = await client.execute(request);
			payment = await Payment.create({ userId: req.user.id, eventId: reservation.eventId, amount: reservation.totalPrice, method: 'paypal', transactionId: response.result.id, status: 'pending' });
			return res.json({ orderId: response.result.id, paymentId: payment._id });
		}

		// local method (cash or offline)
		payment = await Payment.create({ userId: req.user.id, eventId: reservation.eventId, amount: reservation.totalPrice, method: 'local', status: 'pending' });
		return res.json({ paymentId: payment._id });
	} catch (err) {
		return next(err);
	}
};

exports.verify = async (req, res, next) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
		const { paymentId, status, transactionId } = req.body;
		const payment = await Payment.findById(paymentId);
		if (!payment || payment.userId.toString() !== req.user.id) return res.status(404).json({ message: 'Payment not found' });
		payment.status = status || 'completed';
		if (transactionId) payment.transactionId = transactionId;
		await payment.save();

		await Reservation.updateMany({ userId: req.user.id, eventId: payment.eventId, status: 'reserved', paymentId: { $exists: false } }, { $set: { paymentId: payment._id } });
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


