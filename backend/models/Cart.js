const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
        default: 1
    },
    // We store snapshots of price/name/image to avoid breaking cart if product changes
    // But typically we re-fetch latest price on checkout.
    // Storing them here helps with quick rendering of cart.
    price: {
        type: Number,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    stock: {
        type: Number,
        required: true
    }
});

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    items: [cartItemSchema],
    coupon: {
        code: String,
        discount: Number // Percentage or Fixed Amount based on logic
    },
    total: {
        type: Number,
        default: 0
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Method to calculate totals
cartSchema.methods.calculateTotals = function() {
    // 1. Calculate Subtotal
    const subtotal = this.items.reduce((total, item) => {
        return total + (item.price * item.quantity);
    }, 0);

    // 2. Calculate Discount
    let discountAmount = 0;
    if (this.coupon && this.coupon.discount) {
        // Assuming percentage discount for simplicity
        // In real app, you'd check if it's % or flat
        discountAmount = (subtotal * this.coupon.discount) / 100;
    }

    // 3. Shipping (Mock Logic: Free above 500)
    const shippingFee = subtotal > 500 ? 0 : 40;

    // 4. Tax (Mock Logic: 18% GST)
    const tax = Math.round((subtotal - discountAmount) * 0.18);

    // 5. Final Total
    const total = Math.round(subtotal - discountAmount + shippingFee + tax);

    // Update the total field in DB
    this.total = total;
    
    return {
        subtotal,
        discount: discountAmount,
        shippingFee,
        tax,
        total
    };
};

// Method to add item
cartSchema.methods.addItem = async function(productId, quantity = 1) {
    const Product = mongoose.model('Product');
    const product = await Product.findById(productId);
    
    if (!product) {
        throw new Error('Product not found');
    }

    if (product.stock < quantity) {
        throw new Error(`Insufficient stock. Only ${product.stock} left.`);
    }

    const existingItem = this.items.find(item => 
        item.product.toString() === productId.toString()
    );

    if (existingItem) {
        existingItem.quantity += quantity;
        // Re-check stock with new quantity
        if (existingItem.quantity > product.stock) {
            throw new Error(`Cannot add more. You have ${existingItem.quantity} in cart, only ${product.stock} available.`);
        }
    } else {
        this.items.push({
            product: productId,
            quantity,
            price: product.price,
            name: product.name,
            image: product.images && product.images.length > 0 ? product.images[0].url : '',
            stock: product.stock
        });
    }

    this.lastUpdated = new Date();
    return this.save();
};

// Method to remove item
cartSchema.methods.removeItem = function(productId) {
    this.items = this.items.filter(item => 
        item.product.toString() !== productId.toString()
    );
    this.lastUpdated = new Date();
    return this.save();
};

// Method to clear cart
cartSchema.methods.clearCart = function() {
    this.items = [];
    this.coupon = undefined;
    this.total = 0;
    this.lastUpdated = new Date();
    return this.save();
};

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;