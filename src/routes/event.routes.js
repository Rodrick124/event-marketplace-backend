const router = require('express').Router();
const { body, query } = require('express-validator');
const controller = require('../controllers/event.controller');
const { requireAuth, requireRoles } = require('../middleware/auth');
const { eventValidationRules, updateEventValidationRules } = require('../../event.validator');

router.post('/', requireAuth, requireRoles('organizer', 'admin'), eventValidationRules, controller.createEvent);

router.get('/', controller.listApprovedEvents);
router.get('/search', query('category').optional().isString(), controller.searchEvents);
router.get('/:id', controller.getEventById);

router.patch('/:id', requireAuth, requireRoles('organizer', 'admin'), updateEventValidationRules, controller.updateEvent);
router.delete('/:id', requireAuth, requireRoles('organizer', 'admin'), controller.deleteEvent);
router.patch('/:id/status', requireAuth, requireRoles('admin'), body('status').isIn(['pending', 'approved', 'rejected']), controller.updateEventStatus);

module.exports = router;
