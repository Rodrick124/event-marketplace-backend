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
		const [events, payments] = await Promise.all([
			Event.find({ organizerId }),
			Payment.aggregate([
				{ $lookup: { from: 'events', localField: 'eventId', foreignField: '_id', as: 'event' } },
				{ $unwind: '$event' },
				{ $match: { status: 'completed', 'event.organizerId': new mongoose.Types.ObjectId(organizerId) } },
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
