const router = require('express').Router();
const { body } = require('express-validator');
const controller = require('../controllers/contact.controller');

router.post(
	'/',
	body('name', 'Name is required').notEmpty().trim().escape(),
	body('email', 'Please include a valid email').isEmail().normalizeEmail(),
	body('subject', 'Subject is required').notEmpty().trim().escape(),
	body('message', 'Message is required').notEmpty().trim().escape(),
	controller.submitMessage
);

module.exports = router;