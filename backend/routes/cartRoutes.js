const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const authMiddleware = require('../middleware/authMiddleware');

// All cart routes require authentication
router.use(authMiddleware);

// Get User's Cart
// GET /api/cart
router.get('/', cartController.getCart);

// Add Item to Cart
// POST /api/cart/items
router.post('/items', cartController.addToCart);

// Update Item Quantity
// PUT /api/cart/items/:productId
router.put('/items/:productId', cartController.updateCartItem);

// Remove Item from Cart
// DELETE /api/cart/items/:productId
router.delete('/items/:productId', cartController.removeFromCart);

// Clear Cart
// DELETE /api/cart/clear
router.delete('/clear', cartController.clearCart);

// Get Cart Totals (Subtotal, Tax, Shipping)
// GET /api/cart/totals
router.get('/totals', cartController.getCartTotals);

// Apply Coupon
// POST /api/cart/apply-coupon
router.post('/apply-coupon', cartController.applyCoupon);

// Remove Coupon
// DELETE /api/cart/remove-coupon
router.delete('/remove-coupon', cartController.removeCoupon);

module.exports = router;