const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const geminiController = {
  // 1. Product Recommendations
  getProductRecommendations: async (req, res) => {
    try {
      const { userQuery, budget, category, preferences } = req.body;
      
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const prompt = `
        You are Zyro AI, the shopping assistant for ZyroKart. Recommend products based on:
        User Query: ${userQuery}
        Budget: ${budget || 'Any'}
        Category: ${category || 'Any'}
        Preferences: ${preferences || 'None'}
        
        Provide 3-5 product recommendations with:
        1. Product name
        2. Key features
        3. Estimated price range
        4. Why it's suitable for the user
        5. Alternative options
        
        Format response in JSON-like structure.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      res.status(200).json({
        success: true,
        data: text,
        message: 'Product recommendations generated successfully'
      });

    } catch (error) {
      console.error('Gemini AI Error:', error);
      res.status(500).json({
        success: false,
        message: 'Error generating recommendations',
        error: error.message
      });
    }
  },

  // 2. AI Product Search (Intent Analysis)
  aiProductSearch: async (req, res) => {
    try {
      const { query } = req.body;
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const prompt = `
        Analyze the following search query for an e-commerce store (ZyroKart): "${query}"
        Identify the user's intent, specific product categories, potential price range, and key attributes (color, style, brand).
        Return a JSON object with keys: intent, categories, priceRange, attributes.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Attempt to clean markdown if present
      const jsonStr = text.replace(/```json|```/g, '').trim();

      res.status(200).json({
        success: true,
        data: jsonStr
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'AI Search analysis failed',
        error: error.message
      });
    }
  },

  // 3. Analyze Product Image (Gemini Vision)
  analyzeProductImage: async (req, res) => {
    try {
      const { imageBase64, mimeType = "image/jpeg" } = req.body;
      
      if (!imageBase64) {
        return res.status(400).json({ success: false, message: 'Image data required' });
      }

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const imagePart = {
        inlineData: {
          data: imageBase64.replace(/^data:image\/\w+;base64,/, ""),
          mimeType
        }
      };

      const prompt = "Analyze this image. Identify the main fashion item or product. Describe its style, color, material, and suitable occasions. Output as a short summary.";
      
      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();

      res.status(200).json({
        success: true,
        data: text
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Image analysis failed',
        error: error.message
      });
    }
  },

  // 4. Size Recommendation
  getSizeRecommendation: async (req, res) => {
    try {
      const { height, weight, bodyType, productType, fitPreference } = req.body;
      
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const prompt = `
        Recommend a size for a customer with:
        Height: ${height}
        Weight: ${weight}
        Body Type: ${bodyType}
        Product Type: ${productType}
        Fit Preference: ${fitPreference || 'Regular'}
        
        Suggest a size (XS, S, M, L, XL, XXL) and explain why based on general sizing standards.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      res.status(200).json({
        success: true,
        data: text,
        productType: productType
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Size recommendation failed',
        error: error.message
      });
    }
  },

  // 5. Chat with Zyro AI
  chatWithAI: async (req, res) => {
    try {
      const { message, chatHistory = [] } = req.body;
      
      // Use flash for faster chat responses
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      // Build conversation context
      // Note: In a real app, use model.startChat({ history: ... }) for multi-turn
      const context = `
        You are "Zyro AI" - the shopping assistant for ZyroKart e-commerce platform.
        You help users with:
        - Product recommendations
        - Order tracking
        - Size and fit guidance
        - Price comparisons
        - Product information
        - Shopping advice
        
        Be friendly, helpful, Gen Z focused, and concise.
        Current conversation history: ${JSON.stringify(chatHistory)}
        
        User Message: "${message}"
      `;

      const result = await model.generateContent(context);
      const response = await result.response;
      const text = response.text();

      res.status(200).json({
        success: true,
        data: text,
        message: message,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Chat failed',
        error: error.message
      });
    }
  }
};

module.exports = geminiController;