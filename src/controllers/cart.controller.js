const { validationResult } = require('express-validator');
const Cart = require('../models/Cart');
const Event = require('../models/Event');

// Get user's cart
exports.getCart = async (req, res, next) => {
	try {
		const cart = await Cart.findOne({ userId: req.user.id }).populate({
			path: 'items.eventId',
			select: 'title price imageUrl availableSeats date',
		});

		if (!cart) {
			// If a user has no cart yet, return an empty one.
			return res.json({ success: true, data: { userId: req.user.id, items: [] } });
		}

		res.json({ success: true, data: cart });
	} catch (err) {
		next(err);
	}
};

// Add item to cart
exports.addItemToCart = async (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({ success: false, errors: errors.array() });
	}

	const { eventId, quantity } = req.body;
	const userId = req.user.id;

	try {
		const event = await Event.findById(eventId);
		if (!event || event.status !== 'approved') {
			return res.status(404).json({ success: false, message: 'Event not found or is not available.' });
		}

		if (event.availableSeats < quantity) {
			return res.status(400).json({ success: false, message: 'Not enough seats available.' });
		}

		let cart = await Cart.findOne({ userId });
		if (!cart) {
			cart = await Cart.create({ userId, items: [] });
		}

		const itemIndex = cart.items.findIndex((item) => item.eventId.toString() === eventId);

		if (itemIndex > -1) {
			// Item exists, update quantity
			cart.items[itemIndex].quantity += quantity;
		} else {
			// Item does not exist, add new item
			cart.items.push({ eventId, quantity });
		}

		await cart.save();
		await cart.populate({
			path: 'items.eventId',
			select: 'title price imageUrl availableSeats date',
		});

		res.status(200).json({ success: true, message: 'Item added to cart.', data: cart });
	} catch (err) {
		next(err);
	}
};

// Update cart item quantity
exports.updateCartItem = async (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({ success: false, errors: errors.array() });
	}

	const { itemId } = req.params;
	const { quantity } = req.body;
	const userId = req.user.id;

	try {
		const cart = await Cart.findOne({ userId });
		if (!cart) {
			return res.status(404).json({ success: false, message: 'Cart not found.' });
		}

		const item = cart.items.id(itemId);
		if (!item) {
			return res.status(404).json({ success: false, message: 'Item not found in cart.' });
		}

		const event = await Event.findById(item.eventId);
		if (!event || event.availableSeats < quantity) {
			return res.status(400).json({ success: false, message: 'Not enough seats available for the updated quantity.' });
		}

		item.quantity = quantity;
		await cart.save();
		await cart.populate({
			path: 'items.eventId',
			select: 'title price imageUrl availableSeats date',
		});

		res.json({ success: true, message: 'Cart updated.', data: cart });
	} catch (err) {
		next(err);
	}
};

// Remove item from cart
exports.removeCartItem = async (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({ success: false, errors: errors.array() });
	}

	const { itemId } = req.params;
	const userId = req.user.id;

	try {
		const cart = await Cart.findOneAndUpdate({ userId }, { $pull: { items: { _id: itemId } } }, { new: true }).populate({
			path: 'items.eventId',
			select: 'title price imageUrl availableSeats date',
		});

		if (!cart) {
			return res.status(404).json({ success: false, message: 'Cart not found or item already removed.' });
		}

		res.json({ success: true, message: 'Item removed from cart.', data: cart });
	} catch (err) {
		next(err);
	}
};

// Clear the entire cart
exports.clearCart = async (req, res, next) => {
	try {
		const cart = await Cart.findOneAndUpdate({ userId: req.user.id }, { $set: { items: [] } }, { new: true });

		res.json({ success: true, message: 'Cart cleared.', data: cart || { items: [] } });
	} catch (err) {
		next(err);
	}
};