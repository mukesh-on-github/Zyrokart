const express = require('express');
const router = express.Router();
const orderController = require('../controllers/ordercontroller');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// User Routes
router.get('/', orderController.getUserOrders);
router.get('/:orderId', orderController.getOrderById);
router.post('/', orderController.createOrder);
router.put('/:orderId/cancel', orderController.cancelOrder);
router.get('/:orderId/tracking', orderController.trackOrder);

// Admin Routes (Ideally add an admin check middleware here)
router.get('/admin/all', orderController.getAllOrders);
router.put('/admin/:orderId/status', orderController.updateOrderStatus);
router.put('/admin/:orderId/payment-status', orderController.updatePaymentStatus);

module.exports = router;