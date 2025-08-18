const mongoose = require('mongoose');

let isConnected = false;

async function connectToDatabase() {
	if (isConnected) return;

	const mongoUri = process.env.MONGODB_URI;
	mongoose.set('strictQuery', true);

	await mongoose.connect(mongoUri, {
		serverSelectionTimeoutMS: 15000,
	});
	isConnected = true;
}

module.exports = { connectToDatabase };


