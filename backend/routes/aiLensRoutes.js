const express = require('express');
const router = express.Router();
const aiLensController = require('../controllers/aiLensController');
const authMiddleware = require('../middleware/authMiddleware');

// --- Public Routes (if guest scanning allowed) ---

// Process live camera scan
// POST /api/ai-lens/live-scan
router.post('/live-scan', aiLensController.processLiveScan);

// --- Protected Routes (require login) ---
router.use(authMiddleware);

// Scan product from base64 image
// POST /api/ai-lens/scan
router.post('/scan', aiLensController.scanProduct);

// Upload and analyze image file (if using multipart/form-data)
// POST /api/ai-lens/upload
router.post('/upload', aiLensController.uploadAndAnalyze);

// Search similar products based on AI analysis
// POST /api/ai-lens/similar
router.post('/similar', aiLensController.searchSimilarProducts);

// Save scan result to user history
// POST /api/ai-lens/save-scan
router.post('/save-scan', aiLensController.saveScanHistory);

// Get user's scan history
// GET /api/ai-lens/history
router.get('/history', aiLensController.getScanHistory);

module.exports = router;