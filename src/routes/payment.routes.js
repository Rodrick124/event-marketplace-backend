const router = require('express').Router();
const { body } = require('express-validator');
const controller = require('../controllers/payment.controller');
const { requireAuth, requireRoles } = require('../middleware/auth');

router.post('/checkout', requireAuth, body('reservationId').isString(), body('method').isIn(['stripe', 'paypal', 'local']), controller.checkout);

router.post('/:paymentId/confirm', requireAuth, controller.confirmPayment);

router.patch(
	'/:paymentId/status',
	requireAuth,
	requireRoles('admin', 'organizer'),
	body('status').isIn(['completed', 'failed', 'pending']),
	controller.updatePaymentStatusByAdmin
);

router.get('/me', requireAuth, controller.getMyPayments);

router.get('/:id', requireAuth, controller.getPaymentById);

module.exports = router;
