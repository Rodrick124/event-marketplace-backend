const express = require('express');
const router = express.Router();
const { requireAuth, requireRoles } = require('../middleware/auth');
const cartController = require('../controllers/cart.controller');
const { addItemRules, updateItemRules, itemIdRule } = require('../validators/cart.validator');

// All routes are for authenticated attendees
router.use(requireAuth, requireRoles('attendee'));

router.route('/')
    .get(cartController.getCart)
    .post(addItemRules(), cartController.addItemToCart)
    .delete(cartController.clearCart);

router.route('/items/:itemId')
    .patch(updateItemRules(), cartController.updateCartItem)
    .delete(itemIdRule(), cartController.removeCartItem);

module.exports = router;