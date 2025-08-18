const mongoose = require('mongoose');

let isConnected = false;

async function connectToDatabase() {
	if (isConnected) return;

	const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/event_marketplace';
	mongoose.set('strictQuery', true);

	await mongoose.connect(mongoUri, {
		serverSelectionTimeoutMS: 15000,
	});
	isConnected = true;
}

module.exports = { connectToDatabase };


