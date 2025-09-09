/* eslint-disable no-console */
require('dotenv').config();
const { faker } = require('@faker-js/faker');
const mongoose = require('mongoose');
const { connectToDatabase } = require('../src/config/db');
const User = require('../src/models/User');
const Event = require('../src/models/Event');
const Reservation = require('../src/models/Reservation');
const Payment = require('../src/models/Payment');
const ActivityLog = require('../src/models/ActivityLog');

function randomChoice(array) {
	return array[Math.floor(Math.random() * array.length)];
}

async function dropDemoDataIfRequested() {
	if (process.env.DEMO_DROP !== 'true') return;
	await Promise.all([
		ActivityLog.deleteMany({}),
		Payment.deleteMany({}),
		Reservation.deleteMany({}),
		Event.deleteMany({}),
		User.deleteMany({ role: { $in: ['organizer', 'attendee'] } }),
	]);
	console.log('Dropped existing demo data');
}

async function createUsers({ organizers = 10, attendees = 200 }) {
	const organizerDocs = [];
	for (let i = 0; i < organizers; i += 1) {
		organizerDocs.push({
			name: faker.person.fullName(),
			email: faker.internet.email().toLowerCase(),
			password: 'Passw0rd!234',
			role: 'organizer',
			profile: {
				avatar: faker.image.avatar(),
				phone: faker.phone.number(),
				bio: faker.person.bio(),
				organization: faker.company.name(),
			},
		});
	}
	const attendeeDocs = [];
	for (let i = 0; i < attendees; i += 1) {
		attendeeDocs.push({
			name: faker.person.fullName(),
			email: faker.internet.email().toLowerCase(),
			password: 'Passw0rd!234',
			role: 'attendee',
			profile: {
				avatar: faker.image.avatar(),
				phone: faker.phone.number(),
				bio: faker.person.bio(),
			},
		});
	}

	const users = await User.insertMany([...organizerDocs, ...attendeeDocs]);
	const organizerUsers = users.filter((u) => u.role === 'organizer');
	const attendeeUsers = users.filter((u) => u.role === 'attendee');
	console.log(`Created users → organizers: ${organizerUsers.length}, attendees: ${attendeeUsers.length}`);
	return { organizerUsers, attendeeUsers };
}

function createEventPayload(organizerId) {
	const categories = ['Music', 'Tech', 'Education', 'Sports', 'Art', 'Other'];
	const startDate = faker.date.soon({ days: 90 });
	const totalSeats = faker.number.int({ min: 20, max: 500 });
	const price = faker.number.float({ min: 0, max: 200, multipleOf: 0.5 });
	return {
		organizerId,
		title: faker.company.catchPhrase(),
		description: faker.lorem.paragraphs({ min: 1, max: 3 }).slice(0, 1000),
		category: randomChoice(categories),
		location: {
			address: faker.location.streetAddress(),
			city: faker.location.city(),
			country: faker.location.country(),
		},
		date: startDate,
		time: faker.date.recent().toTimeString().slice(0, 5),
		price,
		totalSeats,
		availableSeats: totalSeats,
		imageUrl: faker.image.urlPicsumPhotos(),
		status: faker.helpers.weightedArrayElement([
			{ weight: 6, value: 'approved' },
			{ weight: 3, value: 'pending' },
			{ weight: 1, value: 'rejected' },
		]),
	};
}

async function createEvents(organizerUsers, { perOrganizer = { min: 5, max: 15 } }) {
	const eventDocs = [];
	for (const organizer of organizerUsers) {
		const howMany = faker.number.int(perOrganizer);
		for (let i = 0; i < howMany; i += 1) {
			eventDocs.push(createEventPayload(organizer._id));
		}
	}
	const events = await Event.insertMany(eventDocs);
	console.log(`Created events → ${events.length}`);
	return events;
}

async function createReservationsAndPayments(attendeeUsers, events) {
	const reservations = [];
	const payments = [];
	for (const attendee of attendeeUsers) {
		// each attendee books up to 5 events
		const howMany = faker.number.int({ min: 0, max: 5 });
		const selectedEvents = faker.helpers.arrayElements(events, howMany);
		for (const event of selectedEvents) {
			if (event.status !== 'approved') continue;
			const maxTickets = Math.max(1, Math.min(6, event.availableSeats));
			const ticketQuantity = faker.number.int({ min: 1, max: maxTickets });
			if (event.availableSeats < ticketQuantity) continue;
			event.availableSeats -= ticketQuantity;
			const totalPrice = Number(event.price) * ticketQuantity;
			const reservation = {
				eventId: event._id,
				userId: attendee._id,
				ticketQuantity,
				totalPrice,
				status: faker.helpers.weightedArrayElement([
					{ weight: 9, value: 'reserved' },
					{ weight: 1, value: 'cancelled' },
				]),
			};
			reservations.push(reservation);

			// 80% chance to create a payment when reserved
			if (reservation.status === 'reserved' && faker.datatype.boolean(0.8)) {
				const method = faker.helpers.weightedArrayElement([
					{ weight: 6, value: 'stripe' },
					{ weight: 3, value: 'paypal' },
					{ weight: 1, value: 'local' },
				]);
				payments.push({
					userId: attendee._id,
					eventId: event._id,
					amount: totalPrice,
					method,
					transactionId: faker.string.uuid(),
					status: faker.helpers.weightedArrayElement([
						{ weight: 8, value: 'completed' },
						{ weight: 1, value: 'pending' },
						{ weight: 1, value: 'failed' },
					]),
				});
			}
		}
	}

	// persist seat updates, reservations, and payments
	const [_, reservationDocs, paymentDocs] = await Promise.all([
		Promise.all(events.map((e) => Event.updateOne({ _id: e._id }, { $set: { availableSeats: e.availableSeats } }))),
		Reservation.insertMany(reservations),
		Payment.insertMany(payments),
	]);
	console.log(`Created reservations → ${reservationDocs.length}`);
	console.log(`Created payments → ${paymentDocs.length}`);
	return { reservationDocs, paymentDocs };
}

async function createActivityLogs({ users, events, reservations, payments }) {
	const activityLogs = [];
	const allUsers = [...users.organizerUsers, ...users.attendeeUsers];

	// User registration logs
	allUsers.forEach((user) => {
		activityLogs.push({
			type: 'user_registration',
			description: `New user registered: ${user.name}`,
			userId: user._id,
			timestamp: user.createdAt,
			metadata: { ipAddress: faker.internet.ip(), userAgent: faker.internet.userAgent() },
		});
	});

	// Event logs
	events.forEach((event) => {
		activityLogs.push({
			type: 'event_created',
			description: `Event created: "${event.title}"`,
			userId: event.organizerId,
			eventId: event._id,
			timestamp: event.createdAt,
			metadata: { ipAddress: faker.internet.ip(), userAgent: faker.internet.userAgent() },
		});
		if (event.status !== 'pending') {
			activityLogs.push({
				type: 'event_status_changed',
				description: `Event "${event.title}" status changed to ${event.status}`,
				eventId: event._id,
				timestamp: faker.date.soon({ days: 1, refDate: event.createdAt }),
				metadata: { ipAddress: faker.internet.ip(), userAgent: faker.internet.userAgent() },
			});
		}
	});

	// Reservation logs
	reservations.forEach((r) => {
		activityLogs.push({
			type: r.status === 'cancelled' ? 'reservation_cancelled' : 'new_reservation',
			description: `Reservation for ${r.ticketQuantity} ticket(s) was ${r.status}`,
			userId: r.userId,
			eventId: r.eventId,
			timestamp: r.createdAt,
			metadata: { ipAddress: faker.internet.ip(), userAgent: faker.internet.userAgent() },
		});
	});

	// Payment logs
	payments.forEach((p) => {
		activityLogs.push({
			type: `payment_${p.status}`,
			description: `Payment of ${p.amount.toFixed(2)} via ${p.method} was ${p.status}`,
			userId: p.userId,
			eventId: p.eventId,
			timestamp: p.createdAt,
			metadata: { ipAddress: faker.internet.ip(), userAgent: faker.internet.userAgent(), transactionId: p.transactionId },
		});
	});

	if (activityLogs.length > 0) {
		await ActivityLog.insertMany(activityLogs);
	}
	console.log(`Created activity logs → ${activityLogs.length}`);
}

async function main() {
	const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/event_marketplace';
	await connectToDatabase(mongoUri);
	await dropDemoDataIfRequested();

	const organizers = Number(process.env.DEMO_ORGANIZERS || 20);
	const attendees = Number(process.env.DEMO_ATTENDEES || 500);
	const { organizerUsers, attendeeUsers } = await createUsers({ organizers, attendees });
	const events = await createEvents(organizerUsers, { perOrganizer: { min: 5, max: 15 } });
	const { reservationDocs, paymentDocs } = await createReservationsAndPayments(attendeeUsers, events);
	await createActivityLogs({ users: { organizerUsers, attendeeUsers }, events, reservations: reservationDocs, payments: paymentDocs });
	console.log('Demo seed complete.');
	await mongoose.connection.close();
	process.exit(0);
}

main().catch(async (err) => {
	console.error(err);
	try { await mongoose.connection.close(); } catch (_) {}
	process.exit(1);
});
