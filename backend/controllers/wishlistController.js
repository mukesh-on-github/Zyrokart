const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const Cart = require('../models/Cart');

// Get user's wishlist
exports.getWishlist = async (req, res) => {
    try {
        const wishlist = await Wishlist.getOrCreateWishlist(req.user.id);

        res.json({
            success: true,
            count: wishlist.items.length,
            data: wishlist
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch wishlist',
            error: error.message
        });
    }
};

// Add item to wishlist
exports.addToWishlist = async (req, res) => {
    try {
        const { productId, notes, priority } = req.body;

        // Check if product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        const wishlist = await Wishlist.getOrCreateWishlist(req.user.id);
        
        // Add item
        await wishlist.addItem(productId, notes, priority);

        // Update analytics
        wishlist.analytics.totalItemsAdded += 1;
        await wishlist.save();

        const updatedWishlist = await Wishlist.findById(wishlist._id)
            .populate('items.product', 'name price images discount stock ratings category brand');

        res.json({
            success: true,
            message: 'Item added to wishlist',
            data: updatedWishlist
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to add item',
            error: error.message
        });
    }
};

// Remove item from wishlist
exports.removeFromWishlist = async (req, res) => {
    try {
        const { productId } = req.params;
        const wishlist = await Wishlist.findOne({ user: req.user.id });

        if (!wishlist) {
            return res.status(404).json({
                success: false,
                message: 'Wishlist not found'
            });
        }

        await wishlist.removeItem(productId);

        const updatedWishlist = await Wishlist.findById(wishlist._id)
            .populate('items.product', 'name price images discount stock ratings category brand');

        res.json({
            success: true,
            message: 'Item removed from wishlist',
            data: updatedWishlist
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to remove item',
            error: error.message
        });
    }
};

// Move item to cart
exports.moveToCart = async (req, res) => {
    try {
        const { productId } = req.params;
        
        // 1. Get Wishlist and Cart
        const wishlist = await Wishlist.findOne({ user: req.user.id });
        let cart = await Cart.findOne({ user: req.user.id });

        if (!wishlist) return res.status(404).json({ message: 'Wishlist not found' });
        if (!cart) cart = new Cart({ user: req.user.id, items: [] });

        // 2. Check if item exists in wishlist
        const wishlistItem = wishlist.items.find(item => 
            item.product.toString() === productId
        );

        if (!wishlistItem) {
            return res.status(404).json({ message: 'Item not in wishlist' });
        }

        // 3. Add to Cart (using Cart method)
        await cart.addItem(productId, 1);
        
        // 4. Remove from Wishlist
        await wishlist.removeItem(productId);

        res.json({
            success: true,
            message: 'Moved to cart successfully'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to move to cart',
            error: error.message
        });
    }
};

// Clear wishlist
exports.clearWishlist = async (req, res) => {
    try {
        const wishlist = await Wishlist.findOne({ user: req.user.id });
        
        if (wishlist) {
            await wishlist.clearWishlist();
        }

        res.json({
            success: true,
            message: 'Wishlist cleared'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to clear wishlist',
            error: error.message
        });
    }
};

// Update item priority
exports.updateItemPriority = async (req, res) => {
    try {
        const { productId } = req.params;
        const { priority, notes } = req.body; // 'low', 'medium', 'high'

        const wishlist = await Wishlist.findOne({ user: req.user.id });
        if (!wishlist) return res.status(404).json({ message: 'Wishlist not found' });

        const item = wishlist.items.find(i => i.product.toString() === productId);
        if (!item) return res.status(404).json({ message: 'Item not found' });

        if (priority) item.priority = priority;
        if (notes !== undefined) item.notes = notes;

        await wishlist.save();

        res.json({
            success: true,
            message: 'Priority updated',
            data: wishlist
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update priority',
            error: error.message
        });
    }
};

// Update visibility
exports.updateWishlistVisibility = async (req, res) => {
    try {
        const { isPublic } = req.body;

        const wishlist = await Wishlist.findOneAndUpdate(
            { user: req.user.id },
            { isPublic },
            { new: true }
        );

        res.json({
            success: true,
            message: `Wishlist is now ${isPublic ? 'Public' : 'Private'}`,
            data: { isPublic: wishlist.isPublic }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update visibility',
            error: error.message
        });
    }
};

// Share wishlist
exports.shareWishlist = async (req, res) => {
    try {
        const wishlist = await Wishlist.findOne({ user: req.user.id });
        if (!wishlist) return res.status(404).json({ message: 'Wishlist not found' });

        // Ensure it's public
        if (!wishlist.isPublic) {
            wishlist.isPublic = true;
            await wishlist.save();
        }

        // Generate shareable link (Mock URL)
        const shareLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/wishlist/public/${req.user.id}`;

        res.json({
            success: true,
            message: 'Share link generated',
            data: { shareLink }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to share wishlist',
            error: error.message
        });
    }
};

// Get suggestions based on wishlist
exports.getSuggestions = async (req, res) => {
    try {
        const wishlist = await Wishlist.findOne({ user: req.user.id });
        if (!wishlist || wishlist.items.length === 0) {
            return res.json({ success: true, data: [] });
        }

        const suggestions = await wishlist.getSuggestions();

        res.json({
            success: true,
            data: suggestions
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get suggestions',
            error: error.message
        });
    }
};

// Get wishlist analytics
exports.getWishlistAnalytics = async (req, res) => {
    try {
        const wishlist = await Wishlist.findOne({ user: req.user.id });
        if (!wishlist) return res.status(404).json({ message: 'Wishlist not found' });

        // Calculate simple analytics
        const totalValue = wishlist.items.reduce((acc, item) => {
            // Assuming item.product is populated, but if not we might need aggregation
            // For now return stored analytics + current count
            return acc; 
        }, 0);

        const analytics = {
            totalItems: wishlist.items.length,
            highPriorityItems: wishlist.items.filter(i => i.priority === 'high').length,
            itemsPurchased: wishlist.analytics.itemsPurchased,
            lastUpdated: wishlist.lastUpdated
        };

        res.json({
            success: true,
            data: analytics
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get wishlist analytics',
            error: error.message
        });
    }
};

// Get public wishlist
exports.getPublicWishlist = async (req, res) => {
    try {
        const { userId } = req.params;

        const wishlist = await Wishlist.findOne({ 
            user: userId, 
            isPublic: true 
        }).populate('items.product', 'name price images discount stock ratings category brand');

        if (!wishlist) {
            return res.status(404).json({
                success: false,
                message: 'Public wishlist not found or is private'
            });
        }

        res.json({
            success: true,
            data: {
                itemCount: wishlist.items.length,
                lastUpdated: wishlist.lastUpdated,
                items: wishlist.items.map(item => ({
                    product: item.product,
                    addedAt: item.addedAt,
                    notes: item.notes,
                    priority: item.priority
                }))
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch public wishlist',
            error: error.message
        });
    }
};