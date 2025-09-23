const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
	eventId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Event',
		required: true,
	},
	quantity: {
		type: Number,
		required: true,
		min: 1,
	},
});

const cartSchema = new mongoose.Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
			unique: true,
			index: true,
		},
		items: [cartItemSchema],
	},
	{ timestamps: true }
);

// Helper method to calculate total price, which can be useful on the client-side.
cartSchema.methods.calculateTotals = async function () {
	await this.populate({ path: 'items.eventId', select: 'price' });
	const subtotal = this.items.reduce((acc, item) => (item.eventId ? acc + item.quantity * item.eventId.price : acc), 0);
	return { subtotal };
};

module.exports = mongoose.model('Cart', cartSchema);