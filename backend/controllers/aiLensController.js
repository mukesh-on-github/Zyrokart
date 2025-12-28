const { GoogleGenerativeAI } = require('@google/generative-ai');
const Product = require('../models/Product');
const User = require('../models/User');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper to clean base64 string
const fileToGenerativePart = (base64String, mimeType) => {
    return {
        inlineData: {
            data: base64String.replace(/^data:image\/\w+;base64,/, ""),
            mimeType
        },
    };
};

// 1. Scan Product (Analyze Image)
exports.scanProduct = async (req, res) => {
    try {
        const { image, mimeType = "image/jpeg" } = req.body;

        if (!image) {
            return res.status(400).json({
                success: false,
                message: 'No image data provided'
            });
        }

        // Use Gemini Pro Vision model
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Using Flash for speed/cost

        const prompt = "Analyze this image and identify the main fashion or lifestyle product. Return a JSON object with fields: 'productName', 'category', 'color', 'style', 'description'. Do not use markdown formatting.";
        const imagePart = fileToGenerativePart(image, mimeType);

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();
        
        // Clean JSON string
        const jsonStr = text.replace(/```json|```/g, '').trim();
        const analysis = JSON.parse(jsonStr);

        res.json({
            success: true,
            data: analysis
        });

    } catch (error) {
        console.error('AI Scan Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to analyze image',
            error: error.message
        });
    }
};

// 2. Upload and Analyze (Handles file upload logic if separate)
exports.uploadAndAnalyze = async (req, res) => {
    // This would typically handle multipart/form-data
    // For now, we reuse the scan logic assuming base64 conversion on frontend
    return exports.scanProduct(req, res);
};

// 3. Search Similar Products (Visual Search)
exports.searchSimilarProducts = async (req, res) => {
    try {
        const { query, category, color, style } = req.body;

        // Build a search filter based on AI analysis
        let searchCriteria = { status: 'active' };
        
        if (category) {
            // Fuzzy match category
            searchCriteria.category = new RegExp(category, 'i');
        }

        // Search in database
        // 1. First try specific text search if available
        let products = await Product.find({
            $text: { $search: query || style }
        }).limit(10);

        // 2. Fallback to regex if text search yields few results
        if (products.length < 3) {
            const regexQuery = new RegExp(query?.split(' ')[0] || style, 'i');
            const moreProducts = await Product.find({
                ...searchCriteria,
                $or: [
                    { name: regexQuery },
                    { description: regexQuery },
                    { 'tags': regexQuery }
                ]
            }).limit(10);
            
            // Merge results deduplicated
            const ids = new Set(products.map(p => p._id.toString()));
            moreProducts.forEach(p => {
                if (!ids.has(p._id.toString())) {
                    products.push(p);
                }
            });
        }

        // Filter by color in memory (simple implementation)
        if (color && products.length > 0) {
            const colorRegex = new RegExp(color, 'i');
            // Move products matching color to top
            products.sort((a, b) => {
                const aMatch = colorRegex.test(a.description) || colorRegex.test(a.name);
                const bMatch = colorRegex.test(b.description) || colorRegex.test(b.name);
                return bMatch - aMatch;
            });
        }

        res.json({
            success: true,
            count: products.length,
            data: products
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Visual search failed',
            error: error.message
        });
    }
};

// 4. Save Scan History
exports.saveScanHistory = async (req, res) => {
    try {
        const { userId, scanResult, imageUrl } = req.body;

        // Since we don't have a dedicated ScanHistory model yet, 
        // we will mock this success or save to User metadata if valid
        // Ideally: const history = await ScanHistory.create({...});
        
        console.log(`Saving scan for user ${userId}:`, scanResult?.productName);

        res.json({
            success: true,
            message: 'Scan saved to history'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to save history',
            error: error.message
        });
    }
};

// 5. Get Scan History
exports.getScanHistory = async (req, res) => {
    try {
        // Mock response until ScanHistory model is created
        res.json({
            success: true,
            data: []
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch history',
            error: error.message
        });
    }
};

// 6. Process Live Scan (Fast mode for camera stream)
exports.processLiveScan = async (req, res) => {
    try {
        const { frame } = req.body;
        
        if (!frame) {
            return res.status(400).json({ success: false });
        }

        // Use a lighter prompt/model for live feed
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = "Identify the single main object in this frame. Return just the object name.";
        const imagePart = fileToGenerativePart(frame, "image/jpeg");

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        
        res.json({
            success: true,
            detected: response.text().trim()
        });

    } catch (error) {
        // Live scan errors should fail silently/gracefully on frontend
        res.status(200).json({ success: false, detected: null });
    }
};