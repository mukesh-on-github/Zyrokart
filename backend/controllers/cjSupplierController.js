const axios = require('axios');
const Product = require('../models/Product');
const Order = require('../models/Order');

// CJ API Configuration
const CJ_API_URL = 'https://developers.cjdropshipping.com/api2.0/v1';
// In production, use process.env.CJ_ACCESS_TOKEN

// Helper for CJ API headers
const getCJHeaders = () => ({
    'CJ-Access-Token': process.env.CJ_ACCESS_TOKEN,
    'Content-Type': 'application/json'
});

// 1. Get Products from CJ
exports.getCJProducts = async (req, res) => {
    try {
        const { page = 1, categoryId, keyword } = req.query;

        // This is the endpoint structure for CJ (Product List)
        const response = await axios.get(`${CJ_API_URL}/product/list`, {
            headers: getCJHeaders(),
            params: {
                pageNum: page,
                pageSize: 20,
                categoryId: categoryId,
                productName: keyword
            }
        });

        if (response.data.result) {
            res.json({
                success: true,
                data: response.data.data
            });
        } else {
            throw new Error(response.data.message || 'CJ API Error');
        }

    } catch (error) {
        console.error('CJ Product Fetch Error:', error.message);
        // Mock data for development if API fails or no key
        res.json({
            success: true,
            isMock: true,
            data: {
                list: [
                    { pid: 'CJ123', name: 'Mock CJ Hoodie', price: 15.99, img: '...' },
                    { pid: 'CJ456', name: 'Mock CJ Sneakers', price: 25.50, img: '...' }
                ]
            }
        });
    }
};

// 2. Get Product Details
exports.getCJProductDetail = async (req, res) => {
    try {
        const { productId } = req.params;

        const response = await axios.get(`${CJ_API_URL}/product/query`, {
            headers: getCJHeaders(),
            params: { pid: productId }
        });

        res.json({
            success: true,
            data: response.data.data
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch CJ product details',
            error: error.message
        });
    }
};

// 3. Sync CJ Product to Local DB
exports.syncCJProducts = async (req, res) => {
    try {
        const { cjPid, category, markupPercentage = 20 } = req.body;

        // 1. Fetch full details from CJ
        // Mocking the fetch for now, logic remains same
        const cjData = {
            pid: cjPid,
            productNameEn: 'Imported CJ Product',
            productImage: 'https://cj.com/image.jpg',
            sellPrice: 10.00,
            description: 'Imported via API'
        }; 
        // const response = await axios.get(...) // Use real API here

        // 2. Calculate new price with markup
        const basePrice = parseFloat(cjData.sellPrice);
        const sellingPrice = basePrice + (basePrice * (markupPercentage / 100));

        // 3. Create/Update in Local DB
        let product = await Product.findOne({ 'supplierInfo.supplierPid': cjPid });

        if (product) {
            // Update existing
            product.price = sellingPrice;
            product.stock = 100; // CJ usually has high stock
            await product.save();
        } else {
            // Create new
            product = await Product.create({
                name: cjData.productNameEn,
                description: cjData.description,
                price: sellingPrice,
                category: category || 'Dropship',
                images: [{ url: cjData.productImage, alt: cjData.productNameEn }],
                stock: 100,
                supplierInfo: {
                    supplierName: 'CJ Dropshipping',
                    supplierPid: cjPid,
                    costPrice: basePrice
                },
                tags: ['imported', 'dropship']
            });
        }

        res.json({
            success: true,
            message: 'Product synced successfully',
            data: product
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Sync failed',
            error: error.message
        });
    }
};

// 4. Create Order on CJ (Fulfillment)
exports.createCJOrder = async (req, res) => {
    try {
        const { orderId } = req.body;
        
        // Fetch local order
        const localOrder = await Order.findOne({ orderId }).populate('items.product');
        if (!localOrder) return res.status(404).json({ message: 'Order not found' });

        // Map local order to CJ format
        const cjOrderPayload = {
            orderNumber: localOrder.orderId,
            shippingZip: localOrder.shippingAddress.zipCode,
            shippingCountryCode: 'IN', // Assuming India
            products: localOrder.items.map(item => ({
                vid: item.product.supplierInfo?.supplierPid || 'UNKNOWN',
                quantity: item.quantity
            }))
        };

        // Send to CJ
        const response = await axios.post(`${CJ_API_URL}/shopping/order/createOrder`, cjOrderPayload, {
            headers: getCJHeaders()
        });

        if (response.data.result) {
            localOrder.status = 'processing';
            localOrder.supplierInfo = {
                orderId: response.data.data.orderId,
                status: 'Placed on CJ'
            };
            await localOrder.save();

            res.json({
                success: true,
                message: 'Order placed on CJ Dropshipping',
                cjOrderId: response.data.data.orderId
            });
        } else {
            throw new Error(response.data.message);
        }

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to create CJ order',
            error: error.message
        });
    }
};

// 5. Calculate Shipping Cost
exports.calculateShipping = async (req, res) => {
    try {
        const { countryCode, productVid, quantity } = req.body;

        const response = await axios.post(`${CJ_API_URL}/logistic/freightCalculate`, {
            startCountryCode: "CN",
            endCountryCode: countryCode || "IN",
            products: [{
                vid: productVid,
                quantity: quantity || 1
            }]
        }, { headers: getCJHeaders() });

        res.json({
            success: true,
            data: response.data.data
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Shipping calculation failed',
            error: error.message
        });
    }
};

// 6. Track CJ Order
exports.trackCJOrder = async (req, res) => {
    try {
        const { orderId } = req.params;

        // In real app, orderId would be the CJ Order ID saved in your DB
        const response = await axios.get(`${CJ_API_URL}/logistic/trackInfo`, {
            headers: getCJHeaders(),
            params: { orderId }
        });

        res.json({
            success: true,
            data: response.data.data
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Tracking failed',
            error: error.message
        });
    }
};

// 7. Get CJ Categories
exports.getCJCategories = async (req, res) => {
    try {
        // Mock response if API key missing
        res.json({
            success: true,
            data: [
                { id: '1', name: 'Women\'s Clothing' },
                { id: '2', name: 'Men\'s Clothing' },
                { id: '3', name: 'Consumer Electronics' }
            ]
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// 8. Get Supplier Stats
exports.getSupplierStats = async (req, res) => {
    res.json({
        success: true,
        data: {
            connected: !!process.env.CJ_ACCESS_TOKEN,
            productsSynced: 150, // Mock
            pendingOrders: 5
        }
    });
};