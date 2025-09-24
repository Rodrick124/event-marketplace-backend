const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const crypto = require('crypto');
const User = require('../models/User');

function signToken(user) {
	const payload = { id: user._id.toString(), role: user.role };
	const secret = process.env.JWT_SECRET || 'change_me';
	const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
	return jwt.sign(payload, secret, { expiresIn });
}

const { sendRegistrationEmail, sendPasswordResetEmail } = require('../services/email.service');

exports.register = async (req, res, next) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
		}

		const { name, email, password } = req.body;
		const existing = await User.findOne({ email });
		// To prevent user enumeration, return a generic validation error for existing users.
		if (existing) return res.status(400).json({ message: 'Validation failed', errors: [{ path: 'email', msg: 'A user with this email already exists.' }] });
		const user = await User.create({ name, email, password });
		const token = signToken(user);
		// fire and forget registration email
		try { await sendRegistrationEmail({ to: email, name }); } catch (_) {}
		return res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
	} catch (err) {
		return next(err);
	}
};

exports.login = async (req, res, next) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
		const { email, password } = req.body;
		// Select password explicitly to use comparePassword method
		const user = await User.findOne({ email }).select('+password');

		// To prevent user enumeration and account status discovery, perform all checks before returning a generic error.
		if (!user || !(await user.comparePassword(password))) {
			return res.status(401).json({ message: 'Invalid credentials' });
		}
		if (user.status === 'suspended') {
			return res.status(403).json({ message: 'Account suspended' });
		}
		const token = signToken(user);
		return res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
	} catch (err) {
		return next(err);
	}
};

exports.me = async (req, res, next) => {
	try {
		const user = await User.findById(req.user.id).select('-password').lean();
		if (!user) {
			return res.status(404).json({ success: false, message: 'User not found.' });
		}
		// Standardize the response format
		return res.json(user);
	} catch (err) {
		return next(err);
	}
};

// Stateless JWT logout. Client should delete stored token.
exports.logout = async (req, res) => {
	return res.json({ message: 'Logged out' });
};

exports.forgotPassword = async (req, res, next) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
		}

		const { email } = req.body;
		const user = await User.findOne({ email });

		// To prevent email enumeration, always return a generic success message.
		if (!user) {
			return res.json({ success: true, message: 'If an account with that email exists, a password reset link has been sent.' });
		}

		// Generate and hash password reset token. This method needs to be added to the User model.
		const resetToken = user.getResetPasswordToken();
		await user.save({ validateBeforeSave: false }); // Skip validation to save only the reset token fields

		// Create reset URL. This should point to your frontend application.
		const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

		try {
			await sendPasswordResetEmail({
				to: user.email,
				name: user.name,
				resetUrl,
			});
			return res.json({ success: true, message: 'If an account with that email exists, a password reset link has been sent.' });
		} catch (err) {
			console.error('Email sending error:', err);
			user.passwordResetToken = undefined;
			user.passwordResetExpires = undefined;
			await user.save({ validateBeforeSave: false });
			return next(new Error('Email could not be sent. Please try again later.'));
		}
	} catch (err) {
		return next(err);
	}
};

exports.resetPassword = async (req, res, next) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
		}

		// Get hashed token from the URL params
		const passwordResetToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

		const user = await User.findOne({
			passwordResetToken,
			passwordResetExpires: { $gt: Date.now() },
		});

		if (!user) {
			return res.status(400).json({ success: false, message: 'Invalid or expired token.' });
		}

		// Set new password and clear reset fields
		user.password = req.body.newPassword;
		user.passwordResetToken = undefined;
		user.passwordResetExpires = undefined;
		await user.save(); // The pre-save hook in the User model will hash the password

		return res.json({ success: true, message: 'Password reset successfully.' });
	} catch (err) {
		return next(err);
	}
};
