const { body } = require('express-validator');

exports.updateProfileValidationRules = [
	body('name').optional().isString().trim().notEmpty().withMessage('Name cannot be empty.'),
	body('email').optional().isEmail().withMessage('Please provide a valid email.').normalizeEmail(),
	body('profile').optional().isObject().withMessage('Profile must be an object.'),
	body('profile.bio').optional().isString().trim(),
	body('profile.phone').optional().isString().trim(),
	body('profile.organization').optional().isString().trim(),
];