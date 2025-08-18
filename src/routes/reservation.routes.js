const router = require('express').Router();
const { body } = require('express-validator');
const controller = require('../controllers/reservation.controller');
const { requireAuth, requireRoles } = require('../middleware/auth');

router.post('/', requireAuth, requireRoles('attendee'), body('eventId').isString(), body('ticketQuantity').isInt({ min: 1 }), controller.createReservation);

router.get('/me', requireAuth, requireRoles('attendee'), controller.getMyReservations);

router.delete('/:id', requireAuth, requireRoles('attendee'), controller.cancelReservation);

router.get('/event/:eventId', requireAuth, requireRoles('organizer', 'admin'), controller.getReservationsForEvent);

module.exports = router;


