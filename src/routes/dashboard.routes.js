const router = require('express').Router();
const controller = require('../controllers/dashboard.controller');
const { requireAuth, requireRoles } = require('../middleware/auth');

router.get('/admin', requireAuth, requireRoles('admin'), controller.adminStats);
router.get('/organizer', requireAuth, requireRoles('organizer'), controller.organizerStats);
router.get('/organizer/analytics', requireAuth, requireRoles('organizer'), controller.getOrganizerAnalytics);
router.post('/organizer/create-event', requireAuth, requireRoles('organizer'), controller.createEventForOrganizerDashboard);
router.get('/organizer/events', requireAuth, requireRoles('organizer'), controller.getEventsForOrganizerDashboard);
router.get('/organizer/reservations', requireAuth, requireRoles('organizer'), controller.getReservationsForOrganizerDashboard);
router.get('/attendee', requireAuth, requireRoles('attendee'), controller.attendeeStats);
router.get('/admin/users', requireAuth, requireRoles('admin'), controller.getUsersForAdminDashboard);
router.get('/admin/events', requireAuth, requireRoles('admin'), controller.getEventsForAdminDashboard);
router.get('/admin/reservations', requireAuth, requireRoles('admin'), controller.getReservationsForAdminDashboard);
router.get('/admin/analytics/revenue', requireAuth, requireRoles('admin'), controller.getRevenueAnalytics);
router.get('/admin/analytics/users', requireAuth, requireRoles('admin'), controller.getUserGrowthAnalytics);
router.get('/admin/activity-logs', requireAuth, requireRoles('admin'), controller.getActivityLogs);

module.exports = router;
