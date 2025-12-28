const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./database');
const fs = require('fs');
const path = require('path');

// 1. Load Environment Variables
dotenv.config();

const app = express();

// 2. Middleware
app.use(cors());
app.use(express.json());

// 3. Connect to MongoDB
connectDB();

/**
 * 4. SMART ROUTE LOADER
 * This function checks if the file exists before trying to load it
 * to prevent the "Module Not Found" crash.
 */
const safeRequire = (routeName) => {
    const routesPath = path.join(__dirname, 'routes');
    const possibleFiles = [
        `${routeName}Routes.js`, // e.g. productRoutes.js
        `${routeName}Route.js`,  // e.g. productRoute.js
        routeName                // e.g. AddressRoute.js
    ];

    for (const file of possibleFiles) {
        if (fs.existsSync(path.join(routesPath, file))) {
            return require(`./routes/${file}`);
        }
    }
    
    // Fallback empty router if file is totally missing
    console.warn(`⚠️ Warning: Could not find route file for ${routeName} in /routes/`);
    return express.Router(); 
};

// 5. Apply Routes
app.use('/api/products', safeRequire('product'));
app.use('/api/categories', safeRequire('categories'));
app.use('/api/users', safeRequire('user'));
app.use('/api/address', safeRequire('Address'));
app.use('/api/orders', safeRequire('order'));
app.use('/api/cart', safeRequire('cart'));
app.use('/api/wishlist', safeRequire('wishlist'));
app.use('/api/gemini', safeRequire('gemini'));
app.use('/api/lens', safeRequire('aiLens'));
app.use('/api/supplier', safeRequire('cjSupplier'));
app.use('/api/payments', safeRequire('payment'));

// 6. Root Endpoint
app.get('/', (req, res) => {
    res.json({ message: "🚀 ZyroKart Backend is Online", status: "Healthy" });
});

// 7. Start the Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log("=========================================");
    console.log(`🚀 ZyroKart Server: http://localhost:${PORT}`);
    console.log("=========================================");
});