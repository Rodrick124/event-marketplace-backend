const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');

function signToken(user) {
	const payload = { id: user._id.toString(), role: user.role };
	const secret = process.env.JWT_SECRET || 'change_me';
	const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
	return jwt.sign(payload, secret, { expiresIn });
}

const { sendRegistrationEmail } = require('../services/email.service');

exports.register = async (req, res, next) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
		const { name, email, password } = req.body;
		const existing = await User.findOne({ email });
		if (existing) return res.status(409).json({ message: 'Email already registered' });
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
		const user = await User.findOne({ email });
		if (!user) return res.status(401).json({ message: 'Invalid credentials' });
		const ok = await user.comparePassword(password);
		if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
		if (user.status === 'suspended') return res.status(403).json({ message: 'Account suspended' });
		const token = signToken(user);
		return res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
	} catch (err) {
		return next(err);
	}
};

exports.me = async (req, res, next) => {
	try {
		const user = await User.findById(req.user.id).select('-password');
		if (!user) return res.status(404).json({ message: 'User not found' });
		return res.json(user);
	} catch (err) {
		return next(err);
	}
};

// Stateless JWT logout. Client should delete stored token.
exports.logout = async (req, res) => {
	return res.json({ message: 'Logged out' });
};


