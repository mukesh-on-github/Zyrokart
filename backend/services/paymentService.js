const Razorpay = require('razorpay');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// --- RAZORPAY INTEGRATION ---

exports.createRazorpayOrder = async (order, payment) => {
    try {
        const options = {
            amount: Math.round(order.total * 100), // Amount in paise
            currency: 'INR',
            receipt: `receipt_${order.orderId}`,
            notes: {
                orderId: order.orderId,
                paymentId: payment.paymentId, // Our internal payment ID
                userId: order.user.toString()
            }
        };

        const razorpayOrder = await razorpay.orders.create(options);

        return {
            success: true,
            orderId: razorpayOrder.id, // Razorpay Order ID (starts with 'order_')
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            keyId: process.env.RAZORPAY_KEY_ID // Send to frontend
        };

    } catch (error) {
        console.error('Razorpay Create Order Error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// --- STRIPE INTEGRATION ---

exports.createStripePayment = async (order, payment) => {
    try {
        // Create a PaymentIntent with the order amount and currency
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(order.total * 100), // Amount in cents/paise
            currency: 'inr',
            description: `Order #${order.orderId}`,
            metadata: {
                orderId: order.orderId,
                paymentId: payment.paymentId,
                userId: order.user.toString()
            },
            automatic_payment_methods: {
                enabled: true,
            },
        });

        return {
            success: true,
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        };

    } catch (error) {
        console.error('Stripe Create Payment Error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// --- CAPTURE PAYMENT (For manual capture flows) ---

exports.capturePayment = async (payment) => {
    try {
        if (payment.paymentGateway === 'razorpay') {
            // Razorpay payments are mostly auto-captured, but if manual:
            const response = await razorpay.payments.capture(
                payment.gatewayPaymentId,
                Math.round(payment.amount * 100),
                'INR'
            );
            return { success: true, data: response };

        } else if (payment.paymentGateway === 'stripe') {
            // Capture a Stripe PaymentIntent
            const intent = await stripe.paymentIntents.capture(payment.gatewayPaymentId);
            return { success: true, status: intent.status };
        }

        return { success: false, error: 'Unsupported gateway for capture' };

    } catch (error) {
        return { success: false, error: error.message };
    }
};

// --- REFUND LOGIC ---

exports.processRefund = async (payment, amount, reason) => {
    try {
        let refundData = {};

        // 1. Razorpay Refund
        if (payment.paymentGateway === 'razorpay') {
            const refundOptions = {
                payment_id: payment.gatewayPaymentId,
                notes: { reason: reason || 'Customer requested refund' }
            };
            
            // If partial refund
            if (amount) {
                refundOptions.amount = Math.round(amount * 100);
            }

            refundData = await razorpay.payments.refund(refundOptions);
            
            return {
                success: true,
                refundId: refundData.id,
                status: refundData.status
            };
        } 
        
        // 2. Stripe Refund
        else if (payment.paymentGateway === 'stripe') {
            const refundOptions = {
                payment_intent: payment.gatewayPaymentId, // ID of the PaymentIntent
                reason: 'requested_by_customer'
            };

            if (amount) {
                refundOptions.amount = Math.round(amount * 100);
            }

            refundData = await stripe.refunds.create(refundOptions);

            return {
                success: true,
                refundId: refundData.id,
                status: refundData.status
            };
        }

        return { success: false, error: 'Gateway does not support automatic refunds' };

    } catch (error) {
        console.error('Refund Error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};