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
    const [loading, setLoading] = useState(true);
    const [availableUpgrades, setAvailableUpgrades] = useState([]);
    const [processingRenew, setProcessingRenew] = useState(false);
    const [processingUpgrade, setProcessingUpgrade] = useState(false);
    const [selectedUpgradePlan, setSelectedUpgradePlan] = useState(null);
    const [upgradeMealType, setUpgradeMealType] = useState('both');
    const [upgradeDeliveryAddress, setUpgradeDeliveryAddress] = useState({
        street: '',
        city: '',
        zip: '',
        country: 'India'
    });

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

    const handleInitiateUpgrade = (plan) => {
        setSelectedUpgradePlan(plan);
        setUpgradeMealType('both');
        // Pre-fill address from current subscription if available
        if (subscription && subscription.deliveryAddress) {
            setUpgradeDeliveryAddress({
                street: subscription.deliveryAddress.street || '',
                city: subscription.deliveryAddress.city || '',
                zip: subscription.deliveryAddress.zip || '',
                country: subscription.deliveryAddress.country || 'India'
            });
        } else {
            setUpgradeDeliveryAddress({ street: '', city: '', zip: '', country: 'India' });
        }
    };

    const handleConfirmUpgrade = async () => {
        if (!selectedUpgradePlan) return;

        if (!upgradeDeliveryAddress.street || !upgradeDeliveryAddress.city || !upgradeDeliveryAddress.zip) {
            showNotification('Please fill in all address fields.', 'error');
            return;
        }

        // Calculate estimated upgrade price for validation (client-side check)
        let priceMultiplier = 1;
        if (upgradeMealType === 'lunch' || upgradeMealType === 'dinner') {
            priceMultiplier = 0.5;
        }
        const newPlanTotal = selectedUpgradePlan.price * priceMultiplier;
        const estimatedUpgradePrice = Math.max(0, newPlanTotal - subscription.amountPaid);

        if (estimatedUpgradePrice === 0 && newPlanTotal < subscription.amountPaid) {
            showNotification('Cannot downgrade to a cheaper plan option.', 'error');
            return;
        }

        setProcessingUpgrade(true);
        try {
            const config = {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            };

            // Initiate upgrade
            const { data: orderData } = await axios.post(
                'http://localhost:5000/api/subscriptions/upgrade-init',
                {
                    newPlanId: selectedUpgradePlan._id,
                    newMealType: upgradeMealType,
                    newDeliveryAddress: upgradeDeliveryAddress
                },
                config
            );

            // Open Razorpay
            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_placeholder',
                amount: orderData.amount,
                currency: orderData.currency,
                name: "Payal's Kitchen",
                description: `Upgrade to ${selectedUpgradePlan.name} ${selectedUpgradePlan.duration}`,
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
                                newMealType: upgradeMealType,
                                newDeliveryAddress: upgradeDeliveryAddress
                            },
                            config
                        );

                        showNotification('Subscription upgraded successfully!', 'success');
                        fetchSubscriptionData();
                        setSelectedUpgradePlan(null); // Close modal
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
        <div className="min-h-screen bg-gray-50 py-12 relative">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-3xl font-extrabold text-gray-900 mb-8">My Subscription</h2>

                {/* Current Subscription Card */}
                <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-8">
                    <div className="bg-gradient-to-r from-orange-500 to-red-600 px-6 py-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-2xl font-bold text-white">
                                {subscription.plan?.name || 'Unknown'} Plan ({subscription.plan?.duration || 'N/A'})
                            </h3>
                            <span className="bg-white text-orange-600 px-3 py-1 rounded-full text-sm font-bold shadow-sm">
                                {subscription.mealType === 'both' ? 'Lunch + Dinner' :
                                    subscription.mealType === 'lunch' ? 'Lunch Only' : 'Dinner Only'}
                            </span>
                        </div>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-2 ${subscription.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                            {subscription.status}
                        </span>
                    </div>

                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
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
                            <div>
                                <p className="text-sm text-gray-500">Delivery Address</p>
                                <p className="text-sm font-medium text-gray-900">
                                    {subscription.deliveryAddress ?
                                        `${subscription.deliveryAddress.street}, ${subscription.deliveryAddress.city}, ${subscription.deliveryAddress.zip}` :
                                        'Not provided'}
                                </p>
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
                                            <p className="text-sm text-gray-500">Base Price: ₹{plan.price}</p>
                                            <p className="text-xs text-gray-500 mt-1">Select meal options to see final upgrade price</p>
                                        </div>

                                        <button
                                            onClick={() => handleInitiateUpgrade(plan)}
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

            {/* Upgrade Modal */}
            {selectedUpgradePlan && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setSelectedUpgradePlan(null)}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start">
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                            Customize Upgrade
                                        </h3>
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-500 mb-4">
                                                Upgrade to: <span className="font-semibold">{selectedUpgradePlan.name} ({selectedUpgradePlan.duration})</span>
                                            </p>

                                            {/* Meal Type Selection */}
                                            <div className="mb-6">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Select Meal Option</label>
                                                <div className="space-y-2">
                                                    <div className="flex items-center">
                                                        <input
                                                            id="upgrade-both"
                                                            name="upgradeMealType"
                                                            type="radio"
                                                            checked={upgradeMealType === 'both'}
                                                            onChange={() => setUpgradeMealType('both')}
                                                            className="focus:ring-orange-500 h-4 w-4 text-orange-600 border-gray-300"
                                                        />
                                                        <label htmlFor="upgrade-both" className="ml-3 block text-sm font-medium text-gray-700">
                                                            Both (Lunch + Dinner) - <span className="font-bold">₹{selectedUpgradePlan.price}</span>
                                                        </label>
                                                    </div>
                                                    <div className="flex items-center">
                                                        <input
                                                            id="upgrade-lunch"
                                                            name="upgradeMealType"
                                                            type="radio"
                                                            checked={upgradeMealType === 'lunch'}
                                                            onChange={() => setUpgradeMealType('lunch')}
                                                            className="focus:ring-orange-500 h-4 w-4 text-orange-600 border-gray-300"
                                                        />
                                                        <label htmlFor="upgrade-lunch" className="ml-3 block text-sm font-medium text-gray-700">
                                                            Lunch Only - <span className="font-bold">₹{selectedUpgradePlan.price * 0.5}</span>
                                                        </label>
                                                    </div>
                                                    <div className="flex items-center">
                                                        <input
                                                            id="upgrade-dinner"
                                                            name="upgradeMealType"
                                                            type="radio"
                                                            checked={upgradeMealType === 'dinner'}
                                                            onChange={() => setUpgradeMealType('dinner')}
                                                            className="focus:ring-orange-500 h-4 w-4 text-orange-600 border-gray-300"
                                                        />
                                                        <label htmlFor="upgrade-dinner" className="ml-3 block text-sm font-medium text-gray-700">
                                                            Dinner Only - <span className="font-bold">₹{selectedUpgradePlan.price * 0.5}</span>
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Address Input */}
                                            <div className="mb-4">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Address</label>
                                                <div className="space-y-3">
                                                    <input
                                                        type="text"
                                                        placeholder="Street Address"
                                                        value={upgradeDeliveryAddress.street}
                                                        onChange={(e) => setUpgradeDeliveryAddress({ ...upgradeDeliveryAddress, street: e.target.value })}
                                                        className="shadow-sm focus:ring-orange-500 focus:border-orange-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                                    />
                                                    <div className="flex space-x-2">
                                                        <input
                                                            type="text"
                                                            placeholder="City"
                                                            value={upgradeDeliveryAddress.city}
                                                            onChange={(e) => setUpgradeDeliveryAddress({ ...upgradeDeliveryAddress, city: e.target.value })}
                                                            className="shadow-sm focus:ring-orange-500 focus:border-orange-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder="ZIP Code"
                                                            value={upgradeDeliveryAddress.zip}
                                                            onChange={(e) => setUpgradeDeliveryAddress({ ...upgradeDeliveryAddress, zip: e.target.value })}
                                                            className="shadow-sm focus:ring-orange-500 focus:border-orange-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Price Summary */}
                                            <div className="bg-gray-50 p-3 rounded-md mb-4">
                                                <div className="flex justify-between text-sm">
                                                    <span>New Plan Total:</span>
                                                    <span className="font-semibold">₹{(selectedUpgradePlan.price * (upgradeMealType === 'both' ? 1 : 0.5))}</span>
                                                </div>
                                                <div className="flex justify-between text-sm text-green-600">
                                                    <span>Less Amount Paid:</span>
                                                    <span>-₹{subscription.amountPaid}</span>
                                                </div>
                                                <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between font-bold text-lg">
                                                    <span>Upgrade Cost:</span>
                                                    <span>₹{Math.max(0, (selectedUpgradePlan.price * (upgradeMealType === 'both' ? 1 : 0.5)) - subscription.amountPaid)}</span>
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                <button
                                    type="button"
                                    onClick={handleConfirmUpgrade}
                                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-orange-600 text-base font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:ml-3 sm:w-auto sm:text-sm"
                                >
                                    Proceed to Payment
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedUpgradePlan(null)}
                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MySubscription;
