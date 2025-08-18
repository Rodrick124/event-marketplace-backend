const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Event = require('../models/Event');
const Reservation = require('../models/Reservation');
const { sendBookingConfirmation } = require('../services/email.service');

exports.createReservation = async (req, res, next) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
		const { eventId, ticketQuantity } = req.body;
		const event = await Event.findOneAndUpdate(
			{ _id: eventId, status: 'approved', availableSeats: { $gte: ticketQuantity } },
			{ $inc: { availableSeats: -ticketQuantity } },
			{ new: true }
		);
		if (!event) return res.status(400).json({ message: 'Event not available or insufficient seats' });
		const totalPrice = Number(event.price) * Number(ticketQuantity);
		const reservation = await Reservation.create({ eventId, userId: req.user.id, ticketQuantity, totalPrice });
		try {
			const authUser = req.authUser || {};
			await sendBookingConfirmation({
				to: authUser.email,
				name: authUser.name || 'Attendee',
				eventTitle: event.title,
				quantity: ticketQuantity,
				reservationId: reservation._id.toString(),
				eventId: event._id.toString(),
				userId: req.user.id,
			});
		} catch (_) {}
		return res.status(201).json(reservation);
	} catch (err) {
		return next(err);
	}
};

exports.getMyReservations = async (req, res, next) => {
	try {
		const reservations = await Reservation.find({ userId: req.user.id }).sort({ createdAt: -1 });
		return res.json(reservations);
	} catch (err) {
		return next(err);
	}
};

exports.cancelReservation = async (req, res, next) => {
	try {
		const reservation = await Reservation.findOne({ _id: req.params.id, userId: req.user.id });
		if (!reservation) return res.status(404).json({ message: 'Reservation not found' });
		if (reservation.status === 'cancelled') return res.status(200).json(reservation);
		const event = await Event.findOneAndUpdate(
			{ _id: reservation.eventId },
			{ $inc: { availableSeats: reservation.ticketQuantity } },
			{ new: true }
		);
		reservation.status = 'cancelled';
		await reservation.save();
		return res.json(reservation);
	} catch (err) {
		return next(err);
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


