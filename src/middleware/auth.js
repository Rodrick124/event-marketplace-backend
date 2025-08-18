const jwt = require('jsonwebtoken');
const User = require('../models/User');

function requireAuth(req, res, next) {
	const header = req.headers.authorization || '';
	const token = header.startsWith('Bearer ') ? header.slice(7) : null;
	if (!token) return res.status(401).json({ message: 'Unauthorized' });
	try {
		const payload = jwt.verify(token, process.env.JWT_SECRET || 'change_me');
		req.user = payload;
		return next();
	} catch (err) {
		return res.status(401).json({ message: 'Invalid or expired token' });
	}
}

function requireRoles(...roles) {
	return async (req, res, next) => {
		if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
		const user = await User.findById(req.user.id).lean();
		if (!user || user.status === 'suspended') {
			return res.status(403).json({ message: 'Account suspended or not found' });
		}
		if (!roles.includes(user.role)) {
			return res.status(403).json({ message: 'Forbidden' });
		}
		req.authUser = user;
		return next();
	};
}

module.exports = { requireAuth, requireRoles };


