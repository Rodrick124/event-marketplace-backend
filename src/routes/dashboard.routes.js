const router = require('express').Router();
const { body } = require('express-validator');
const controller = require('../controllers/dashboard.controller');
const { requireAuth, requireRoles } = require('../middleware/auth');
const { eventValidationRules, updateEventValidationRules } = require('../../event.validator');
const eventController = require('../controllers/event.controller');

router.get('/admin', requireAuth, requireRoles('admin'), controller.adminStats);
router.get('/organizer', requireAuth, requireRoles('organizer'), controller.organizerStats);
router.get('/organizer/analytics', requireAuth, requireRoles('organizer'), controller.getOrganizerAnalytics);
router.post('/organizer/create-event', requireAuth, requireRoles('organizer'), eventValidationRules, controller.createEventForOrganizerDashboard);
router.get('/organizer/events', requireAuth, requireRoles('organizer'), controller.getEventsForOrganizerDashboard);
router.get('/organizer/events/:id', requireAuth, requireRoles('organizer'), controller.getEventForOrganizerDashboard);
router.patch('/organizer/events/:id', requireAuth, requireRoles('organizer'), updateEventValidationRules, eventController.updateEvent);
router.patch('/organizer/events/:id/cancel', requireAuth, requireRoles('organizer'), controller.cancelEventForOrganizerDashboard);
router.delete('/organizer/events/:id', requireAuth, requireRoles('organizer'), eventController.deleteEvent);
router.get('/organizer/reservations', requireAuth, requireRoles('organizer'), controller.getReservationsForOrganizerDashboard);
router.get('/attendee', requireAuth, requireRoles('attendee'), controller.attendeeStats);
router.get('/attendee/events', requireAuth, requireRoles('attendee'), controller.getAttendeeReservedEvents);
router.get('/admin/users', requireAuth, requireRoles('admin'), controller.getUsersForAdminDashboard);
router.get('/admin/events', requireAuth, requireRoles('admin'), controller.getEventsForAdminDashboard);
router.patch('/admin/events/:id/status', requireAuth, requireRoles('admin'), body('status').isIn(['pending', 'approved', 'rejected']), eventController.updateEventStatus);
router.get('/admin/reservations', requireAuth, requireRoles('admin'), controller.getReservationsForAdminDashboard);
router.get('/admin/analytics/revenue', requireAuth, requireRoles('admin'), controller.getRevenueAnalytics);
router.get('/admin/analytics/users', requireAuth, requireRoles('admin'), controller.getUserGrowthAnalytics);
router.get('/admin/activity-logs', requireAuth, requireRoles('admin'), controller.getActivityLogs);

module.exports = router;
