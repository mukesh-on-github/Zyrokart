const Product = require('../models/Product');

// Get all products with filters
exports.getAllProducts = async (req, res) => {
    try {
        const { 
            category, 
            minPrice, 
            maxPrice, 
            brand, 
            featured, 
            trending,
            page = 1, 
            limit = 20,
            sort = 'createdAt'
        } = req.query;

        // Build filter object
        let filter = { status: 'active' }; // Default only active products
        
        if (category) filter.category = category;
        if (featured) filter.featured = featured === 'true';
        if (trending) filter.trending = trending === 'true';
        if (brand) filter.brand = new RegExp(brand, 'i');
        
        // Price range filter
        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) filter.price.$gte = Number(minPrice);
            if (maxPrice) filter.price.$lte = Number(maxPrice);
        }

        // Sort options
        const sortOptions = {
            'price-low': { price: 1 },
            'price-high': { price: -1 },
            'newest': { createdAt: -1 },
            'popular': { 'ratings.average': -1 },
            'name': { name: 1 }
        };

        const sortBy = sortOptions[sort] || { createdAt: -1 };

        // Pagination
        const skip = (page - 1) * limit;

        const products = await Product.find(filter)
            .sort(sortBy)
            .skip(skip)
            .limit(Number(limit));

        const total = await Product.countDocuments(filter);

        res.json({
            success: true,
            count: products.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: Number(page),
            data: products
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch products',
            error: error.message
        });
    }
};

// Search products (Text Search)
exports.searchProducts = async (req, res) => {
    try {
        const { q, page = 1, limit = 20 } = req.query;

        if (!q) {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }

        const skip = (page - 1) * limit;

        // Using MongoDB Text Search (requires text index on name/description/tags)
        // If index not set, fallback to Regex
        let query = { 
            status: 'active',
            $text: { $search: q }
        };

        // Fallback to Regex if text search fails or returns nothing (simple implementation)
        // Ideally, schema should have text index: productSchema.index({ name: 'text', description: 'text', tags: 'text' });
        
        // Let's try Regex for robustness if no text index
        query = {
            status: 'active',
            $or: [
                { name: { $regex: q, $options: 'i' } },
                { description: { $regex: q, $options: 'i' } },
                { tags: { $in: [new RegExp(q, 'i')] } }
            ]
        };

        const products = await Product.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Product.countDocuments(query);

        res.json({
            success: true,
            count: products.length,
            total,
            data: products
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Search failed',
            error: error.message
        });
    }
};

// Get single product by ID
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.json({
            success: true,
            data: product
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch product',
            error: error.message
        });
    }
};

// Get Featured Products
exports.getFeaturedProducts = async (req, res) => {
    try {
        const products = await Product.find({ featured: true, status: 'active' })
            .limit(10)
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: products.length,
            data: products
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch featured products',
            error: error.message
        });
    }
};

// Get Trending Products
exports.getTrendingProducts = async (req, res) => {
    try {
        const products = await Product.find({ trending: true, status: 'active' })
            .limit(10)
            .sort({ 'ratings.average': -1 });

        res.json({
            success: true,
            count: products.length,
            data: products
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch trending products',
            error: error.message
        });
    }
};

// Get Products by Category
exports.getProductsByCategory = async (req, res) => {
    try {
        const { category } = req.params;
        const products = await Product.find({ 
            category: new RegExp(`^${category}$`, 'i'), 
            status: 'active' 
        }).limit(20);

        res.json({
            success: true,
            count: products.length,
            data: products
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch category products',
            error: error.message
        });
    }
};

// Create new product (Admin)
exports.createProduct = async (req, res) => {
    try {
        const product = await Product.create(req.body);

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: product
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Product creation failed',
            error: error.message
        });
    }
};

// Update product (Admin)
exports.updateProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.json({
            success: true,
            message: 'Product updated successfully',
            data: product
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Product update failed',
            error: error.message
        });
    }
};

// Delete product (Admin)
exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.json({
            success: true,
            message: 'Product deleted successfully'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Update stock (Admin)
exports.updateStock = async (req, res) => {
    try {
        const { stock } = req.body;
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            { 
                stock,
                status: stock > 0 ? 'active' : 'out_of_stock'
            },
            { new: true }
        );

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.json({
            success: true,
            message: 'Stock updated successfully',
            data: product
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Stock update failed',
            error: error.message
        });
    }
};

// Update Product Status (Admin)
exports.updateStatus = async (req, res) => {
    try {
        const { status } = req.body; // 'active', 'inactive', 'archived'
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.json({
            success: true,
            message: 'Status updated successfully',
            data: product
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Status update failed',
            error: error.message
        });
    }
};