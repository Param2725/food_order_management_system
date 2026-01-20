import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { Check, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import NotificationContext from '../context/NotificationContext';

const Plans = () => {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentSubscription, setCurrentSubscription] = useState(null);
    const { user } = useContext(AuthContext);
    const { showNotification } = useContext(NotificationContext);
    const navigate = useNavigate();

    const [selectedPlan, setSelectedPlan] = useState(null);
    const [mealType, setMealType] = useState('both');
    const [deliveryAddress, setDeliveryAddress] = useState({
        street: '',
        city: '',
        zip: '',
        country: 'India'
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/plans');
                setPlans(res.data);

                // Fetch current subscription if user is logged in
                if (user) {
                    try {
                        const config = {
                            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                        };
                        const subRes = await axios.get('http://localhost:5000/api/subscriptions/me', config);
                        setCurrentSubscription(subRes.data);
                    } catch (error) {
                        // No active subscription, that's okay
                        setCurrentSubscription(null);
                    }
                }

                setLoading(false);
            } catch (error) {
                console.error('Error fetching plans:', error);
                setLoading(false);
                showNotification('Failed to load plans', 'error');
            }
        };

        fetchData();

        // Load Razorpay script
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, [user]);

    const handleInitiateSubscribe = (plan) => {
        if (!user) {
            navigate('/login');
            return;
        }

        // Check if user already has this exact subscription
        if (currentSubscription && currentSubscription.plan._id === plan._id) {
            showNotification('You already have this subscription active!', 'error');
            return;
        }

        // Check if user has active subscription and is trying to downgrade
        if (currentSubscription) {
            const tierMap = { 'Basic': 1, 'Premium': 2, 'Exotic': 3 };
            const durationMap = { 'monthly': 1, 'yearly': 2 };

            const currentTier = tierMap[currentSubscription.plan.name] || 0;
            const newTier = tierMap[plan.name] || 0;
            const currentDuration = durationMap[currentSubscription.plan.duration] || 0;
            const newDuration = durationMap[plan.duration] || 0;

            const isHigherTier = newTier > currentTier;
            const isSameTierLongerDuration = (newTier === currentTier) && (newDuration > currentDuration);

            if (!isHigherTier && !isSameTierLongerDuration) {
                showNotification('You can only upgrade to a higher tier or longer duration. Use "My Subscription" page to upgrade.', 'error');
                return;
            }

            // If valid upgrade, show message
            showNotification('This is an upgrade! You will be charged the difference.', 'info');
        }

        setSelectedPlan(plan);
        setMealType('both'); // Default
        setDeliveryAddress({ street: '', city: '', zip: '', country: 'India' });
    };

    const handleConfirmSubscribe = async () => {
        if (!selectedPlan) return;

        if (!deliveryAddress.street || !deliveryAddress.city || !deliveryAddress.zip) {
            showNotification('Please fill in all address fields.', 'error');
            return;
        }

        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            };

            // 1. Create Order
            const { data: orderData } = await axios.post(
                'http://localhost:5000/api/subscriptions',
                {
                    planId: selectedPlan._id,
                    mealType: mealType,
                    deliveryAddress: deliveryAddress
                },
                config
            );

            // 2. Open Razorpay Checkout
            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_placeholder',
                amount: orderData.amount,
                currency: orderData.currency,
                name: "Payal's Kitchen",
                description: `Subscription - ${selectedPlan.name} (${mealType})`,
                order_id: orderData.orderId,
                handler: async function (response) {
                    try {
                        // 3. Verify Payment
                        await axios.post(
                            'http://localhost:5000/api/subscriptions/verify',
                            {
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                planId: selectedPlan._id,
                                mealType: mealType,
                                deliveryAddress: deliveryAddress
                            },
                            config
                        );
                        showNotification('Subscription successful! Redirecting...', 'success');
                        navigate('/my-subscription');
                    } catch (error) {
                        console.error('Payment verification failed:', error);
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

            const rzp1 = new window.Razorpay(options);
            rzp1.on('payment.failed', function (response) {
                showNotification(response.error.description, 'error');
            });
            rzp1.open();
            setSelectedPlan(null); // Close modal

        } catch (error) {
            console.error('Error initiating subscription:', error);
            showNotification('Failed to initiate subscription. Please try again.', 'error');
        }
    };

    if (loading) {
        return <div className="text-center py-10">Loading plans...</div>;
    }

    // Filter and sort plans
    const monthlyPlans = plans
        .filter(plan => plan.duration === 'monthly')
        .sort((a, b) => a.price - b.price);

    const yearlyPlans = plans
        .filter(plan => plan.duration === 'yearly')
        .sort((a, b) => a.price - b.price);

    const PlanCard = ({ plan }) => {
        const isCurrent = currentSubscription && currentSubscription.plan._id === plan._id;

        return (
            <div key={plan._id} className={`border rounded-lg shadow-sm divide-y divide-gray-200 bg-white flex flex-col hover:shadow-lg transition-shadow duration-300 ${isCurrent ? 'border-orange-500 border-2' : 'border-gray-200'}`}>
                <div className="p-6">
                    {isCurrent && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 mb-2">
                            Current Plan
                        </span>
                    )}
                    <h3 className="text-lg leading-6 font-medium text-gray-900">{plan.name}</h3>
                    <p className="mt-4 text-sm text-gray-500">{plan.description}</p>
                    <p className="mt-8">
                        <span className="text-4xl font-extrabold text-gray-900">₹{plan.price}</span>
                        <span className="text-base font-medium text-gray-500">/{plan.duration}</span>
                    </p>
                    <button
                        type="button"
                        onClick={() => handleInitiateSubscribe(plan)}
                        disabled={isCurrent}
                        className={`mt-8 block w-full border border-transparent rounded-md py-2 text-sm font-semibold text-white text-center transition-colors duration-200 ${isCurrent
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-orange-600 hover:bg-orange-700'
                            }`}
                    >
                        {isCurrent ? 'Current Plan' : 'Subscribe Now'}
                    </button>
                </div>
                <div className="pt-6 pb-8 px-6 flex-grow">
                    <h4 className="text-sm font-medium text-gray-900 tracking-wide uppercase">What's included</h4>
                    <ul className="mt-6 space-y-4">
                        {plan.features.map((feature, index) => (
                            <li key={index} className="flex space-x-3">
                                <Check className="flex-shrink-0 h-5 w-5 text-green-500" aria-hidden="true" />
                                <span className="text-sm text-gray-500">{feature}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-gray-50 py-12 relative">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                        Choose Your Plan
                    </h2>
                    <p className="mt-4 text-xl text-gray-500">
                        Flexible subscription options tailored to your needs.
                    </p>
                </div>

                {/* No Refund Warning */}
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8 max-w-4xl mx-auto">
                    <div className="flex">
                        <AlertCircle className="h-5 w-5 text-yellow-400" />
                        <div className="ml-3">
                            <p className="text-sm text-yellow-700 font-medium">
                                Important: No refunds available on subscription purchases or upgrades.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Monthly Plans Section */}
                <div className="mb-16">
                    <h3 className="text-2xl font-bold text-gray-900 mb-6 border-b pb-2 border-gray-200">Monthly Plans</h3>
                    <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:mx-0 xl:grid-cols-3">
                        {monthlyPlans.map(plan => <PlanCard key={plan._id} plan={plan} />)}
                    </div>
                </div>

                {/* Yearly Plans Section */}
                <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-6 border-b pb-2 border-gray-200">Yearly Plans <span className="text-sm font-normal text-green-600 ml-2">(Best Value: 2 Months Free!)</span></h3>
                    <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:mx-0 xl:grid-cols-3">
                        {yearlyPlans.map(plan => <PlanCard key={plan._id} plan={plan} />)}
                    </div>
                </div>
            </div>

            {/* Meal Selection Modal */}
            {selectedPlan && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setSelectedPlan(null)}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start">
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                            Customize Your Subscription
                                        </h3>
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-500 mb-4">
                                                Plan: <span className="font-semibold">{selectedPlan.name} ({selectedPlan.duration})</span>
                                            </p>

                                            {/* Meal Type Selection */}
                                            <div className="mb-6">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Select Meal Option</label>
                                                <div className="space-y-2">
                                                    <div className="flex items-center">
                                                        <input
                                                            id="both"
                                                            name="mealType"
                                                            type="radio"
                                                            checked={mealType === 'both'}
                                                            onChange={() => setMealType('both')}
                                                            className="focus:ring-orange-500 h-4 w-4 text-orange-600 border-gray-300"
                                                        />
                                                        <label htmlFor="both" className="ml-3 block text-sm font-medium text-gray-700">
                                                            Both (Lunch + Dinner) - <span className="font-bold">₹{selectedPlan.price}</span>
                                                        </label>
                                                    </div>
                                                    <div className="flex items-center">
                                                        <input
                                                            id="lunch"
                                                            name="mealType"
                                                            type="radio"
                                                            checked={mealType === 'lunch'}
                                                            onChange={() => setMealType('lunch')}
                                                            className="focus:ring-orange-500 h-4 w-4 text-orange-600 border-gray-300"
                                                        />
                                                        <label htmlFor="lunch" className="ml-3 block text-sm font-medium text-gray-700">
                                                            Lunch Only - <span className="font-bold">₹{selectedPlan.price * 0.5}</span>
                                                        </label>
                                                    </div>
                                                    <div className="flex items-center">
                                                        <input
                                                            id="dinner"
                                                            name="mealType"
                                                            type="radio"
                                                            checked={mealType === 'dinner'}
                                                            onChange={() => setMealType('dinner')}
                                                            className="focus:ring-orange-500 h-4 w-4 text-orange-600 border-gray-300"
                                                        />
                                                        <label htmlFor="dinner" className="ml-3 block text-sm font-medium text-gray-700">
                                                            Dinner Only - <span className="font-bold">₹{selectedPlan.price * 0.5}</span>
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
                                                        value={deliveryAddress.street}
                                                        onChange={(e) => setDeliveryAddress({ ...deliveryAddress, street: e.target.value })}
                                                        className="shadow-sm focus:ring-orange-500 focus:border-orange-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                                    />
                                                    <div className="flex space-x-2">
                                                        <input
                                                            type="text"
                                                            placeholder="City"
                                                            value={deliveryAddress.city}
                                                            onChange={(e) => setDeliveryAddress({ ...deliveryAddress, city: e.target.value })}
                                                            className="shadow-sm focus:ring-orange-500 focus:border-orange-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder="ZIP Code"
                                                            value={deliveryAddress.zip}
                                                            onChange={(e) => setDeliveryAddress({ ...deliveryAddress, zip: e.target.value })}
                                                            className="shadow-sm focus:ring-orange-500 focus:border-orange-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                <button
                                    type="button"
                                    onClick={handleConfirmSubscribe}
                                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-orange-600 text-base font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:ml-3 sm:w-auto sm:text-sm"
                                >
                                    Proceed to Payment
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedPlan(null)}
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

export default Plans;
