const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
	{
		userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
		eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
		amount: { type: Number, required: true, min: 0 },
		method: { type: String, enum: ['stripe', 'paypal', 'local'], required: true },
		transactionId: { type: String, index: true },
		status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending', index: true },
	},
	{ timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model('Payment', paymentSchema);


