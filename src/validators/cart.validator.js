const { body, param } = require('express-validator');

exports.addItemRules = () => [
	body('eventId').isMongoId().withMessage('A valid event ID is required.'),
	body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1.'),
];

exports.updateItemRules = () => [
	param('itemId').isMongoId().withMessage('A valid cart item ID is required.'),
	body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1.'),
];

exports.itemIdRule = () => [
	param('itemId').isMongoId().withMessage('A valid cart item ID is required.'),
];