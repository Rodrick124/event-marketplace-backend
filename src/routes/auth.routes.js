const router = require('express').Router();
const { body } = require('express-validator');
const controller = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth');

router.post(
	'/register',
	body('name').isString().isLength({ min: 2 }),
	body('email').isEmail(),
	body('password').isLength({ min: 6 }),
	body('role').optional().isIn(['admin', 'organizer', 'attendee']),
	controller.register
);

router.post('/login', body('email').isEmail(), body('password').isString(), controller.login);

router.get('/me', requireAuth, controller.me);

router.post('/logout', requireAuth, controller.logout);

router.post('/forgot-password', [body('email', 'Please provide a valid email').isEmail()], controller.forgotPassword);

router.post(
	'/reset-password/:token',
	[
		body('newPassword', 'New password must be at least 6 characters long').isLength({ min: 6 }),
	],
	controller.resetPassword
);

module.exports = router;
