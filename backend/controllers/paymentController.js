const Payment = require('../models/Payment');
const Order = require('../models/Order');
const paymentService = require('../services/paymentService');

// Create payment
exports.createPayment = async (req, res) => {
    try {
        const { orderId, paymentMethod, paymentGateway } = req.body;

        // Check if order exists
        const order = await Order.findOne({ orderId });
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if payment already exists for this order
        const existingPayment = await Payment.findOne({ order: order._id });
        if (existingPayment) {
            // Return existing payment details to resume/retry
            return res.json({
                success: true,
                message: 'Payment record already exists',
                data: existingPayment
            });
        }

        // Create new Payment record
        const payment = new Payment({
            order: order._id,
            user: order.user,
            amount: order.total,
            paymentMethod,
            paymentGateway,
            paymentStatus: 'pending'
        });

        // The pre-save hook in Payment model handles ID generation
        // But we can customize it here if needed, e.g., 'ZK-PAY-...' is managed in model schema usually
        await payment.save();

        // Delegate to specific gateway service
        let gatewayResponse = {};
        
        switch (paymentGateway) {
            case 'razorpay':
                gatewayResponse = await paymentService.createRazorpayOrder(order, payment);
                break;
            case 'stripe':
                gatewayResponse = await paymentService.createStripePayment(order, payment);
                break;
            case 'cod':
                // Cash on Delivery doesn't need a gateway call
                gatewayResponse = { success: true, message: 'COD Order Placed' };
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Invalid payment gateway'
                });
        }

        if (gatewayResponse.success) {
            // Save gateway-specific IDs (like Razorpay Order ID) to our record
            if (gatewayResponse.orderId) {
                payment.gatewayOrderId = gatewayResponse.orderId;
                await payment.save();
            }

            res.status(201).json({
                success: true,
                message: 'Payment initiated successfully',
                data: {
                    paymentId: payment.paymentId,
                    ...gatewayResponse
                }
            });
        } else {
            // If gateway fails
            payment.paymentStatus = 'failed';
            await payment.save();
            
            res.status(400).json({
                success: false,
                message: 'Payment gateway initialization failed',
                error: gatewayResponse.error
            });
        }

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Payment creation failed',
            error: error.message
        });
    }
};

// Verify payment (Webhook or Manual callback)
exports.verifyPayment = async (req, res) => {
    try {
        const { paymentId, gatewayData } = req.body;

        const payment = await Payment.findOne({ paymentId });
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment record not found'
            });
        }

        // Verify based on gateway
        let verificationResult = { success: false };

        if (payment.paymentGateway === 'razorpay') {
            const crypto = require('crypto');
            const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
            
            hmac.update(payment.gatewayOrderId + "|" + gatewayData.paymentId);
            const generatedSignature = hmac.digest('hex');
            
            if (generatedSignature === gatewayData.signature) {
                verificationResult = { success: true };
            }
        } else if (payment.paymentGateway === 'stripe') {
            // Stripe typically uses webhooks, but for client-side confirm:
            if (gatewayData.status === 'succeeded') {
                verificationResult = { success: true };
            }
        } else if (payment.paymentGateway === 'cod') {
             verificationResult = { success: true }; // COD is verified on delivery
        }

        if (verificationResult.success) {
            await payment.markAsCompleted(gatewayData);
            
            // Update Order Status
            await Order.findByIdAndUpdate(payment.order, {
                orderStatus: 'confirmed', // or 'processing'
                paymentMethod: payment.paymentMethod,
                isPaid: true
            });

            res.json({
                success: true,
                message: 'Payment verified successfully',
                data: payment
            });
        } else {
            await payment.markAsFailed();
            res.status(400).json({
                success: false,
                message: 'Payment verification failed'
            });
        }

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Payment verification error',
            error: error.message
        });
    }
};

// Get payment status
exports.getPaymentStatus = async (req, res) => {
    try {
        const payment = await Payment.findOne({ paymentId: req.params.paymentId });
        
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        res.json({
            success: true,
            data: {
                paymentId: payment.paymentId,
                status: payment.paymentStatus,
                amount: payment.amount,
                method: payment.paymentMethod
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payment status',
            error: error.message
        });
    }
};

// Capture Payment (Admin/System)
exports.capturePayment = async (req, res) => {
    try {
        const { paymentId } = req.params;
        const payment = await Payment.findOne({ paymentId });

        if (!payment) return res.status(404).json({ message: 'Payment not found' });

        const captureResult = await paymentService.capturePayment(payment);

        if (captureResult.success) {
            payment.paymentStatus = 'completed';
            await payment.save();
            
            res.json({
                success: true,
                message: 'Payment captured successfully',
                data: payment
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Capture failed',
                error: captureResult.error
            });
        }

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Capture error',
            error: error.message
        });
    }
};

// Refund Payment
exports.refundPayment = async (req, res) => {
    try {
        const { paymentId } = req.params;
        const { amount, reason } = req.body;

        const payment = await Payment.findOne({ paymentId });
        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        if (payment.paymentStatus !== 'completed') {
            return res.status(400).json({ message: 'Only completed payments can be refunded' });
        }

        const refundResult = await paymentService.processRefund(payment, amount, reason);

        if (refundResult.success) {
            await payment.initiateRefund(amount || payment.amount, reason);
            
            res.json({
                success: true,
                message: 'Refund processed successfully',
                data: {
                    payment,
                    refundId: refundResult.refundId
                }
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Refund failed',
                error: refundResult.error
            });
        }

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Refund processing failed',
            error: error.message
        });
    }
};

// Get payment by order
exports.getPaymentByOrder = async (req, res) => {
    try {
        const order = await Order.findOne({ orderId: req.params.orderId });
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const payment = await Payment.findOne({ order: order._id })
            .populate('order', 'orderId total items');

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found for this order'
            });
        }

        res.json({
            success: true,
            data: payment
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payment',
            error: error.message
        });
    }
};