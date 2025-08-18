const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
	{
		address: String,
		city: String,
		country: String,
	},
	{ _id: false }
);

const eventSchema = new mongoose.Schema(
	{
		organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
		title: { type: String, required: true, trim: true },
		description: { type: String, required: true },
		category: { type: String, enum: ['Music', 'Tech', 'Education', 'Sports', 'Art', 'Other'], required: true, index: true },
		location: locationSchema,
		date: { type: Date, required: true, index: true },
		time: { type: String, required: true },
		price: { type: Number, required: true, min: 0 },
		totalSeats: { type: Number, required: true, min: 0 },
		availableSeats: { type: Number, required: true, min: 0 },
		imageUrl: String,
		status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
	},
	{ timestamps: true }
);

module.exports = mongoose.model('Event', eventSchema);


