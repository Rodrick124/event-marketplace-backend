const { validationResult } = require('express-validator');
const User = require('../models/User');
const Event = require('../models/Event');
const Reservation = require('../models/Reservation');
const Payment = require('../models/Payment');
const mongoose = require('mongoose');
const ActivityLog = require('../models/ActivityLog');

exports.adminStats = async (req, res, next) => {
	try {
		const now = new Date();
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

		const [
			totalUsers,
			totalEvents,
			totalReservations,
			activeEvents,
			pendingReservations,
			newUsersThisMonth,
			revenueData,
			monthlyRevenueData,
			topCategories,
			recentUsers,
			recentReservations,
		] = await Promise.all([
			User.countDocuments(),
			Event.countDocuments(),
			Reservation.countDocuments(),
			Event.countDocuments({ status: 'approved' }),
			Reservation.countDocuments({ status: 'pending' }),
			User.countDocuments({ createdAt: { $gte: startOfMonth } }),
			Payment.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
			Payment.aggregate([
				{ $match: { status: 'completed', createdAt: { $gte: startOfMonth } } },
				{ $group: { _id: null, total: { $sum: '$amount' } } },
			]),
			Event.aggregate([
				{ $group: { _id: '$category', eventCount: { $sum: 1 }, eventIds: { $push: '$_id' } } },
				{
					$lookup: {
						from: 'payments',
						let: { event_ids: '$eventIds' },
						pipeline: [
							{ $match: { $expr: { $and: [{ $in: ['$eventId', '$$event_ids'] }, { $eq: ['$status', 'completed'] }] } } },
							{ $group: { _id: null, totalRevenue: { $sum: '$amount' } } },
						],
						as: 'revenueInfo',
					},
				},
				{
					$lookup: {
						from: 'reservations',
						let: { event_ids: '$eventIds' },
						pipeline: [{ $match: { $expr: { $in: ['$eventId', '$$event_ids'] } } }, { $count: 'count' }],
						as: 'reservationInfo',
					},
				},
				{
					$project: {
						_id: 0,
						category: '$_id',
						eventCount: '$eventCount',
						revenue: { $ifNull: [{ $arrayElemAt: ['$revenueInfo.totalRevenue', 0] }, 0] },
						reservationCount: { $ifNull: [{ $arrayElemAt: ['$reservationInfo.count', 0] }, 0] },
					},
				},
				{ $sort: { revenue: -1 } },
				{ $limit: 5 },
			]),
			User.find().sort({ createdAt: -1 }).limit(10),
			Reservation.find().populate('userId', 'name').populate('eventId', 'title').sort({ createdAt: -1 }).limit(10),
		]);

		const totalRevenue = revenueData[0]?.total || 0;
		const revenueThisMonth = monthlyRevenueData[0]?.total || 0;

		const userActivities = recentUsers.map((user) => ({ _id: user._id, type: 'user_registration', description: `New user registered: ${user.name}`, userId: user._id, timestamp: user.createdAt, metadata: { email: user.email } }));
		const reservationActivities = recentReservations.map((r) => ({ _id: r._id, type: 'new_reservation', description: `${r.userId?.name || 'A user'} reserved ${r.ticketQuantity} ticket(s) for ${r.eventId?.title || 'an event'}`, userId: r.userId?._id, timestamp: r.createdAt, metadata: { eventId: r.eventId?._id, ticketQuantity: r.ticketQuantity } }));
		const recentActivity = [...userActivities, ...reservationActivities]
			.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
			.slice(0, 10);

		return res.json({
			success: true,
			data: {
				totalUsers,
				totalEvents,
				totalReservations,
				totalRevenue,
				activeEvents,
				pendingReservations,
				newUsersThisMonth,
				revenueThisMonth,
				topCategories,
				recentActivity,
			},
		});
	} catch (err) {
		return next(err);
	}
};

exports.getActivityLogs = async (req, res, next) => {
	try {
		const { page = 1, limit = 20, search, sortBy = 'timestamp', sortOrder = 'desc', type, dateFrom, dateTo } = req.query;

		const pageNum = parseInt(page, 10);
		const limitNum = parseInt(limit, 10);
		const skip = (pageNum - 1) * limitNum;

		const matchStage = {};
		if (search) {
			matchStage.description = { $regex: search, $options: 'i' };
		}
		if (type) {
			matchStage.type = type;
		}
		if (dateFrom || dateTo) {
			matchStage.timestamp = {};
			if (dateFrom) {
				matchStage.timestamp.$gte = new Date(dateFrom);
			}
			if (dateTo) {
				matchStage.timestamp.$lte = new Date(dateTo);
			}
		}

		// Caching: Use count and latest timestamp to generate ETag
		const [total, latestLog] = await Promise.all([ActivityLog.countDocuments(matchStage), ActivityLog.findOne(matchStage).sort({ timestamp: -1 }).select('timestamp').lean()]);

		if (latestLog) {
			const etag = `W/"${total}-${latestLog.timestamp.getTime()}"`;
			res.set('ETag', etag);
			res.set('Cache-Control', 'private, max-age=30'); // Cache for 30s for authenticated users
			if (req.get('if-none-match') === etag) {
				return res.status(304).end();
			}
		}

		const sortStage = {};
		sortStage[sortBy] = sortOrder === 'asc' ? 1 : -1;

		const data = await ActivityLog.find(matchStage).populate('userId', 'name email').sort(sortStage).skip(skip).limit(limitNum).lean();

		const pages = Math.ceil(total / limitNum);

		return res.json({
			success: true,
			data,
			pagination: {
				page: pageNum,
				limit: limitNum,
				total,
				pages,
			},
		});
	} catch (err) {
		return next(err);
	}
};

exports.organizerStats = async (req, res, next) => {
	try {
		const organizerId = req.user.id;

		// Find all events for this organizer first to avoid multiple lookups
		const organizerEvents = await Event.find({ organizerId }).select('_id').lean();
		const organizerEventIds = organizerEvents.map((e) => e._id);

		const [upcomingEventsCount, totalReservations, performanceStats, recentReservations] = await Promise.all([
			Event.countDocuments({ _id: { $in: organizerEventIds }, date: { $gte: new Date() } }),
			Reservation.countDocuments({ eventId: { $in: organizerEventIds } }),
			Payment.aggregate([
				{ $match: { eventId: { $in: organizerEventIds }, status: 'completed' } },
				{
					$lookup: {
						from: 'events',
						localField: 'eventId',
						foreignField: '_id',
						as: 'eventInfo',
					},
				},
				{ $unwind: '$eventInfo' },
				{
					$group: {
						_id: '$eventId',
						title: { $first: '$eventInfo.title' },
						revenue: { $sum: '$amount' },
						paidReservations: { $sum: 1 },
					},
				},
				{ $sort: { revenue: -1 } },
				{
					$project: {
						_id: 0,
						eventId: '$_id',
						title: 1,
						revenue: 1,
						paidReservations: 1,
					},
				},
			]),
			Reservation.find({ eventId: { $in: organizerEventIds } }).sort({ createdAt: -1 }).limit(5).populate('userId', 'name').populate('eventId', 'title'),
		]);

		const totalRevenue = performanceStats.reduce((acc, p) => acc + p.revenue, 0);
		const totalPaidReservations = performanceStats.reduce((acc, p) => acc + p.paidReservations, 0);

		return res.json({
			success: true,
			data: {
				totalEvents: organizerEvents.length,
				upcomingEvents: upcomingEventsCount,
				totalReservations,
				totalRevenue,
				totalPaidReservations,
				topPerformingEvents: performanceStats.slice(0, 5),
				recentActivity: recentReservations.map((r) => ({
					type: 'new_reservation',
					description: `${r.userId?.name || 'A user'} made a reservation for "${r.eventId?.title}"`,
					timestamp: r.createdAt,
					metadata: { reservationId: r._id, userId: r.userId?._id, eventId: r.eventId?._id, ticketQuantity: r.ticketQuantity },
				})),
			},
		});
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

exports.getUsersForAdminDashboard = async (req, res, next) => {
	try {
		const { page = 1, limit = 10, search, status, sortBy = 'registrationDate', sortOrder = 'desc' } = req.query;

		const pageNum = parseInt(page, 10);
		const limitNum = parseInt(limit, 10);
		const skip = (pageNum - 1) * limitNum;

		// Build Match Stage
		const matchStage = {};
		if (search) {
			matchStage.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
		}
		if (status) {
			if (status === 'banned') {
				matchStage.status = 'suspended';
			} else if (status === 'active') {
				matchStage.status = 'active';
			}
			// 'inactive' is not a valid status in the model, so we ignore it.
		}

		// Build Sort Stage
		const sortStage = {};
		const sortField = sortBy === 'registrationDate' ? 'createdAt' : sortBy;
		sortStage[sortField] = sortOrder === 'asc' ? 1 : -1;

		const aggregation = [
			{ $match: matchStage },
			{
				$lookup: {
					from: 'reservations',
					localField: '_id',
					foreignField: 'userId',
					as: 'reservations',
				},
			},
			{
				$lookup: {
					from: 'payments',
					localField: '_id',
					foreignField: 'userId',
					pipeline: [{ $match: { status: 'completed' } }],
					as: 'completedPayments',
				},
			},
			{
				$addFields: {
					totalReservations: { $size: '$reservations' },
					totalSpent: { $sum: '$completedPayments.amount' },
				},
			},
			{ $sort: sortStage },
			{
				$facet: {
					data: [
						{ $skip: skip },
						{ $limit: limitNum },
						{
							$addFields: {
								initials: {
									$reduce: {
										input: { $split: [{ $ifNull: ['$name', ''] }, ' '] },
										initialValue: '',
										in: { $concat: ['$$value', { $substrCP: ['$$this', 0, 1] }] },
									},
								},
								isActive: { $eq: ['$status', 'active'] },
								isBanned: { $eq: ['$status', 'suspended'] },
							},
						},
						{
							$project: {
								_id: 1,
								name: 1,
								email: 1,
								role: 1,
								initials: 1,
								phone: '$profile.phone',
								bio: '$profile.bio',
								registrationDate: '$createdAt',
								isActive: 1,
								isBanned: 1,
								totalReservations: 1,
								totalSpent: 1,
								organization: '$profile.organization',
							},
						},
					],
					pagination: [{ $count: 'total' }],
				},
			},
		];

		const [results] = await User.aggregate(aggregation);

		const data = results?.data || [];
		const total = results?.pagination[0]?.total || 0;
		const pages = Math.ceil(total / limitNum);

		return res.json({
			success: true,
			data,
			pagination: { page: pageNum, limit: limitNum, total, pages },
		});
	} catch (err) {
		return next(err);
	}
};

exports.getEventsForAdminDashboard = async (req, res, next) => {
	try {
		const { page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'desc', status, category, approvalStatus } = req.query;

		const pageNum = parseInt(page, 10);
		const limitNum = parseInt(limit, 10);
		const skip = (pageNum - 1) * limitNum;

		// Build initial match stage for fields on the Event model
		const initialMatch = {};
		if (search) {
			initialMatch.$or = [{ title: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }];
		}
		if (category) {
			initialMatch.category = category;
		}
		if (approvalStatus) {
			initialMatch.status = approvalStatus;
		}

		// Build post-derivation match stage
		const postMatch = {};
		if (status) {
			postMatch.derivedStatus = status;
		}

		// Build Sort Stage
		const sortStage = {};
		sortStage[sortBy] = sortOrder === 'asc' ? 1 : -1;

		const aggregation = [
			// Stage 1: Initial filter on Event fields
			{ $match: initialMatch },
			// Stage 2: Add derived status field
			{
				$addFields: {
					derivedStatus: {
						$switch: {
							branches: [
								{ case: { $lt: ['$date', new Date()] }, then: 'completed' },
								{ case: { $eq: ['$status', 'pending'] }, then: 'draft' },
								{ case: { $eq: ['$status', 'rejected'] }, then: 'cancelled' },
								{ case: { $eq: ['$status', 'approved'] }, then: 'published' },
							],
							default: 'draft',
						},
					},
				},
			},
			// Stage 3: Filter on derived status
			{ $match: postMatch },
			// Stage 4: Lookups for related data
			{
				$lookup: {
					from: 'users',
					localField: 'organizerId',
					foreignField: '_id',
					as: 'organizerInfo',
				},
			},
			{ $unwind: { path: '$organizerInfo', preserveNullAndEmptyArrays: true } },
			{
				$lookup: {
					from: 'reservations',
					localField: '_id',
					foreignField: 'eventId',
					pipeline: [{ $match: { status: 'reserved' } }],
					as: 'reservations',
				},
			},
			{
				$lookup: {
					from: 'payments',
					localField: '_id',
					foreignField: 'eventId',
					pipeline: [{ $match: { status: 'completed' } }],
					as: 'completedPayments',
				},
			},
			// Stage 5: Add calculated fields
			{
				$addFields: {
					totalReservations: { $size: '$reservations' },
					totalRevenue: { $sum: '$completedPayments.amount' },
				},
			},
			// Stage 6: Sort
			{ $sort: sortStage },
			// Stage 7: Facet for pagination and final projection
			{
				$facet: {
					data: [
						{ $skip: skip },
						{ $limit: limitNum },
						{
							$project: {
								_id: 1,
								title: 1,
								description: 1,
								date: 1,
								time: 1,
								location: '$location.city',
								capacity: '$totalSeats',
								price: 1,
								category: 1,
								image: '$imageUrl',
								availableSeats: 1,
								organizer: { _id: '$organizerInfo._id', name: '$organizerInfo.name', email: '$organizerInfo.email' },
								totalReservations: 1,
								totalRevenue: 1,
								status: '$derivedStatus',
								createdAt: 1,
								updatedAt: 1,
								isApproved: { $eq: ['$status', 'approved'] },
								approvalStatus: '$status',
							},
						},
					],
					pagination: [{ $count: 'total' }],
				},
			},
		];

		const [results] = await Event.aggregate(aggregation);

		const data = results?.data || [];
		const total = results?.pagination[0]?.total || 0;
		const pages = Math.ceil(total / limitNum);

		return res.json({
			success: true,
			data,
			pagination: { page: pageNum, limit: limitNum, total, pages },
		});
	} catch (err) {
		return next(err);
	}
};

exports.getReservationsForAdminDashboard = async (req, res, next) => {
	try {
		const { page = 1, limit = 10, search, sortBy = 'reservationDate', sortOrder = 'desc', status, paymentStatus } = req.query;

		const pageNum = parseInt(page, 10);
		const limitNum = parseInt(limit, 10);
		const skip = (pageNum - 1) * limitNum;

		// Build initial match stage for fields on the Reservation model
		const initialMatch = {};
		if (status) {
			initialMatch.status = status;
		}

		// Build Sort Stage
		const sortStage = {};
		let sortField = sortBy;
		if (sortBy === 'reservationDate') sortField = 'createdAt';
		if (sortBy === 'totalAmount') sortField = 'totalPrice'; // Assumes 'totalPrice' is on the Reservation model
		sortStage[sortField] = sortOrder === 'asc' ? 1 : -1;

		const aggregation = [
			// Stage 1: Initial filter on Reservation fields
			{ $match: initialMatch },
			// Stage 2: Lookups for related data
			{
				$lookup: {
					from: 'users',
					localField: 'userId',
					foreignField: '_id',
					as: 'user',
				},
			},
			{ $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
			{
				$lookup: {
					from: 'events',
					localField: 'eventId',
					foreignField: '_id',
					as: 'event',
				},
			},
			{ $unwind: { path: '$event', preserveNullAndEmptyArrays: true } },
			{
				$lookup: {
					from: 'payments',
					localField: '_id',
					foreignField: 'reservationId',
					as: 'payment',
				},
			},
			{ $unwind: { path: '$payment', preserveNullAndEmptyArrays: true } },
			// Stage 3: Add derived fields for filtering
			{
				$addFields: {
					derivedPaymentStatus: { $ifNull: ['$payment.status', 'unpaid'] },
				},
			},
		];

		// Stage 4: Dynamic filtering based on lookups
		const postLookupMatch = {};
		if (paymentStatus) {
			postLookupMatch.derivedPaymentStatus = paymentStatus;
		}
		if (search) {
			postLookupMatch.$or = [
				{ 'user.name': { $regex: search, $options: 'i' } },
				{ 'user.email': { $regex: search, $options: 'i' } },
				{ 'event.title': { $regex: search, $options: 'i' } },
			];
		}
		if (Object.keys(postLookupMatch).length > 0) {
			aggregation.push({ $match: postLookupMatch });
		}

		// Stage 5: Sort
		aggregation.push({ $sort: sortStage });

		// Stage 6: Facet for pagination and final projection
		aggregation.push({
			$facet: {
				data: [
					{ $skip: skip },
					{ $limit: limitNum },
					{
						$project: {
							_id: 1,
							userId: '$user._id',
							eventId: '$event._id',
							event: {
								_id: '$event._id',
								title: '$event.title',
								date: '$event.date',
								time: '$event.time',
								location: '$event.location.city',
							},
							user: {
								_id: '$user._id',
								name: '$user.name',
								email: '$user.email',
							},
							ticketQuantity: 1,
							totalAmount: '$totalPrice',
							status: 1,
							paymentStatus: '$derivedPaymentStatus',
							reservationDate: '$createdAt',
							paymentMethod: '$payment.method',
							transactionId: '$payment.transactionId',
							createdAt: 1,
							updatedAt: 1,
						},
					},
				],
				pagination: [{ $count: 'total' }],
			},
		});

		const [results] = await Reservation.aggregate(aggregation);

		const data = results?.data || [];
		const total = results?.pagination[0]?.total || 0;
		const pages = Math.ceil(total / limitNum);

		return res.json({
			success: true,
			data,
			pagination: { page: pageNum, limit: limitNum, total, pages },
		});
	} catch (err) {
		return next(err);
	}
};

exports.getEventsForOrganizerDashboard = async (req, res, next) => {
	try {
		const { page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'desc', status, approvalStatus } = req.query;
		const organizerId = new mongoose.Types.ObjectId(req.user.id);

		const pageNum = parseInt(page, 10);
		const limitNum = parseInt(limit, 10);
		const skip = (pageNum - 1) * limitNum;

		// Build initial match stage for fields on the Event model
		const initialMatch = { organizerId };
		if (search) {
			initialMatch.title = { $regex: search, $options: 'i' };
		}
		if (approvalStatus) {
			initialMatch.status = approvalStatus;
		}

		// Build post-derivation match stage
		const postMatch = {};
		if (status) {
			postMatch.derivedStatus = status;
		}

		// Build Sort Stage
		const sortStage = {};
		sortStage[sortBy] = sortOrder === 'asc' ? 1 : -1;

		const aggregation = [
			{ $match: initialMatch },
			{
				$addFields: {
					derivedStatus: {
						$switch: {
							branches: [
								{ case: { $lt: ['$date', new Date()] }, then: 'completed' },
								{ case: { $eq: ['$status', 'pending'] }, then: 'draft' },
								{ case: { $eq: ['$status', 'rejected'] }, then: 'cancelled' },
								{ case: { $eq: ['$status', 'approved'] }, then: 'published' },
							],
							default: 'draft',
						},
					},
				},
			},
			{ $match: postMatch },
			{
				$lookup: {
					from: 'reservations',
					localField: '_id',
					foreignField: 'eventId',
					pipeline: [{ $match: { status: 'reserved' } }],
					as: 'reservations',
				},
			},
			{
				$lookup: {
					from: 'payments',
					localField: '_id',
					foreignField: 'eventId',
					pipeline: [{ $match: { status: 'completed' } }],
					as: 'completedPayments',
				},
			},
			{
				$addFields: {
					totalReservations: { $size: '$reservations' },
					totalRevenue: { $sum: '$completedPayments.amount' },
				},
			},
			{ $sort: sortStage },
			{
				$facet: {
					data: [
						{ $skip: skip },
						{ $limit: limitNum },
						{
							$project: {
								_id: 1,
								title: 1,
								date: 1,
								price: 1,
								availableSeats: 1,
								totalReservations: 1,
								totalRevenue: 1,
								status: '$derivedStatus',
								approvalStatus: '$status',
								createdAt: 1,
							},
						},
					],
					pagination: [{ $count: 'total' }],
				},
			},
		];

		const [results] = await Event.aggregate(aggregation);

		const data = results?.data || [];
		const total = results?.pagination[0]?.total || 0;
		const pages = Math.ceil(total / limitNum);

		return res.json({
			success: true,
			data,
			pagination: { page: pageNum, limit: limitNum, total, pages },
		});
	} catch (err) {
		return next(err);
	}
};

exports.getReservationsForOrganizerDashboard = async (req, res, next) => {
	try {
		const { page = 1, limit = 10, search, sortBy = 'reservationDate', sortOrder = 'desc', status, paymentStatus, eventId } = req.query;
		const organizerId = new mongoose.Types.ObjectId(req.user.id);

		const pageNum = parseInt(page, 10);
		const limitNum = parseInt(limit, 10);
		const skip = (pageNum - 1) * limitNum;

		// Get all event IDs for this organizer
		const organizerEvents = await Event.find({ organizerId }).select('_id').lean();
		const organizerEventIds = organizerEvents.map((e) => e._id);

		// Build initial match stage for fields on the Reservation model
		const initialMatch = { eventId: { $in: organizerEventIds } };
		if (status) {
			initialMatch.status = status;
		}
		if (eventId) {
			initialMatch.eventId = new mongoose.Types.ObjectId(eventId);
		}

		// Build Sort Stage
		const sortStage = {};
		let sortField = sortBy;
		if (sortBy === 'reservationDate') sortField = 'createdAt';
		if (sortBy === 'totalAmount') sortField = 'totalPrice';
		sortStage[sortField] = sortOrder === 'asc' ? 1 : -1;

		const aggregation = [
			{ $match: initialMatch },
			{ $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
			{ $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
			{ $lookup: { from: 'events', localField: 'eventId', foreignField: '_id', as: 'event' } },
			{ $unwind: { path: '$event', preserveNullAndEmptyArrays: true } },
			{ $lookup: { from: 'payments', localField: '_id', foreignField: 'reservationId', as: 'payment' } },
			{ $unwind: { path: '$payment', preserveNullAndEmptyArrays: true } },
			{ $addFields: { derivedPaymentStatus: { $ifNull: ['$payment.status', 'unpaid'] } } },
		];

		const postLookupMatch = {};
		if (paymentStatus) {
			postLookupMatch.derivedPaymentStatus = paymentStatus;
		}
		if (search) {
			postLookupMatch.$or = [{ 'user.name': { $regex: search, $options: 'i' } }, { 'user.email': { $regex: search, $options: 'i' } }];
		}
		if (Object.keys(postLookupMatch).length > 0) {
			aggregation.push({ $match: postLookupMatch });
		}

		aggregation.push({ $sort: sortStage });

		aggregation.push({
			$facet: {
				data: [{ $skip: skip }, { $limit: limitNum }, { $project: { _id: 1, event: { _id: '$event._id', title: '$event.title' }, user: { _id: '$user._id', name: '$user.name', email: '$user.email' }, ticketQuantity: 1, totalAmount: '$totalPrice', status: 1, paymentStatus: '$derivedPaymentStatus', reservationDate: '$createdAt' } }],
				pagination: [{ $count: 'total' }],
			},
		});

		const [results] = await Reservation.aggregate(aggregation);

		const data = results?.data || [];
		const total = results?.pagination[0]?.total || 0;
		const pages = Math.ceil(total / limitNum);

		return res.json({
			success: true,
			data,
			pagination: { page: pageNum, limit: limitNum, total, pages },
		});
	} catch (err) {
		return next(err);
	}
};

exports.createEventForOrganizerDashboard = async (req, res, next) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
		}

		// The organizerId is taken from the authenticated user, not from the request body
		const organizerId = req.user.id;
		// Initialize availableSeats to be the same as totalSeats
		const eventData = { ...req.body, organizerId, availableSeats: req.body.totalSeats };

		const newEvent = await Event.create(eventData);

		return res.status(201).json({ success: true, data: newEvent });
	} catch (err) {
		if (err.name === 'ValidationError') {
			return res.status(400).json({ success: false, message: err.message, errors: err.errors });
		}
		return next(err);
	}
};

exports.updateEventForOrganizerDashboard = async (req, res, next) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
		}

		const { id } = req.params;
		const organizerId = new mongoose.Types.ObjectId(req.user.id);
		const updates = { ...req.body };

		// Organizers should not be able to change the approval status or owner
		delete updates.status;
		delete updates.organizerId;

		// If totalSeats is being updated, we need to handle availableSeats carefully
		if (updates.totalSeats !== undefined) {
			const event = await Event.findOne({ _id: id, organizerId });
			if (!event) {
				return res.status(404).json({ success: false, message: 'Event not found or you are not authorized to edit it.' });
			}
			const newTotalSeats = parseInt(updates.totalSeats, 10);
			if (isNaN(newTotalSeats)) {
				return res.status(400).json({ success: false, message: 'Invalid value for totalSeats.' });
			}
			const seatsSold = event.totalSeats - event.availableSeats;
			if (newTotalSeats < seatsSold) {
				return res.status(400).json({ success: false, message: `Cannot reduce total seats below the number already sold (${seatsSold}).` });
			}
			updates.availableSeats = newTotalSeats - seatsSold;
		}

		const updatedEvent = await Event.findOneAndUpdate({ _id: id, organizerId }, { $set: updates }, { new: true, runValidators: true });

		if (!updatedEvent) {
			return res.status(404).json({ success: false, message: 'Event not found or you are not authorized to edit it.' });
		}

		return res.json({ success: true, data: updatedEvent });
	} catch (err) {
		if (err.name === 'ValidationError') {
			return res.status(400).json({ success: false, message: err.message, errors: err.errors });
		}
		return next(err);
	}
};

exports.cancelEventForOrganizerDashboard = async (req, res, next) => {
	const isReplicaSet = mongoose.connection.client.topology && mongoose.connection.client.topology.s.options.replicaSet;
	const session = isReplicaSet ? await mongoose.startSession() : null;
	try {
		if (session) session.startTransaction();
		const { id } = req.params;
		const organizerId = new mongoose.Types.ObjectId(req.user.id);

		const event = await Event.findOne({ _id: id, organizerId }).session(session);

		if (!event) {
			throw { status: 404, message: 'Event not found or you are not authorized to cancel it.' };
		}

		// Idempotency: if already cancelled, just return success.
		if (event.status === 'rejected') {
			if (session) await session.commitTransaction();
			return res.json({ success: true, message: 'Event was already cancelled.', data: event });
		}

		event.status = 'rejected'; // 'rejected' signifies a cancelled event
		await event.save({ session });

		await Reservation.updateMany({ eventId: id, status: 'reserved' }, { $set: { status: 'cancelled' } }, { session });

		// Note: A full implementation would also handle refunds for any paid reservations.

		if (session) await session.commitTransaction();

		return res.json({ success: true, message: 'Event has been cancelled successfully. All active reservations have also been cancelled.', data: event });
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

exports.deleteEventForOrganizerDashboard = async (req, res, next) => {
	const isReplicaSet = mongoose.connection.client.topology && mongoose.connection.client.topology.s.options.replicaSet;
	const session = isReplicaSet ? await mongoose.startSession() : null;
	try {
		if (session) session.startTransaction();
		const { id } = req.params;
		const organizerId = new mongoose.Types.ObjectId(req.user.id);

		const event = await Event.findOne({ _id: id, organizerId }).session(session);

		if (!event) {
			throw { status: 404, message: 'Event not found or you are not authorized to delete it.' };
		}

		const reservationCount = await Reservation.countDocuments({ eventId: id }).session(session);

		if (reservationCount > 0) {
			throw { status: 400, message: 'Cannot delete an event that has reservations. Please use the cancel action instead.' };
		}

		await Payment.deleteMany({ eventId: id }, { session });
		await event.deleteOne({ session });

		if (session) await session.commitTransaction();

		return res.status(204).send();
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

const getAnalyticsTimeParams = (period = 'month') => {
	const now = new Date();
	let startDate;
	let groupByFormat;

	switch (period) {
		case 'week':
			startDate = new Date();
			startDate.setDate(now.getDate() - 7);
			groupByFormat = '%Y-%m-%d';
			break;
		case 'year':
			startDate = new Date();
			startDate.setFullYear(now.getFullYear() - 1);
			groupByFormat = '%Y-%m';
			break;
		case 'month':
		default:
			startDate = new Date();
			startDate.setDate(now.getDate() - 30);
			groupByFormat = '%Y-%m-%d';
			break;
	}
	return { startDate, groupByFormat };
};

exports.getRevenueAnalytics = async (req, res, next) => {
	try {
		const { period } = req.query;
		const { startDate, groupByFormat } = getAnalyticsTimeParams(period);

		const data = await Payment.aggregate([
			{ $match: { status: 'completed', createdAt: { $gte: startDate } } },
			{
				$group: {
					_id: { $dateToString: { format: groupByFormat, date: '$createdAt' } },
					revenue: { $sum: '$amount' },
					reservations: { $sum: 1 },
				},
			},
			{ $sort: { _id: 1 } },
			{
				$project: {
					_id: 0,
					date: '$_id',
					revenue: '$revenue',
					reservations: '$reservations',
				},
			},
		]);

		return res.json({ success: true, data });
	} catch (err) {
		return next(err);
	}
};

exports.getUserGrowthAnalytics = async (req, res, next) => {
	try {
		const { period } = req.query;
		const { startDate, groupByFormat } = getAnalyticsTimeParams(period);

		const [initialTotal, growthData] = await Promise.all([
			User.countDocuments({ createdAt: { $lt: startDate } }),
			User.aggregate([
				{ $match: { createdAt: { $gte: startDate } } },
				{
					$group: {
						_id: { $dateToString: { format: groupByFormat, date: '$createdAt' } },
						newUsers: { $sum: 1 },
					},
				},
				{ $sort: { _id: 1 } },
				{
					$project: {
						_id: 0,
						date: '$_id',
						newUsers: '$newUsers',
					},
				},
			]),
		]);

		let runningTotal = initialTotal;
		const data = growthData.map((item) => {
			runningTotal += item.newUsers;
			return { ...item, totalUsers: runningTotal };
		});

		return res.json({ success: true, data });
	} catch (err) {
		return next(err);
	}
};

exports.getOrganizerAnalytics = async (req, res, next) => {
	try {
		const { period } = req.query;
		const { startDate, groupByFormat } = getAnalyticsTimeParams(period);
		const organizerId = new mongoose.Types.ObjectId(req.user.id);

		// Find all events for this organizer first
		const organizerEvents = await Event.find({ organizerId }).select('_id').lean();
		const organizerEventIds = organizerEvents.map((e) => e._id);

		const data = await Payment.aggregate([
			{
				$match: {
					status: 'completed',
					createdAt: { $gte: startDate },
					eventId: { $in: organizerEventIds },
				},
			},
			{
				$group: {
					_id: { $dateToString: { format: groupByFormat, date: '$createdAt' } },
					revenue: { $sum: '$amount' },
					reservations: { $sum: 1 }, // This counts completed payments, which is a good proxy for paid reservations
				},
			},
			{ $sort: { _id: 1 } },
			{ $project: { _id: 0, date: '$_id', revenue: '$revenue', reservations: '$reservations' } },
		]);

		return res.json({ success: true, data });
	} catch (err) {
		return next(err);
	}
};
