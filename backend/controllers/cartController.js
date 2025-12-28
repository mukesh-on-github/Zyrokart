const Cart = require('../models/Cart');
const Product = require('../models/Product');

// Get user's cart
exports.getCart = async (req, res) => {
    try {
        let cart = await Cart.findOne({ user: req.user.id })
            .populate('items.product', 'name price images discount stock category brand');

        if (!cart) {
            cart = new Cart({ user: req.user.id, items: [] });
            await cart.save();
        }

        // Calculate totals dynamically before sending
        const totals = await cart.calculateTotals();

        res.json({
            success: true,
            data: {
                ...cart.toObject(),
                totals
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch cart',
            error: error.message
        });
    }
};

// Add item to cart
exports.addToCart = async (req, res) => {
    try {
        const { productId, quantity } = req.body;

        let cart = await Cart.findOne({ user: req.user.id });

        if (!cart) {
            cart = new Cart({ user: req.user.id, items: [] });
        }

        await cart.addItem(productId, Number(quantity));
        
        // Re-fetch to populate details
        const updatedCart = await Cart.findById(cart._id)
            .populate('items.product', 'name price images discount stock category brand');
            
        const totals = await updatedCart.calculateTotals();

        res.json({
            success: true,
            message: 'Item added to cart',
            data: {
                ...updatedCart.toObject(),
                totals
            }
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Failed to add item',
            error: error.message
        });
    }
};

// Update item quantity
exports.updateCartItem = async (req, res) => {
    try {
        const { productId } = req.params;
        const { quantity } = req.body;

        if (quantity < 1) {
            return res.status(400).json({
                success: false,
                message: 'Quantity must be at least 1'
            });
        }

        const cart = await Cart.findOne({ user: req.user.id });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        const item = cart.items.find(item => item.product.toString() === productId);
        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Item not in cart'
            });
        }

        // Check stock
        const product = await Product.findById(productId);
        if (quantity > product.stock) {
            return res.status(400).json({
                success: false,
                message: `Only ${product.stock} items available`
            });
        }

        item.quantity = Number(quantity);
        cart.lastUpdated = new Date();
        await cart.save();

        const updatedCart = await Cart.findById(cart._id)
            .populate('items.product', 'name price images discount stock category brand');
        const totals = await updatedCart.calculateTotals();

        res.json({
            success: true,
            message: 'Cart updated',
            data: {
                ...updatedCart.toObject(),
                totals
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update cart',
            error: error.message
        });
    }
};

// Remove item from cart
exports.removeFromCart = async (req, res) => {
    try {
        const { productId } = req.params;
        
        const cart = await Cart.findOne({ user: req.user.id });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        await cart.removeItem(productId);
        
        const updatedCart = await Cart.findById(cart._id)
            .populate('items.product', 'name price images discount stock category brand');
        const totals = await updatedCart.calculateTotals();

        res.json({
            success: true,
            message: 'Item removed',
            data: {
                ...updatedCart.toObject(),
                totals
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to remove item',
            error: error.message
        });
    }
};

// Clear cart
exports.clearCart = async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user.id });
        if (cart) {
            await cart.clearCart();
        }

        res.json({
            success: true,
            message: 'Cart cleared',
            data: { items: [], totals: { subtotal: 0, total: 0 } }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to clear cart',
            error: error.message
        });
    }
};

// Apply Coupon
exports.applyCoupon = async (req, res) => {
    try {
        const { code } = req.body;
        // In a real app, you'd check a Coupon collection
        // Mock logic: 'ZYRO10' gives 10% off
        
        let discount = 0;
        if (code.toUpperCase() === 'ZYRO10') {
            discount = 10; // 10%
        } else if (code.toUpperCase() === 'WELCOME50') {
            discount = 50; // Flat 50
        } else {
            return res.status(400).json({
                success: false,
                message: 'Invalid coupon code'
            });
        }

        const cart = await Cart.findOne({ user: req.user.id });
        if (!cart) {
            return res.status(404).json({ message: 'Cart is empty' });
        }

        cart.coupon = { code, discount };
        await cart.save();

        const updatedCart = await Cart.findById(cart._id)
            .populate('items.product', 'name price images discount stock category brand');
        const totals = await updatedCart.calculateTotals();

        res.json({
            success: true,
            message: 'Coupon applied',
            data: {
                ...updatedCart.toObject(),
                totals
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to apply coupon',
            error: error.message
        });
    }
};

// Remove Coupon
exports.removeCoupon = async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user.id });
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        cart.coupon = undefined;
        await cart.save();

        const updatedCart = await Cart.findById(cart._id)
            .populate('items.product', 'name price images discount stock category brand');
        const totals = await updatedCart.calculateTotals();

        res.json({
            success: true,
            message: 'Coupon removed',
            data: {
                ...updatedCart.toObject(),
                totals
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to remove coupon',
            error: error.message
        });
    }
};

// Get Cart Totals (Utility route)
exports.getCartTotals = async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user.id });
        if (!cart) {
            return res.json({
                success: true,
                data: { subtotal: 0, shipping: 0, tax: 0, discount: 0, total: 0 }
            });
        }
        
        const totals = await cart.calculateTotals();
        res.json({
            success: true,
            data: totals
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to calculate totals',
            error: error.message
        });
    }
};