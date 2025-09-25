const { validationResult } = require('express-validator');
const ContactMessage = require('../models/ContactMessage');
const { sendContactFormEmail } = require('../services/email.service');

exports.submitMessage = async (req, res, next) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
		}

		const { name, email, subject, message } = req.body;

		// Save the message to the database
		const contactMessage = await ContactMessage.create({ name, email, subject, message });

		// Send an email notification to the admin (fire and forget)
		try {
			await sendContactFormEmail({ name, email, subject, message });
		} catch (emailError) {
			// If email fails, don't block the user. Log the error for admin to see.
			console.error(`Failed to send contact form notification for submission ${contactMessage._id}:`, emailError);
		}

		return res.status(201).json({
			success: true,
			message: 'Your message has been sent successfully. We will get back to you shortly.',
		});
	} catch (err) {
		return next(err);
	}
};