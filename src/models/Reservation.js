const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema(
	{
		eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
		userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
		ticketQuantity: { type: Number, required: true, min: 1 },
		totalPrice: { type: Number, required: true, min: 0 },
		status: { type: String, enum: ['reserved', 'cancelled'], default: 'reserved', index: true },
		paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
	},
	{ timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model('Reservation', reservationSchema);


