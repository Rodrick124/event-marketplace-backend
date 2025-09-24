require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const Event = require('../src/models/Event');
const Reservation = require('../src/models/Reservation');

/**
 * This script finds past events and cleans up associated data.
 * 1. Finds all 'approved' events where the date has passed.
 * 2. For these events, it cancels any 'reserved' (i.e., unpaid) reservations.
 * 3. It then updates the event's status to 'completed'.
 *
 * This should be run as a scheduled job (e.g., daily).
 */
const cleanupPastEvents = async () => {
	console.log('Starting cleanup of past events...');
	await connectDB();

	const session = await mongoose.startSession();
	session.startTransaction();

	try {
		const now = new Date();
		const pastEvents = await Event.find({
			date: { $lt: now },
			status: 'approved', // Only process events that were actually live
		}).session(session);

		if (pastEvents.length === 0) {
			console.log('No past events to clean up.');
			await session.commitTransaction();
			return;
		}

		const pastEventIds = pastEvents.map((e) => e._id);
		console.log(`Found ${pastEventIds.length} past events to process.`);

		// Cancel unpaid reservations for these past events
		const { modifiedCount: cancelledReservations } = await Reservation.updateMany({ eventId: { $in: pastEventIds }, status: 'reserved' }, { $set: { status: 'cancelled' } }, { session });
		console.log(`Cancelled ${cancelledReservations} unpaid reservations.`);

		// Mark the events themselves as 'completed'
		const { modifiedCount: completedEvents } = await Event.updateMany({ _id: { $in: pastEventIds } }, { $set: { status: 'completed' } }, { session });
		console.log(`Marked ${completedEvents} events as completed.`);

		await session.commitTransaction();
		console.log('Cleanup finished successfully.');
	} catch (error) {
		await session.abortTransaction();
		console.error('Error during event cleanup:', error);
		process.exit(1);
	} finally {
		session.endSession();
		mongoose.disconnect();
		process.exit(0);
	}
};

cleanupPastEvents();