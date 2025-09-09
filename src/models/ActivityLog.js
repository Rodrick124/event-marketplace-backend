const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
	type: { type: String, required: true, index: true },
	description: { type: String, required: true },
	userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
	eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
	timestamp: { type: Date, default: Date.now, index: true },
	metadata: {
		ipAddress: String,
		userAgent: String,
		// any other relevant metadata
	},
});

// Add a text index on the description for searching
activityLogSchema.index({ description: 'text' });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

module.exports = ActivityLog;