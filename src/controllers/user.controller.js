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
		if (!errors.isEmpty()) {
			return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
		}

		const { name, email, profile } = req.body;

		const user = await User.findById(req.user.id);
		if (!user) {
			return res.status(404).json({ message: 'User not found' });
		}

		if (name) user.name = name;
		if (email) user.email = email;

		if (profile && typeof profile === 'object') {
			if (!user.profile) user.profile = {};
			Object.assign(user.profile, profile);
		}

		const updatedUser = await user.save();
		const userObject = updatedUser.toObject();
		delete userObject.password;

		return res.json({ message: 'Profile updated successfully', user: userObject });
	} catch (err) {
		if (err.name === 'ValidationError') {
			return res.status(400).json({ message: err.message, errors: err.errors });
		}
		if (err.code === 11000) {
			return res.status(409).json({ message: 'Email already in use.' });
		}
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
