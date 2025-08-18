const router = require('express').Router();
const controller = require('../controllers/dashboard.controller');
const { requireAuth, requireRoles } = require('../middleware/auth');

router.get('/admin', requireAuth, requireRoles('admin'), controller.adminStats);
router.get('/organizer', requireAuth, requireRoles('organizer'), controller.organizerStats);
router.get('/attendee', requireAuth, requireRoles('attendee'), controller.attendeeStats);

module.exports = router;


