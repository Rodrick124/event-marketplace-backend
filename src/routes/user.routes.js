const router = require('express').Router();
const { body } = require('express-validator');
const controller = require('../controllers/user.controller');
const { requireAuth, requireRoles } = require('../middleware/auth');

router.get('/', requireAuth, requireRoles('admin'), controller.listUsers);

router.patch('/:id/status', requireAuth, requireRoles('admin'), body('status').isIn(['active', 'suspended']), controller.updateUserStatus);

router.patch(
	'/me',
	requireAuth,
	body('profile').optional().isObject(),
	body('name').optional().isString(),
	body('email').optional().isEmail(),
	controller.updateMyProfile
);

module.exports = router;


