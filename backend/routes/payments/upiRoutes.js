const express = require('express');
const router = express.Router();
const upiController = require('../../controllers/upiController');
const authMiddleware = require('../../middleware/authMiddleware');

// All UPI routes require authentication
router.use(authMiddleware);

// Create UPI Collect Request (Razorpay/PhonePe)
// POST /api/payments/upi/create-order
router.post('/create-order', upiController.createUpiOrder);

// Verify UPI Payment Status (Webhook/Callback)
// POST /api/payments/upi/verify
router.post('/verify', upiController.verifyUpiPayment);

// Generate UPI QR Code
// POST /api/payments/upi/generate-qr
router.post('/generate-qr', upiController.generateUpiQr);

// Get List of Supported UPI Apps
// GET /api/payments/upi/supported-apps
router.get('/supported-apps', upiController.getSupportedApps);

module.exports = router;