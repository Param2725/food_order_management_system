import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Calendar, AlertCircle, RefreshCw, TrendingUp, X } from 'lucide-react';
import AuthContext from '../context/AuthContext';
import NotificationContext from '../context/NotificationContext';

const MySubscription = () => {
    const { user } = useContext(AuthContext);
    const { showNotification } = useContext(NotificationContext);
    const navigate = useNavigate();

    const [subscription, setSubscription] = useState(null);
    const [availableUpgrades, setAvailableUpgrades] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingRenew, setProcessingRenew] = useState(false);
    const [processingUpgrade, setProcessingUpgrade] = useState(false);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        fetchSubscriptionData();
    }, [user]);

    const fetchSubscriptionData = async () => {
        setLoading(true);
        try {
            const config = {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            };

            // Fetch current subscription
            const subRes = await axios.get('http://localhost:5000/api/subscriptions/me', config);
            setSubscription(subRes.data);

            // Fetch available upgrades
            const upgradeRes = await axios.get('http://localhost:5000/api/subscriptions/available-upgrades', config);
            setAvailableUpgrades(upgradeRes.data.availableUpgrades || []);

        } catch (error) {
            if (error.response?.status === 404) {
                setSubscription(null);
                showNotification('You do not have an active subscription', 'info');
            } else {
                console.error('Error fetching subscription:', error);
                showNotification('Failed to load subscription data', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRenew = async () => {
        if (!subscription) return;

        setProcessingRenew(true);
        try {
            const config = {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            };

            // Initiate renewal
            const { data: orderData } = await axios.post(
                'http://localhost:5000/api/subscriptions/renew-init',
                { subscriptionId: subscription._id },
                config
            );

            // Open Razorpay
            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_placeholder',
                amount: orderData.amount,
                currency: orderData.currency,
                name: "Payal's Kitchen",
                description: `Renew ${subscription.plan.name} Subscription`,
                order_id: orderData.orderId,
                handler: async function (response) {
                    try {
                        await axios.post(
                            'http://localhost:5000/api/subscriptions/renew-verify',
                            {
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                subscriptionId: orderData.subscriptionId,
                            },
                            config
                        );

                        showNotification('Subscription renewed successfully!', 'success');
                        fetchSubscriptionData();
                    } catch (error) {
                        console.error('Renewal verification failed:', error);
                        showNotification('Payment verification failed. Please contact support.', 'error');
                    }
                },
                prefill: {
                    name: user.name,
                    email: user.email,
                },
                theme: {
                    color: '#ea580c',
                },
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response) {
                showNotification(response.error.description, 'error');
            });
            rzp.open();

        } catch (error) {
            console.error('Error initiating renewal:', error);
            showNotification('Failed to initiate renewal', 'error');
        } finally {
            setProcessingRenew(false);
        }
    };

    const handleUpgrade = async (newPlan) => {
        setProcessingUpgrade(true);
        try {
            const config = {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            };

            // Initiate upgrade
            const { data: orderData } = await axios.post(
                'http://localhost:5000/api/subscriptions/upgrade-init',
                { newPlanId: newPlan._id },
                config
            );

            // Open Razorpay
            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_placeholder',
                amount: orderData.amount,
                currency: orderData.currency,
                name: "Payal's Kitchen",
                description: `Upgrade to ${newPlan.name} ${newPlan.duration}`,
                order_id: orderData.orderId,
                handler: async function (response) {
                    try {
                        await axios.post(
                            'http://localhost:5000/api/subscriptions/upgrade-verify',
                            {
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                currentSubscriptionId: orderData.currentSubscriptionId,
                                newPlanId: orderData.newPlanId,
                            },
                            config
                        );

                        showNotification('Subscription upgraded successfully!', 'success');
                        fetchSubscriptionData();
                    } catch (error) {
                        console.error('Upgrade verification failed:', error);
                        showNotification('Payment verification failed. Please contact support.', 'error');
                    }
                },
                prefill: {
                    name: user.name,
                    email: user.email,
                },
                theme: {
                    color: '#ea580c',
                },
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response) {
                showNotification(response.error.description, 'error');
            });
            rzp.open();

        } catch (error) {
            console.error('Error initiating upgrade:', error);
            showNotification(error.response?.data?.message || 'Failed to initiate upgrade', 'error');
        } finally {
            setProcessingUpgrade(false);
        }
    };

    const handleCancel = async () => {
        if (!subscription) return;

        if (!window.confirm('Are you sure you want to cancel your subscription? This action cannot be undone.')) {
            return;
        }

        try {
            const config = {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            };

            await axios.post(
                'http://localhost:5000/api/subscriptions/cancel',
                { subscriptionId: subscription._id },
                config
            );

            showNotification('Subscription cancelled successfully', 'success');
            fetchSubscriptionData();
        } catch (error) {
            console.error('Error cancelling subscription:', error);
            showNotification('Failed to cancel subscription', 'error');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
                    <p className="mt-4 text-gray-500">Loading subscription...</p>
                </div>
            </div>
        );
    }

    if (!subscription) {
        return (
            <div className="min-h-screen bg-gray-50 py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center">
                        <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-lg font-medium text-gray-900">No Active Subscription</h3>
                        <p className="mt-1 text-sm text-gray-500">You don't have an active subscription yet.</p>
                        <div className="mt-6">
                            <button
                                onClick={() => navigate('/plans')}
                                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700"
                            >
                                Browse Plans
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-3xl font-extrabold text-gray-900 mb-8">My Subscription</h2>

                {/* Current Subscription Card */}
                <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-8">
                    <div className="bg-gradient-to-r from-orange-500 to-red-600 px-6 py-4">
                        <h3 className="text-2xl font-bold text-white">
                            {subscription.plan.name} Plan ({subscription.plan.duration})
                        </h3>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-2 ${subscription.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                            {subscription.status}
                        </span>
                    </div>

                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            <div>
                                <p className="text-sm text-gray-500 flex items-center">
                                    <Calendar className="h-4 w-4 mr-1" /> Start Date
                                </p>
                                <p className="text-lg font-semibold text-gray-900">
                                    {new Date(subscription.startDate).toLocaleDateString('en-US', {
                                        weekday: 'long', month: 'short', day: 'numeric', year: 'numeric'
                                    })}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 flex items-center">
                                    <Calendar className="h-4 w-4 mr-1" /> Expiry Date
                                </p>
                                <p className="text-lg font-semibold text-gray-900">
                                    {new Date(subscription.endDate).toLocaleDateString('en-US', {
                                        weekday: 'long', month: 'short', day: 'numeric', year: 'numeric'
                                    })}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Price Paid</p>
                                <p className="text-lg font-semibold text-gray-900">₹{subscription.amountPaid}</p>
                            </div>
                        </div>

                        {subscription.status === 'Active' && (
                            <div className="flex flex-wrap gap-3">
                                <button
                                    onClick={handleRenew}
                                    disabled={processingRenew}
                                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                                >
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    {processingRenew ? 'Processing...' : 'Renew Subscription'}
                                </button>
                                <button
                                    onClick={handleCancel}
                                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                                >
                                    <X className="h-4 w-4 mr-2" />
                                    Cancel Subscription
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* No Refund Warning */}
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
                    <div className="flex">
                        <AlertCircle className="h-5 w-5 text-yellow-400" />
                        <div className="ml-3">
                            <p className="text-sm text-yellow-700 font-medium">
                                No refunds available on subscription purchases or upgrades.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Available Upgrades */}
                {availableUpgrades.length > 0 && subscription.status === 'Active' && (
                    <div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                            <TrendingUp className="h-6 w-6 mr-2 text-orange-600" />
                            Available Upgrades
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {availableUpgrades.map((plan) => (
                                <div key={plan._id} className="bg-white shadow-md rounded-lg overflow-hidden border-2 border-gray-200 hover:border-orange-500 transition-colors">
                                    <div className="p-6">
                                        <h4 className="text-xl font-bold text-gray-900 mb-2">
                                            {plan.name} Plan
                                        </h4>
                                        <p className="text-sm text-gray-600 mb-4 capitalize">{plan.duration}</p>

                                        <div className="mb-4">
                                            <p className="text-sm text-gray-500 line-through">Original: ₹{plan.originalPrice}</p>
                                            <p className="text-sm text-green-600">Discount: -₹{plan.discount}</p>
                                            <p className="text-2xl font-bold text-orange-600 mt-2">₹{plan.upgradePrice}</p>
                                            <p className="text-xs text-gray-500 mt-1">Upgrade price after discount</p>
                                        </div>

                                        <button
                                            onClick={() => handleUpgrade(plan)}
                                            disabled={processingUpgrade}
                                            className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50"
                                        >
                                            <TrendingUp className="h-4 w-4 mr-2" />
                                            {processingUpgrade ? 'Processing...' : 'Upgrade Now'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MySubscription;
