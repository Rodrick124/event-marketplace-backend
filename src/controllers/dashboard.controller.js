const User = require('../models/User');
const Event = require('../models/Event');
const Reservation = require('../models/Reservation');
const Payment = require('../models/Payment');

exports.adminStats = async (req, res, next) => {
	try {
		const [totalUsers, totalEvents, totalRevenueAgg, totalBookings] = await Promise.all([
			User.countDocuments(),
			Event.countDocuments(),
			Payment.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, sum: { $sum: '$amount' } } }]),
			Reservation.countDocuments(),
		]);
		const totalRevenue = totalRevenueAgg[0]?.sum || 0;
		return res.json({ totalUsers, totalEvents, revenue: totalRevenue, bookings: totalBookings });
	} catch (err) {
		return next(err);
	}
};

exports.organizerStats = async (req, res, next) => {
	try {
		const organizerId = req.user.id;
		const [events, payments] = await Promise.all([
			Event.find({ organizerId }),
			Payment.aggregate([
				{ $lookup: { from: 'events', localField: 'eventId', foreignField: '_id', as: 'event' } },
				{ $unwind: '$event' },
				{ $match: { status: 'completed', 'event.organizerId': require('mongoose').Types.ObjectId.createFromHexString(organizerId) } },
				{ $group: { _id: '$eventId', revenue: { $sum: '$amount' }, count: { $sum: 1 } } },
			]),
		]);
		const revenue = payments.reduce((acc, p) => acc + p.revenue, 0);
		const ticketsSold = payments.reduce((acc, p) => acc + p.count, 0);
		return res.json({ events: events.length, revenue, ticketsSold, performance: payments });
	} catch (err) {
		return next(err);
	}
};

exports.attendeeStats = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const now = new Date();
		const [upcoming, past, payments] = await Promise.all([
			Reservation.find({ userId }).populate({ path: 'eventId', match: { date: { $gte: now } } }),
			Reservation.find({ userId }).populate({ path: 'eventId', match: { date: { $lt: now } } }),
			Payment.find({ userId, status: 'completed' }),
		]);
		const spending = payments.reduce((acc, p) => acc + p.amount, 0);
		return res.json({ upcoming, past, spending });
	} catch (err) {
		return next(err);
	}
};


