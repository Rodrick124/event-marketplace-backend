const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Event = require('../models/Event');
const Reservation = require('../models/Reservation');
const Payment = require('../models/Payment');

exports.createEvent = async (req, res, next) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
		}
		const payload = { ...req.body, organizerId: req.user.id, availableSeats: req.body.totalSeats };
		const event = await Event.create(payload);
		return res.status(201).json({ success: true, data: event });
	} catch (err) {
		if (err.name === 'ValidationError') {
			return res.status(400).json({ success: false, message: err.message, errors: err.errors });
		}
		return next(err);
	}
};

exports.listApprovedEvents = async (req, res, next) => {
	try {
		const { page = 1, limit = 20 } = req.query;

		// Caching: Use latest update timestamp for ETag
		const latestEvent = await Event.findOne({ status: 'approved' }).sort({ updatedAt: -1 }).select('updatedAt').lean();
		if (latestEvent) {
			// ETag includes pagination to differentiate cached pages
			const etag = `W/"${latestEvent.updatedAt.getTime()}-${page}-${limit}"`;
			res.set('ETag', etag);
			res.set('Cache-Control', 'public, max-age=60'); // Cache for 60 seconds

			if (req.get('if-none-match') === etag) {
				return res.status(304).end();
			}
		}

		const events = await Event.find({ status: 'approved' }).sort({ date: 1 }).skip((Number(page) - 1) * Number(limit)).limit(Number(limit));
		return res.json(events);
	} catch (err) {
		return next(err);
	}
};

exports.getEventById = async (req, res, next) => {
	try {
		const event = await Event.findById(req.params.id);
		if (!event) return res.status(404).json({ message: 'Event not found' });

		// Caching: Use updatedAt for ETag
		const etag = `W/"${event.updatedAt.getTime()}"`;
		res.set('ETag', etag);
		res.set('Cache-Control', 'public, max-age=60'); // Cache for 60 seconds

		if (req.get('if-none-match') === etag) {
			return res.status(304).end();
		}

		return res.json(event);
	} catch (err) {
		return next(err);
	}
};

exports.updateEvent = async (req, res, next) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
		}

		const updates = { ...req.body };
		// Status must be updated via the dedicated /status endpoint to handle side-effects (e.g., cancelling reservations).
		delete updates.status;

		// Organizers can only update their own events
		const query = { _id: req.params.id };
		if (req.user.role === 'organizer') {
			query.organizerId = req.user.id;
		}

		const event = await Event.findOneAndUpdate(query, { $set: updates }, { new: true, runValidators: true });

		if (!event) {
			return res.status(404).json({ success: false, message: 'Event not found or you are not authorized to edit it.' });
		}

		return res.json({ success: true, data: event });
	} catch (err) {
		if (err.name === 'ValidationError') {
			return res.status(400).json({ success: false, message: err.message, errors: err.errors });
		}
		return next(err);
	}
};

exports.deleteEvent = async (req, res, next) => {
	const isReplicaSet = mongoose.connection.client.topology && mongoose.connection.client.topology.s.options.replicaSet;
	const session = isReplicaSet ? await mongoose.startSession() : null;
	try {
		if (session) session.startTransaction();
		const { id } = req.params;

		const query = { _id: id };
		if (req.user.role === 'organizer') {
			query.organizerId = req.user.id;
		}

		const event = await Event.findOne(query).session(session);
		if (!event) {
			throw { status: 404, message: 'Event not found or you are not authorized to delete it.' };
		}

		const reservationCount = await Reservation.countDocuments({ eventId: id }).session(session);
		if (reservationCount > 0) {
			throw { status: 400, message: 'Cannot delete an event that has reservations. Please cancel the event instead.' };
		}

		await Payment.deleteMany({ eventId: id }, { session });
		await event.deleteOne({ session });

		if (session) await session.commitTransaction();

		return res.status(204).send();
	} catch (err) {
		if (session) await session.abortTransaction();
		if (err.status) {
			return res.status(err.status).json({ message: err.message });
		}
		return next(err);
	} finally {
		if (session) session.endSession();
	}
};

exports.updateEventStatus = async (req, res, next) => {
	const isReplicaSet = mongoose.connection.client.topology && mongoose.connection.client.topology.s.options.replicaSet;
	const session = isReplicaSet ? await mongoose.startSession() : null;
	try {
		if (session) session.startTransaction();
		const { status } = req.body;
		const { id } = req.params;

		const event = await Event.findByIdAndUpdate(id, { status }, { new: true, session });
		if (!event) {
			throw { status: 404, message: 'Event not found' };
		}

		// If event is rejected (cancelled), cancel all active reservations for it.
		if (status === 'rejected') {
			await Reservation.updateMany({ eventId: id, status: 'reserved' }, { $set: { status: 'cancelled' } }, { session });
		}

		if (session) await session.commitTransaction();

		return res.json({ success: true, data: event });
	} catch (err) {
		if (session) await session.abortTransaction();
		if (err.status) {
			return res.status(err.status).json({ success: false, message: err.message });
		}
		return next(err);
	} finally {
		if (session) session.endSession();
	}
};

exports.searchEvents = async (req, res, next) => {
	try {
		const { query, category, date, location } = req.query;
		const filter = { status: 'approved' };
		if (query) filter.$or = [
			{ title: { $regex: query, $options: 'i' } },
			{ description: { $regex: query, $options: 'i' } },
		];
		if (category) filter.category = category;
		if (date) filter.date = { $gte: new Date(date) };
		if (location) filter['location.city'] = { $regex: location, $options: 'i' };
		const events = await Event.find(filter).sort({ date: 1 }).limit(100);
		return res.json(events);
	} catch (err) {
		return next(err);
	}
};
