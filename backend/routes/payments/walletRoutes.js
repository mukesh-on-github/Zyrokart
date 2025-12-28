const express = require('express');
const router = express.Router();
const walletController = require('../../controllers/walletController');
const authMiddleware = require('../../middleware/authMiddleware');

// All wallet routes require authentication
router.use(authMiddleware);

// Get Wallet Balance
// GET /api/payments/wallet/balance
router.get('/balance', walletController.getWalletBalance);

// Add Money to Wallet
// POST /api/payments/wallet/add
router.post('/add', walletController.addMoneyToWallet);

module.exports = router;