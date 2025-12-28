const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    paymentId: {
        type: String,
        unique: true,
        // Generated in pre-save
    },
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'INR',
        enum: ['INR', 'USD', 'EUR']
    },
    paymentMethod: {
        type: String,
        required: true,
        enum: ['card', 'upi', 'paypal', 'netbanking', 'wallet', 'cod']
    },
    paymentGateway: {
        type: String,
        enum: ['razorpay', 'stripe', 'paypal', 'phonepe', 'googlepay', 'paytm', 'cash', 'wallet']
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
        default: 'pending'
    },
    gatewayPaymentId: String,
    gatewayOrderId: String,
    gatewaySignature: String,
    refundId: String,
    refundAmount: Number,
    refundReason: String,
    paymentDetails: {
        // Card specific
        cardLast4: String,
        cardBrand: String,
        cardType: String,
        
        // UPI specific
        vpa: String,
        upiTransactionId: String
    },
    attempts: {
        type: Number,
        default: 0
    },
    lastAttemptAt: Date,
    paymentLink: String,
    webhookData: mongoose.Schema.Types.Mixed,
    notes: String
}, {
    timestamps: true
});

// Auto-generate Payment ID with 'ZK' prefix
paymentSchema.pre('save', async function(next) {
    if (!this.paymentId) {
        const count = await mongoose.model('Payment').countDocuments();
        this.paymentId = `ZKPAY${String(count + 1).padStart(6, '0')}`;
    }
    next();
});

// Methods to update status
paymentSchema.methods.markAsProcessing = function() {
    this.paymentStatus = 'processing';
    this.attempts += 1;
    this.lastAttemptAt = new Date();
    return this.save();
};

paymentSchema.methods.markAsCompleted = function(gatewayData = {}) {
    this.paymentStatus = 'completed';
    this.gatewayPaymentId = gatewayData.paymentId;
    this.gatewayOrderId = gatewayData.orderId;
    this.gatewaySignature = gatewayData.signature;
    return this.save();
};

paymentSchema.methods.markAsFailed = function() {
    this.paymentStatus = 'failed';
    this.attempts += 1;
    this.lastAttemptAt = new Date();
    return this.save();
};

paymentSchema.methods.initiateRefund = function(amount, reason) {
    this.paymentStatus = 'refunded';
    this.refundAmount = amount;
    this.refundReason = reason;
    return this.save();
};

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;