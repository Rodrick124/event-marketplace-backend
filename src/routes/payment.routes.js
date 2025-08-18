const router = require('express').Router();
const { body } = require('express-validator');
const controller = require('../controllers/payment.controller');
const { requireAuth } = require('../middleware/auth');

router.post('/checkout', requireAuth, body('reservationId').isString(), body('method').isIn(['stripe', 'paypal', 'local']), controller.checkout);
router.post('/verify', requireAuth, body('paymentId').isString(), body('status').optional().isIn(['pending', 'completed', 'failed']), controller.verify);
router.get('/me', requireAuth, controller.getMyPayments);

module.exports = router;


