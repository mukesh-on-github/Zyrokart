const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    image: {
        type: String,
        required: true
    }
});

const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        unique: true,
        // Will be generated in pre-save if not provided
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [orderItemSchema],
    shippingAddress: {
        fullName: {
            type: String,
            required: true
        },
        phone: {
            type: String,
            required: true
        },
        addressLine1: {
            type: String,
            required: true
        },
        addressLine2: String,
        city: {
            type: String,
            required: true
        },
        state: {
            type: String,
            required: true
        },
        zipCode: {
            type: String,
            required: true
        },
        country: {
            type: String,
            required: true,
            default: 'India'
        }
    },
    paymentMethod: {
        type: String,
        required: true,
        enum: ['cod', 'card', 'upi', 'wallet']
    },
    isPaid: {
        type: Boolean,
        default: false
    },
    orderStatus: {
        type: String,
        enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
        default: 'pending'
    },
    subtotal: {
        type: Number,
        required: true
    },
    shippingFee: {
        type: Number,
        default: 0
    },
    tax: {
        type: Number,
        default: 0
    },
    discount: {
        type: Number,
        default: 0
    },
    total: {
        type: Number,
        required: true
    },
    trackingNumber: String,
    carrier: {
        type: String,
        default: 'Zyro Express'
    },
    estimatedDelivery: Date,
    deliveredAt: Date,
    cancelledAt: Date,
    cancellationReason: String,
    supplierInfo: {
        // For dropshipping (CJ Supplier)
        orderId: String,
        status: String
    },
    notes: String
}, {
    timestamps: true
});

// Order ID auto-generation
orderSchema.pre('save', async function(next) {
    if (!this.orderId) {
        const count = await mongoose.model('Order').countDocuments();
        this.orderId = `ZK${String(count + 1).padStart(6, '0')}`;
    }
    next();
});

// Helper method to update status
orderSchema.methods.updateStatus = function(status) {
    this.orderStatus = status;
    
    if (status === 'delivered') {
        this.deliveredAt = new Date();
        this.isPaid = true; // Assume paid on delivery if COD
    } else if (status === 'cancelled') {
        this.cancelledAt = new Date();
    }
    
    return this.save();
};

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;