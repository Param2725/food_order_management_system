import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AlertCircle } from 'lucide-react';
import AuthContext from '../context/AuthContext';
import NotificationContext from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';

const Orders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useContext(AuthContext);
    const { showNotification } = useContext(NotificationContext);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const config = {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                };
                const res = await axios.get('http://localhost:5000/api/orders/myorders', config);
                setOrders(res.data);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching orders:', error);
                setLoading(false);
                showNotification('Failed to fetch orders', 'error');
            }
        };

        if (user) {
            fetchOrders();
        }

        // Load Razorpay script
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, [user]);

    const handleCancelOrder = async (orderId, totalAmount) => {
        // Calculate refund amount (80% after 20% cancellation fee)
        const cancellationFee = totalAmount * 0.20;
        const refundAmount = totalAmount * 0.80;

        const confirmMessage = `⚠️ Cancellation Fee: 20% (₹${cancellationFee.toFixed(2)})\n\n` +
            `You will receive ₹${refundAmount.toFixed(2)} refund to your bank account.\n\n` +
            `Are you sure you want to cancel this order?`;

        if (!window.confirm(confirmMessage)) return;

        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            };

            const response = await axios.put(
                `http://localhost:5000/api/orders/${orderId}/cancel`,
                {},
                config
            );

            showNotification(
                `Order cancelled. ₹${response.data.refundAmount.toFixed(2)} sent to your bank account`,
                'success'
            );

            // Refresh orders
            const res = await axios.get('http://localhost:5000/api/orders/myorders', config);
            setOrders(res.data);
        } catch (error) {
            console.error('Error cancelling order:', error);
            showNotification(
                error.response?.data?.message || 'Failed to cancel order',
                'error'
            );
        }
    };

    if (loading) {
        return <div className="text-center py-10">Loading orders...</div>;
    }

    // Filter out subscription orders (they have their own page now)
    const filteredOrders = orders.filter(order =>
        order.type !== 'subscription_purchase' &&
        order.type !== 'subscription_upgrade'
    );

    return (
        <div className="bg-gray-50 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-3xl font-extrabold text-gray-900 mb-4">Order History</h2>

                {/* Cancellation Policy Warning */}
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
                    <div className="flex">
                        <AlertCircle className="h-5 w-5 text-yellow-400" />
                        <div className="ml-3">
                            <p className="text-sm text-yellow-700 font-medium">
                                Cancellation Policy: Canceling an order will cost -20% of the total amount.
                            </p>
                        </div>
                    </div>
                </div>

                {filteredOrders.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">No orders found.</div>
                ) : (
                    <div className="space-y-6">
                        {filteredOrders.map((order) => (
                            <div key={order._id} className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
                                <div className="px-4 py-5 sm:px-6 flex justify-between items-center bg-gray-50">
                                    <div>
                                        <h3 className="text-lg leading-6 font-medium text-gray-900">
                                            Order #{order._id.slice(-6).toUpperCase()}
                                        </h3>
                                        <p className="mt-1 max-w-2xl text-sm text-gray-500">
                                            Placed on {new Date(order.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${order.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                                            order.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                                                'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {order.status}
                                        </span>

                                        {/* Cancel Button for Event and Single Tiffin Orders */}
                                        {(order.type === 'event' || order.type === 'single') &&
                                            order.status !== 'Cancelled' &&
                                            order.status !== 'Delivered' && (
                                                <button
                                                    onClick={() => handleCancelOrder(order._id, order.totalAmount)}
                                                    className="ml-4 px-3 py-1 border border-red-600 text-red-600 rounded-md text-sm hover:bg-red-50 transition-colors"
                                                >
                                                    Cancel Order
                                                </button>
                                            )}
                                    </div>
                                </div>
                                <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                                    <dl className="sm:divide-y sm:divide-gray-200">
                                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                            <dt className="text-sm font-medium text-gray-500">Items</dt>
                                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                                <ul className="border border-gray-200 rounded-md divide-y divide-gray-200">
                                                    {order.items.map((item, idx) => (
                                                        <li key={idx} className="pl-3 pr-4 py-3 flex items-center justify-between text-sm">
                                                            <div className="w-0 flex-1 flex items-center">
                                                                <span className="ml-2 flex-1 w-0 truncate">
                                                                    {item.quantity}x {item.name}
                                                                    {item.selectedItems && item.selectedItems.length > 0 && (
                                                                        <div className="mt-1 text-xs text-gray-500">
                                                                            Menu: {item.selectedItems.join(', ')}
                                                                        </div>
                                                                    )}
                                                                </span>
                                                            </div>
                                                            <div className="ml-4 flex-shrink-0">
                                                                ₹{item.price * item.quantity}
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </dd>
                                        </div>
                                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                            <dt className="text-sm font-medium text-gray-500">Total Amount</dt>
                                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 font-bold">
                                                ₹{order.totalAmount}
                                            </dd>
                                        </div>
                                        {/* Show Subscription Status if applicable */}
                                        {order.type === 'subscription_purchase' && order.subscription && (
                                            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                                <dt className="text-sm font-medium text-gray-500">Subscription Status</dt>
                                                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                                    <span className={`font-semibold ${order.subscription.status === 'Active' ? 'text-green-600' : 'text-red-600'
                                                        }`}>
                                                        {order.subscription.status}
                                                    </span>
                                                    <span className="text-gray-500 ml-2">
                                                        (Ends: {new Date(order.subscription.endDate).toLocaleDateString()})
                                                    </span>
                                                </dd>
                                            </div>
                                        )}
                                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                            <dt className="text-sm font-medium text-gray-500">Delivery Date</dt>
                                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                                {new Date(order.deliveryDate).toLocaleDateString()}
                                            </dd>
                                        </div>
                                    </dl>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Orders;
