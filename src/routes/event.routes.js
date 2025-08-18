const router = require('express').Router();
const { body, query } = require('express-validator');
const controller = require('../controllers/event.controller');
const { requireAuth, requireRoles } = require('../middleware/auth');

router.post(
	'/',
	requireAuth,
	requireRoles('organizer', 'admin'),
	body('title').isString().isLength({ min: 3 }),
	body('description').isString().isLength({ min: 10 }),
	body('category').isIn(['Music', 'Tech', 'Education', 'Sports', 'Art', 'Other']),
	body('location').isObject(),
	body('date').isISO8601(),
	body('time').isString(),
	body('price').isFloat({ min: 0 }),
	body('totalSeats').isInt({ min: 0 }),
	controller.createEvent
);

router.get('/', controller.listApprovedEvents);
router.get('/search', query('category').optional().isString(), controller.searchEvents);
router.get('/:id', controller.getEventById);

router.patch('/:id', requireAuth, requireRoles('organizer', 'admin'), controller.updateEvent);
router.delete('/:id', requireAuth, requireRoles('organizer', 'admin'), controller.deleteEvent);
router.patch('/:id/status', requireAuth, requireRoles('admin'), body('status').isIn(['pending', 'approved', 'rejected']), controller.updateEventStatus);

module.exports = router;


