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

exports.getMyProfile = async (req, res, next) => {
	try {
		const user = await User.findById(req.user.id).select('-password').lean();
		if (!user) {
			return res.status(404).json({ success: false, message: 'User not found.' });
		}
		return res.json({ success: true, data: user });
	} catch (err) {
		return next(err);
	}
};

exports.updateMyProfile = async (req, res, next) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
		}

		const { name, email, profile } = req.body;

		const user = await User.findById(req.user.id);
		if (!user) {
			return res.status(404).json({ success: false, message: 'User not found' });
		}

		if (name) {
			user.name = name;
		}
		// Only update email if it's different and provided
		if (email && email !== user.email) {
			user.email = email;
			// For production apps, consider adding an email verification flow here.
		}

		// Safely update profile sub-document by whitelisting fields
		if (profile && typeof profile === 'object') {
			if (!user.profile) user.profile = {};
			const allowedProfileFields = ['bio', 'phone', 'organization'];
			allowedProfileFields.forEach((field) => {
				if (profile[field] !== undefined) {
					user.profile[field] = profile[field];
				}
			});
		}

		const updatedUser = await user.save();
		const userObject = updatedUser.toObject();
		delete userObject.password;

		return res.json({ success: true, message: 'Profile updated successfully', data: userObject });
	} catch (err) {
		if (err.name === 'ValidationError') {
			return res.status(400).json({ success: false, message: err.message, errors: err.errors });
		}
		if (err.code === 11000) {
			return res.status(409).json({ success: false, message: 'Email already in use.' });
		}
		return next(err);
	}
};

exports.changeMyPassword = async (req, res, next) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
		}

		const { currentPassword, newPassword } = req.body;

		// Fetch user with password field to compare
		const user = await User.findById(req.user.id);
		if (!user) {
			return res.status(404).json({ success: false, message: 'User not found' });
		}

		// Verify current password
		const isMatch = await user.comparePassword(currentPassword);
		if (!isMatch) {
			return res.status(401).json({ success: false, message: 'Incorrect current password.' });
		}

		user.password = newPassword;
		await user.save(); // The pre-save hook in the User model will hash the password

		return res.json({ success: true, message: 'Password changed successfully.' });
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
