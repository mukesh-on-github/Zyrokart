const Order = require('../models/Order');
const Product = require('../models/Product');
const Cart = require('../models/Cart');

// Create new order
exports.createOrder = async (req, res) => {
    try {
        const { 
            shippingAddress, 
            paymentMethod, 
            items,
            cartId 
        } = req.body;

        const userId = req.user.id;

        // Items validation
        if (!items || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Order must contain at least one item'
            });
        }

        // Check product availability and calculate totals
        let subtotal = 0;
        const orderItems = [];

        for (let item of items) {
            const product = await Product.findById(item.product);
            
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: `Product not found: ${item.product}`
                });
            }
            
            if (product.stock < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for ${product.name}`
                });
            }

            subtotal += product.price * item.quantity;
            
            orderItems.push({
                product: product._id,
                name: product.name,
                price: product.price,
                quantity: item.quantity,
                image: product.images[0]?.url || ''
            });
        }

        // Calculate final amounts
        const shippingFee = subtotal > 500 ? 0 : 40;
        const tax = Math.round(subtotal * 0.18); // 18% GST
        const total = subtotal + shippingFee + tax;

        // Create Order
        const order = new Order({
            user: userId,
            items: orderItems,
            shippingAddress,
            paymentMethod,
            subtotal,
            shippingFee,
            tax,
            total,
            orderStatus: 'pending'
        });

        await order.save();

        // Reduce stock
        for (let item of orderItems) {
            await Product.findByIdAndUpdate(item.product, {
                $inc: { stock: -item.quantity }
            });
        }

        // Clear Cart if cartId provided
        if (cartId) {
            await Cart.findByIdAndUpdate(cartId, { 
                $set: { items: [], total: 0 } 
            });
        }

        res.status(201).json({
            success: true,
            message: 'Order placed successfully',
            data: order
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Order creation failed',
            error: error.message
        });
    }
};

// Get user orders
exports.getUserOrders = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user.id })
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: orders.length,
            data: orders
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders',
            error: error.message
        });
    }
};

// Get order by ID
exports.getOrderById = async (req, res) => {
    try {
        const order = await Order.findOne({ 
            orderId: req.params.orderId,
            user: req.user.id 
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.json({
            success: true,
            data: order
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order',
            error: error.message
        });
    }
};

// Cancel Order
exports.cancelOrder = async (req, res) => {
    try {
        const order = await Order.findOne({ 
            orderId: req.params.orderId,
            user: req.user.id 
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        if (['shipped', 'delivered', 'cancelled'].includes(order.orderStatus)) {
            return res.status(400).json({
                success: false,
                message: 'Order cannot be cancelled at this stage'
            });
        }

        order.orderStatus = 'cancelled';
        order.cancelledAt = new Date();
        order.cancellationReason = req.body.reason || 'User cancelled';
        
        await order.save();

        // Restore stock
        for (let item of order.items) {
            await Product.findByIdAndUpdate(item.product, {
                $inc: { stock: item.quantity }
            });
        }

        res.json({
            success: true,
            message: 'Order cancelled successfully',
            data: order
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to cancel order',
            error: error.message
        });
    }
};

// Track Order
exports.trackOrder = async (req, res) => {
    try {
        const order = await Order.findOne({ 
            orderId: req.params.orderId,
            user: req.user.id 
        });

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const trackingInfo = {
            orderId: order.orderId,
            status: order.orderStatus,
            timeline: [
                { status: 'Placed', date: order.createdAt, completed: true },
                { status: 'Confirmed', date: order.createdAt, completed: true },
                { status: 'Shipped', date: order.trackingNumber ? order.updatedAt : null, completed: !!order.trackingNumber },
                { status: 'Delivered', date: order.deliveredAt, completed: !!order.deliveredAt }
            ],
            carrier: order.carrier || 'Zyro Express',
            trackingNumber: order.trackingNumber,
            estimatedDelivery: order.estimatedDelivery
        };

        res.json({
            success: true,
            data: trackingInfo
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Tracking failed',
            error: error.message
        });
    }
};

// Admin: Get all orders
exports.getAllOrders = async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        let filter = {};
        
        if (status) filter.orderStatus = status;

        const orders = await Order.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Order.countDocuments(filter);

        res.json({
            success: true,
            count: orders.length,
            total,
            data: orders
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders',
            error: error.message
        });
    }
};

// Admin: Update order status
exports.updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findOne({ orderId: req.params.orderId });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        order.orderStatus = status;
        
        if (status === 'shipped') {
            order.trackingNumber = `TRK${Date.now()}`;
            order.carrier = 'Zyro Express'; // Updated carrier name
            order.estimatedDelivery = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days
        } else if (status === 'delivered') {
            order.deliveredAt = new Date();
        }

        await order.save();

        res.json({
            success: true,
            message: 'Order status updated successfully',
            data: order
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update order',
            error: error.message
        });
    }
};

// Admin: Update payment status
exports.updatePaymentStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findOne({ orderId: req.params.orderId });

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Logic to update payment record would go here
        // For now just success response
        res.json({
            success: true,
            message: `Payment marked as ${status}`,
            orderId: order.orderId
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update payment status',
            error: error.message
        });
    }
};