const express = require('express');
const router = express.Router();
const {
    createOrder,
    getMyOrders,
    getOrderById,
    updateOrderStatus,
    getOrders,
    createRazorpayOrder,
    verifyPayment,
    cancelOrder,
} = require('../controllers/orderController');
const { protect, admin, employee } = require('../middleware/authMiddleware');

router.route('/').post(protect, createOrder).get(protect, employee, getOrders);
router.route('/myorders').get(protect, getMyOrders);
router.route('/:id').get(protect, getOrderById);
router.route('/:id/status').put(protect, employee, updateOrderStatus);
router.route('/:id/cancel').put(protect, cancelOrder);
router.route('/razorpay').post(protect, createRazorpayOrder);
router.route('/verify').post(protect, verifyPayment);

module.exports = router;
