const { validationResult } = require('express-validator');
const User = require('../models/User');

exports.listUsers = async (req, res, next) => {
	try {
		const users = await User.find().select('-password').sort({ createdAt: -1 });
		return res.json(users);
	} catch (err) {
		return next(err);
	}
};

exports.updateMyProfile = async (req, res, next) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
		const updates = { ...req.body };
		delete updates.role;
		delete updates.status;
		delete updates.password;
		const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select('-password');
		return res.json(user);
	} catch (err) {
		return next(err);
	}
};

exports.updateUserStatus = async (req, res, next) => {
	try {
		const { id } = req.params;
		const { status } = req.body;
		const user = await User.findByIdAndUpdate(id, { status }, { new: true }).select('-password');
		if (!user) return res.status(404).json({ message: 'User not found' });
		return res.json(user);
	} catch (err) {
		return next(err);
	}
};


