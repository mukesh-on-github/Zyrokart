const mongoose = require('mongoose');

const wishlistItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    addedAt: {
        type: Date,
        default: Date.now
    },
    notes: {
        type: String,
        maxlength: 200,
        trim: true
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    }
});

const wishlistSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    items: [wishlistItemSchema],
    isPublic: {
        type: Boolean,
        default: false
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    // Wishlist analytics for "Social Shopping" features
    analytics: {
        totalItemsAdded: {
            type: Number,
            default: 0
        },
        itemsPurchased: {
            type: Number,
            default: 0
        },
        lastPurchased: Date
    }
}, {
    timestamps: true
});

// Method to add item to wishlist
wishlistSchema.methods.addItem = async function(productId, notes = '', priority = 'medium') {
    const Product = mongoose.model('Product');
    const product = await Product.findById(productId);
    
    if (!product) {
        throw new Error('Product not found');
    }

    // Check if item already exists
    const existingItem = this.items.find(item => 
        item.product.toString() === productId.toString()
    );

    if (existingItem) {
        // Update existing item
        existingItem.notes = notes || existingItem.notes;
        existingItem.priority = priority || existingItem.priority;
        existingItem.addedAt = new Date(); // Bump to top
    } else {
        // Add new item
        this.items.push({
            product: productId,
            notes,
            priority
        });
    }

    this.lastUpdated = new Date();
    return this.save();
};

// Method to remove item
wishlistSchema.methods.removeItem = function(productId) {
    this.items = this.items.filter(item => 
        item.product.toString() !== productId.toString()
    );
    this.lastUpdated = new Date();
    return this.save();
};

// Method to clear wishlist
wishlistSchema.methods.clearWishlist = function() {
    this.items = [];
    this.lastUpdated = new Date();
    return this.save();
};

// Static method to Get or Create wishlist
wishlistSchema.statics.getOrCreateWishlist = async function(userId) {
    let wishlist = await this.findOne({ user: userId })
        .populate('items.product', 'name price images discount stock ratings category brand');
    
    if (!wishlist) {
        wishlist = new this({ user: userId, items: [] });
        await wishlist.save();
        // Populate is empty initially but good for consistency if we returned it populated
    }
    
    return wishlist;
};

// Smart Suggestions based on Wishlist content
wishlistSchema.methods.getSuggestions = async function() {
    if (this.items.length === 0) return [];

    const Product = mongoose.model('Product');
    
    // Extract categories and brands from current wishlist
    // Note: This requires items.product to be populated
    const wishlistProducts = this.items.map(i => i.product).filter(p => p && p.category);
    const wishlistProductIds = this.items.map(i => i.product._id || i.product);
    
    if (wishlistProducts.length === 0) return [];

    const categories = [...new Set(wishlistProducts.map(p => p.category))];
    
    // Find similar products (same category, not in wishlist)
    let suggestions = await Product.find({
        category: { $in: categories },
        _id: { $nin: wishlistProductIds },
        status: 'active'
    })
    .sort({ 'ratings.average': -1, createdAt: -1 })
    .limit(10);
    
    // If not enough suggestions, fill with trending products
    if (suggestions.length < 5) {
        const trending = await Product.find({
            trending: true,
            _id: { $nin: [...wishlistProductIds, ...suggestions.map(s => s._id)] },
            status: 'active'
        })
        .limit(5);
        
        suggestions = [...suggestions, ...trending];
    }
    
    return suggestions;
};

// Indexes
wishlistSchema.index({ user: 1 });
wishlistSchema.index({ isPublic: 1 });

const Wishlist = mongoose.model('Wishlist', wishlistSchema);

module.exports = Wishlist;