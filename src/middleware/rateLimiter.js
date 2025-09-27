const rateLimit = require('express-rate-limit');

// Basic limiter for most API routes
exports.apiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100, // Limit each IP to 100 requests per windowMs
	standardHeaders: true,
	legacyHeaders: false,
});

// Stricter limiter for sensitive public endpoints like contact forms or password resets
exports.strictLimiter = rateLimit({
	windowMs: 60 * 60 * 1000, // 1 hour
	max: 5, // Limit each IP to 5 requests per hour
	message: { success: false, message: 'You have made too many requests. Please try again later.' },
	standardHeaders: true,
	legacyHeaders: false,
});