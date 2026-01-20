const Order = require('../models/Order');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = async (req, res) => {
    const {
        items,
        totalAmount,
        type,
        deliveryDate,
        deliveryAddress,

        paymentId,
        discountAmount,
        couponCode
    } = req.body;

    if (!items || items.length === 0) {
        return res.status(400).json({ message: 'No order items' });
    }

    // Cutoff validation
    const now = new Date();
    const delivery = new Date(deliveryDate);

    // Check for Event orders (48 hours)
    if (type === 'event') {
        const diffInHours = (delivery - now) / 1000 / 60 / 60;
        if (diffInHours < 48) {
            return res.status(400).json({ message: 'Event orders must be placed at least 48 hours in advance.' });
        }
    }
    // Check for Single Tiffin orders (12 hours based on Meal Time)
    else if (type === 'single') {
        // We need to check each item's meal time if available, or assume based on something else.
        // Since deliveryDate is just the date, we need to combine it with meal times.
        // Lunch: 12:00 PM, Dinner: 08:00 PM (20:00)

        for (const item of items) {
            if (item.mealTime) {
                const itemTargetTime = new Date(delivery);
                if (item.mealTime === 'Lunch') {
                    itemTargetTime.setHours(12, 0, 0, 0);
                } else if (item.mealTime === 'Dinner') {
                    itemTargetTime.setHours(20, 0, 0, 0);
                }

                const diffInHours = (itemTargetTime - now) / 1000 / 60 / 60;
                if (diffInHours < 12) {
                    return res.status(400).json({
                        message: `${item.mealTime} orders must be placed at least 12 hours in advance. Deadline passed for ${itemTargetTime.toLocaleDateString()}.`
                    });
                }
            }
        }
    }

    try {
        const order = new Order({
            user: req.user._id,
            items,
            totalAmount,
            type,
            deliveryDate,
            deliveryAddress,
            paymentId: paymentId || 'DUMMY_PAYMENT_ID',
            paymentStatus: 'Paid', // Assuming immediate payment for now
            status: 'Pending', // Wait for Admin approval
            discountAmount: discountAmount || 0,
            couponCode: couponCode || null
        });

        const createdOrder = await order.save();
        res.status(201).json(createdOrder);
    } catch (error) {
        res.status(400).json({ message: 'Invalid order data', error: error.message });
    }
};

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
const getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .populate('subscription');
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate('user', 'name email');

        if (order) {
            // Check if user is owner or admin/employee
            if (
                order.user._id.toString() === req.user._id.toString() ||
                req.user.role === 'admin' ||
                req.user.role === 'employee'
            ) {
                res.json(order);
            } else {
                res.status(401).json({ message: 'Not authorized to view this order' });
            }
        } else {
            res.status(404).json({ message: 'Order not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin/Employee
const updateOrderStatus = async (req, res) => {
    const { status } = req.body;

    try {
        const order = await Order.findById(req.params.id);

        if (order) {
            order.status = status;
            const updatedOrder = await order.save();
            res.json(updatedOrder);
        } else {
            res.status(404).json({ message: 'Order not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get all orders (Admin/Employee)
// @route   GET /api/orders
// @access  Private/Admin/Employee
const getOrders = async (req, res) => {
    try {
        const orders = await Order.find({}).populate('user', 'id name').sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create Razorpay Order for Cart
// @route   POST /api/orders/razorpay
// @access  Private
const createRazorpayOrder = async (req, res) => {
    const { amount } = req.body;

    try {
        const options = {
            amount: Math.round(amount * 100), // Amount in paise, rounded to nearest integer
            currency: 'INR',
            receipt: `receipt_cart_${Date.now()}`,
        };

        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        const order = await razorpay.orders.create(options);

        res.json({
            id: order.id,
            currency: order.currency,
            amount: order.amount,
        });
    } catch (error) {
        console.error('Error creating Razorpay order:', error);
        res.status(500).json({ message: 'Error creating payment order', error: error.message });
    }
};

// @desc    Verify Payment for Cart
// @route   POST /api/orders/verify
// @access  Private
const verifyPayment = async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    try {
        const body = razorpay_order_id + '|' + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ message: 'Invalid payment signature' });
        }

        res.json({ message: 'Payment verified successfully', paymentId: razorpay_payment_id });
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Cancel Order (User)
// @route   PUT /api/orders/:id/cancel
// @access  Private (User can cancel their own orders)
const cancelOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Check if user owns this order
        if (order.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized to cancel this order' });
        }

        // Only allow cancellation for event and single tiffin orders
        if (order.type !== 'event' && order.type !== 'single') {
            return res.status(400).json({ message: 'Only event and custom tiffin orders can be cancelled' });
        }

        // Cannot cancel already cancelled or delivered orders
        if (order.status === 'Cancelled') {
            return res.status(400).json({ message: 'Order is already cancelled' });
        }

        if (order.status === 'Delivered') {
            return res.status(400).json({ message: 'Cannot cancel delivered orders' });
        }

        // Calculate refund (80% of total amount, 20% cancellation fee)
        const cancellationFee = order.totalAmount * 0.20;
        const refundAmount = order.totalAmount * 0.80;

        // Update order status
        order.status = 'Cancelled';
        await order.save();

        res.json({
            message: 'Order cancelled successfully',
            refundAmount: refundAmount,
            cancellationFee: cancellationFee,
            order
        });

    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    createOrder,
    getMyOrders,
    getOrderById,
    updateOrderStatus,
    getOrders,
    createRazorpayOrder,
    verifyPayment,
    cancelOrder,
};
