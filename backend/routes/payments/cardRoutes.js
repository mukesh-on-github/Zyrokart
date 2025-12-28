const express = require('express');
const router = express.Router();
const cardController = require('../../controllers/cardController');
const authMiddleware = require('../../middleware/authMiddleware');

// All card routes require authentication
router.use(authMiddleware);

// Create Payment Intent (for Stripe frontend)
// POST /api/payments/card/create-payment-intent
router.post('/create-payment-intent', cardController.createPaymentIntent);

// Confirm Payment (Manual/Server-side confirmation)
// POST /api/payments/card/confirm-payment
router.post('/confirm-payment', cardController.confirmCardPayment);

// Save Card for Future Use (Setup Intent)
// POST /api/payments/card/save-card
router.post('/save-card', cardController.saveCardForFuture);

// Get Saved Cards
// GET /api/payments/card/saved-cards
router.get('/saved-cards', cardController.getSavedCards);

// Delete Saved Card
// DELETE /api/payments/card/saved-cards/:cardId
router.delete('/saved-cards/:cardId', cardController.deleteSavedCard);

module.exports = router;