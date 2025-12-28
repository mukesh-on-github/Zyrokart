/**
 * ZyroKart API Connector
 * Centralized fetch handler for Backend & AI services
 */

const API_CONFIG = {
    BASE_URL: "http://localhost:5000/api",
    timeout: 10000
};

const ZyroAPI = {
    // General Fetch Wrapper
    request: async (endpoint, options = {}) => {
        const url = `${API_CONFIG.BASE_URL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        try {
            const response = await fetch(url, { ...options, headers });
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    },

    // Product Endpoints
    getProducts: () => ZyroAPI.request('/products'),
    
    // AI Endpoints
    askAI: (prompt) => ZyroAPI.request('/gemini', {
        method: 'POST',
        body: JSON.stringify({ prompt })
    }),

    analyzeImage: (base64Image) => ZyroAPI.request('/ai-lens', {
        method: 'POST',
        body: JSON.stringify({ image: base64Image })
    })
};

window.ZyroAPI = ZyroAPI;