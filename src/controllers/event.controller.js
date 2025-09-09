const { validationResult } = require('express-validator');
const Event = require('../models/Event');

exports.createEvent = async (req, res, next) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
		const payload = { ...req.body, organizerId: req.user.id, availableSeats: req.body.totalSeats };
		const event = await Event.create(payload);
		return res.status(201).json(event);
	} catch (err) {
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
		const updates = { ...req.body };
		if (req.user.role !== 'admin') delete updates.status;
		const event = await Event.findOneAndUpdate(
			{ _id: req.params.id, ...(req.user.role === 'organizer' ? { organizerId: req.user.id } : {}) },
			updates,
			{ new: true }
		);
		if (!event) return res.status(404).json({ message: 'Event not found or unauthorized' });
		return res.json(event);
	} catch (err) {
		return next(err);
	}
};

exports.deleteEvent = async (req, res, next) => {
	try {
		const event = await Event.findOneAndDelete({ _id: req.params.id, ...(req.user.role === 'organizer' ? { organizerId: req.user.id } : {}) });
		if (!event) return res.status(404).json({ message: 'Event not found or unauthorized' });
		return res.status(204).send();
	} catch (err) {
		return next(err);
	}
};

exports.updateEventStatus = async (req, res, next) => {
	try {
		const { status } = req.body;
		const event = await Event.findByIdAndUpdate(req.params.id, { status }, { new: true });
		if (!event) return res.status(404).json({ message: 'Event not found' });
		return res.json(event);
	} catch (err) {
		return next(err);
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
