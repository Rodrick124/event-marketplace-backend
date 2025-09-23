const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Event = require('../models/Event');
const Reservation = require('../models/Reservation');
const User = require('../models/User');
const { sendBookingConfirmation } = require('../services/email.service');

exports.createReservation = async (req, res, next) => {
	const isReplicaSet = mongoose.connection.client.topology && mongoose.connection.client.topology.s.options.replicaSet;
	const session = isReplicaSet ? await mongoose.startSession() : null;

	try {
		if (session) session.startTransaction();

		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		const { eventId, ticketQuantity } = req.body;

		const event = await Event.findOneAndUpdate(
			{ _id: eventId, status: 'approved', availableSeats: { $gte: ticketQuantity } },
			{ $inc: { availableSeats: -ticketQuantity } },
			{ new: true, session }
		);

		if (!event) {
			if (session) await session.abortTransaction();
			return res.status(400).json({ message: 'Event not available or insufficient seats' });
		}

		const totalPrice = Number(event.price) * Number(ticketQuantity);
		const [reservation] = await Reservation.create([{ eventId, userId: req.user.id, ticketQuantity, totalPrice }], { session });

		if (session) await session.commitTransaction();

		try {
			const user = await User.findById(req.user.id).select('name email').lean();
			if (user) {
				await sendBookingConfirmation({
					to: user.email,
					name: user.name || 'Attendee',
					eventTitle: event.title,
					quantity: ticketQuantity,
					reservationId: reservation._id.toString(),
					eventId: event._id.toString(),
					userId: req.user.id,
				});
			}
		} catch (emailError) {
			console.error(`Failed to send booking confirmation for reservation ${reservation._id}:`, emailError);
		}

		return res.status(201).json(reservation);
	} catch (err) {
		if (session) await session.abortTransaction();
		return next(err);
	} finally {
		if (session) session.endSession();
	}
};

exports.getMyReservations = async (req, res, next) => {
	try {
		const reservations = await Reservation.find({ userId: req.user.id })
			.populate('eventId', 'title date')
			.sort({ createdAt: -1 });
		return res.json(reservations);
	} catch (err) {
		return next(err);
	}
};

exports.cancelReservation = async (req, res, next) => {
	const isReplicaSet = mongoose.connection.client.topology && mongoose.connection.client.topology.s.options.replicaSet;
	const session = isReplicaSet ? await mongoose.startSession() : null;
	try {
		if (session) session.startTransaction();

		const reservation = await Reservation.findOne({ _id: req.params.id, userId: req.user.id }).session(session);

		if (!reservation) {
			throw { status: 404, message: 'Reservation not found or you do not own it.' };
		}

		if (reservation.status === 'cancelled') {
			if (session) await session.commitTransaction();
			return res.json({ message: 'Reservation was already cancelled.', reservation });
		}

		// Atomically return the seats to the event's available count
		await Event.updateOne({ _id: reservation.eventId }, { $inc: { availableSeats: reservation.ticketQuantity } }, { session });

		reservation.status = 'cancelled';
		const updatedReservation = await reservation.save({ session });

		if (session) await session.commitTransaction();

		return res.json({ message: 'Reservation cancelled successfully', reservation: updatedReservation });
	} catch (err) {
		if (session) await session.abortTransaction();
		if (err.status) return res.status(err.status).json({ message: err.message });
		return next(err);
	} finally {
		if (session) session.endSession();
	}
};

exports.getReservationsForEvent = async (req, res, next) => {
	try {
		const { eventId } = req.params;
		if (req.user.role === 'organizer') {
			const ownsEvent = await Event.exists({ _id: eventId, organizerId: req.user.id });
			if (!ownsEvent) return res.status(403).json({ message: 'Forbidden' });
		}
		const reservations = await Reservation.find({ eventId }).sort({ createdAt: -1 });
		return res.json(reservations);
	} catch (err) {
		return next(err);
	}
};
