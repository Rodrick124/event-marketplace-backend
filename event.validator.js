const { body } = require('express-validator');

// Shared validation rules for creating and updating events
exports.eventValidationRules = [
	body('title').isString().trim().isLength({ min: 3 }).withMessage('Title must be at least 3 characters long'),
	body('description').isString().trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters long'),
	body('category').isIn(['Music', 'Tech', 'Education', 'Sports', 'Art', 'Other']).withMessage('Invalid category'),
	body('location').isObject().withMessage('Location must be an object'),
	body('date').isISO8601().withMessage('Invalid date format'),
	body('time').isString().notEmpty().withMessage('Time is required'),
	body('price').isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
	body('totalSeats').isInt({ min: 0 }).withMessage('Total seats must be a non-negative integer'),
];

// Shared validation rules for updating events (fields are optional)
exports.updateEventValidationRules = [
	body('title').optional().isString().trim().isLength({ min: 3 }).withMessage('Title must be at least 3 characters long'),
	body('description').optional().isString().trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters long'),
	body('category').optional().isIn(['Music', 'Tech', 'Education', 'Sports', 'Art', 'Other']).withMessage('Invalid category'),
	body('location').optional().isObject().withMessage('Location must be an object'),
	body('date').optional().isISO8601().withMessage('Invalid date format'),
	body('time').optional().isString().notEmpty().withMessage('Time is required'),
	body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
	body('totalSeats').optional().isInt({ min: 0 }).withMessage('Total seats must be a non-negative integer'),
];