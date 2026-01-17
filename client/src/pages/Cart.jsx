import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CartContext from '../context/CartContext';
import AuthContext from '../context/AuthContext';
import NotificationContext from '../context/NotificationContext';
import axios from 'axios';
import { Trash2, Plus, Minus, Tag, X, MapPin, CheckCircle } from 'lucide-react';

const Cart = () => {
    const { cartItems, removeFromCart, updateQuantity, getCartTotal, clearCart } = useContext(CartContext);
    const { user } = useContext(AuthContext);
    const { showNotification } = useContext(NotificationContext);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Coupon State
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [availableCoupons, setAvailableCoupons] = useState([]);
    const [couponError, setCouponError] = useState('');
    const [couponSuccess, setCouponSuccess] = useState('');

    // Address State
    const [selectedAddressIndex, setSelectedAddressIndex] = useState(-1); // -1 for custom/new, >=0 for saved
    const [deliveryAddress, setDeliveryAddress] = useState({
        street: '',
        city: '',
        zip: ''
    });
    const [isCustomAddress, setIsCustomAddress] = useState(false);

    useEffect(() => {
        // Load Razorpay script
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);

        // Fetch active coupons
        fetchCoupons();

        return () => {
            document.body.removeChild(script);
        };
    }, []);

    useEffect(() => {
        if (user && user.addresses && user.addresses.length > 0) {
            // Default to the first address
            setSelectedAddressIndex(0);
            setDeliveryAddress(user.addresses[0]);
        } else {
            setIsCustomAddress(true);
        }
    }, [user]);

    const fetchCoupons = async () => {
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            };
            const { data } = await axios.get('http://localhost:5000/api/coupons/active', config);
            setAvailableCoupons(data);
        } catch (error) {
            console.error('Error fetching coupons:', error);
        }
    };

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;
        setCouponError('');
        setCouponSuccess('');

        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            };
            const { data } = await axios.post(
                'http://localhost:5000/api/coupons/validate',
                { code: couponCode },
                config
            );

            setAppliedCoupon(data);
            setCouponSuccess(`Coupon '${data.code}' applied! You save ${data.discountPercentage}%`);
            setCouponCode('');
        } catch (error) {
            setCouponError(error.response?.data?.message || 'Invalid coupon');
            setAppliedCoupon(null);
        }
    };

    const handleRemoveCoupon = () => {
        setAppliedCoupon(null);
        setCouponSuccess('');
        setCouponError('');
        setCouponCode('');
    };

    const calculateDiscount = (subtotal) => {
        if (!appliedCoupon) return 0;
        return Math.round((subtotal * appliedCoupon.discountPercentage) / 100);
    };

    const handleAddressSelection = (index) => {
        setSelectedAddressIndex(index);
        if (index === -1) {
            setIsCustomAddress(true);
            setDeliveryAddress({ street: '', city: '', zip: '' });
        } else {
            setIsCustomAddress(false);
            setDeliveryAddress(user.addresses[index]);
        }
    };

    const handleCustomAddressChange = (e) => {
        setDeliveryAddress({ ...deliveryAddress, [e.target.name]: e.target.value });
    };

    const handleCheckout = async () => {
        if (!user) {
            navigate('/login');
            return;
        }

        if (!deliveryAddress.street || !deliveryAddress.city || !deliveryAddress.zip) {
            setError('Please provide a complete delivery address.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const total = getCartTotal();
            const delivery = cartItems.reduce((acc, item) => acc + (item.deliveryCharge || 0), 0);
            const subtotal = total - delivery;
            const discountAmount = calculateDiscount(subtotal);
            const finalTotal = total - discountAmount;

            // 1. Create Razorpay Order
            const config = {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            };

            const { data: orderData } = await axios.post(
                'http://localhost:5000/api/orders/razorpay',
                { amount: finalTotal },
                config
            );

            // 2. Open Razorpay Checkout
            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_placeholder',
                amount: orderData.amount,
                currency: orderData.currency,
                name: "Payal's Kitchen",
                description: "Order Payment",
                order_id: orderData.id,
                handler: async function (response) {
                    try {
                        // 3. Verify Payment
                        await axios.post(
                            'http://localhost:5000/api/orders/verify',
                            {
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                            },
                            config
                        );

                        // 4. Create Database Order
                        const hasEvent = cartItems.some(item => item.type === 'event');
                        const orderType = hasEvent ? 'event' : 'single';

                        const dbOrderItems = cartItems.map(item => {
                            if (item.type === 'event') {
                                return {
                                    name: `Event Catering (${item.guestCount} Guests)`,
                                    quantity: 1,
                                    price: item.totalAmount,
                                    selectedItems: item.items.map(i => i.name)
                                };
                            } else if (item.type === 'single_tiffin') {
                                return {
                                    name: item.name,
                                    quantity: item.quantity,
                                    price: item.price, // Per-unit price, not total
                                    selectedItems: item.menuItems,
                                    mealTime: item.mealTime
                                };
                            } else {
                                return {
                                    name: item.name,
                                    quantity: item.quantity,
                                    price: item.price
                                };
                            }
                        });

                        let deliveryDate = new Date();
                        const itemWithDate = cartItems.find(item => item.deliveryDate);
                        if (itemWithDate) {
                            deliveryDate = new Date(itemWithDate.deliveryDate);
                        } else {
                            deliveryDate.setDate(deliveryDate.getDate() + 1);
                        }

                        const finalOrderData = {
                            items: dbOrderItems,
                            totalAmount: finalTotal,
                            type: orderType,
                            deliveryDate: deliveryDate,
                            deliveryAddress: deliveryAddress, // Use the selected address
                            paymentId: response.razorpay_payment_id,
                            paymentStatus: 'Paid',
                            discountAmount: discountAmount,
                            couponCode: appliedCoupon ? appliedCoupon.code : null
                        };

                        await axios.post('http://localhost:5000/api/orders', finalOrderData, config);

                        clearCart();
                        showNotification('Order placed successfully!', 'success');
                        navigate('/orders');

                    } catch (error) {
                        console.error('Order creation failed:', error);
                        const errorMessage = error.response?.data?.message || 'Payment verification or Order creation failed. Please contact support.';
                        showNotification(errorMessage, 'error');
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

        } catch (err) {
            console.error('Checkout error:', err);
            setError(err.response?.data?.message || 'Checkout failed');
            showNotification(err.response?.data?.message || 'Checkout failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (cartItems.length === 0) {
        return (
            <div className="text-center py-20">
                <h2 className="text-2xl font-bold text-gray-900">Your cart is empty</h2>
                <p className="mt-4 text-gray-500">Add some delicious meals to get started.</p>
            </div>
        );
    }

    return (
        <div className="bg-white py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-3xl font-extrabold text-gray-900 mb-8">Shopping Cart</h2>

                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

                <div className="flex flex-col lg:flex-row gap-12">
                    <div className="lg:w-2/3">
                        <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200 mb-6">
                            <ul className="divide-y divide-gray-200">
                                {cartItems.map((item, index) => (
                                    <li key={index} className="p-6 flex items-center justify-between">
                                        <div className="flex items-center w-full">
                                            <div className="ml-4 flex-1">
                                                {item.type === 'event' ? (
                                                    <div>
                                                        <h3 className="text-lg font-medium text-gray-900">Event Catering</h3>
                                                        <p className="text-sm text-gray-500">Guests: {item.guestCount}</p>
                                                        <p className="text-sm text-gray-500">
                                                            Menu: {item.items.map(i => i.name).join(', ')}
                                                        </p>
                                                        <p className="text-gray-900 font-semibold mt-1">₹{item.totalAmount}</p>
                                                    </div>
                                                ) : item.type === 'single_tiffin' ? (
                                                    <div>
                                                        <h3 className="text-lg font-medium text-gray-900">{item.name}</h3>
                                                        <p className="text-sm text-gray-500">Plan: {item.planType} | Meal: {item.mealTime}</p>
                                                        <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                                                        <p className="text-sm text-gray-500">
                                                            Menu: {item.menuItems.join(', ')}
                                                        </p>
                                                        <p className="text-gray-900 font-semibold mt-1">₹{item.totalAmount} (incl. delivery)</p>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <h3 className="text-lg font-medium text-gray-900">{item.name}</h3>
                                                        <p className="text-gray-500">₹{item.price}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Quantity Controls (Only for non-event/non-single-tiffin items for now) */}
                                        {item.type !== 'event' && item.type !== 'single_tiffin' && (
                                            <div className="flex items-center space-x-4">
                                                <div className="flex items-center border border-gray-300 rounded-md">
                                                    <button
                                                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                        className="p-2 hover:bg-gray-100"
                                                    >
                                                        <Minus className="h-4 w-4" />
                                                    </button>
                                                    <span className="px-4 py-2 text-gray-900">{item.quantity}</span>
                                                    <button
                                                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                        className="p-2 hover:bg-gray-100"
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            onClick={() => removeFromCart(item.id || index)}
                                            className="ml-4 text-red-600 hover:text-red-800"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Available Coupons Section */}
                        {availableCoupons.length > 0 && (
                            <div className="bg-white shadow sm:rounded-lg border border-gray-200 p-6 mb-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                                    <Tag className="h-5 w-5 mr-2 text-orange-600" />
                                    Available Coupons
                                </h3>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {availableCoupons.map((coupon) => (
                                        <div
                                            key={coupon._id}
                                            className="border border-dashed border-orange-300 bg-orange-50 rounded-lg p-4 cursor-pointer hover:bg-orange-100 transition-colors"
                                            onClick={() => setCouponCode(coupon.code)}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <span className="font-bold text-orange-700">{coupon.code}</span>
                                                    <p className="text-sm text-gray-600 mt-1">{coupon.description || `${coupon.discountPercentage}% Off`}</p>
                                                </div>
                                                <span className="bg-white text-orange-600 text-xs font-bold px-2 py-1 rounded border border-orange-200">
                                                    {coupon.discountPercentage}%
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2">Expires: {new Date(coupon.expiryDate).toLocaleDateString()}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="lg:w-1/3">
                        <div className="bg-gray-50 p-6 rounded-lg shadow-sm border border-gray-200">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h3>

                            {/* Delivery Address Section */}
                            <div className="mb-6 border-b border-gray-200 pb-6">
                                <h4 className="text-sm font-medium text-gray-900 flex items-center mb-3">
                                    <MapPin className="h-4 w-4 mr-1 text-gray-500" />
                                    Delivery Address
                                </h4>

                                <div className="space-y-2">
                                    {user?.addresses?.map((addr, index) => (
                                        <div
                                            key={index}
                                            onClick={() => handleAddressSelection(index)}
                                            className={`p-3 rounded-md border cursor-pointer flex items-start ${selectedAddressIndex === index ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-orange-300'}`}
                                        >
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-gray-900">{addr.label || `Address ${index + 1}`}</p>
                                                <p className="text-xs text-gray-500">{addr.street}, {addr.city}, {addr.zip}</p>
                                            </div>
                                            {selectedAddressIndex === index && <CheckCircle className="h-5 w-5 text-orange-600" />}
                                        </div>
                                    ))}

                                    <div
                                        onClick={() => handleAddressSelection(-1)}
                                        className={`p-3 rounded-md border cursor-pointer flex items-start ${selectedAddressIndex === -1 ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-orange-300'}`}
                                    >
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-900">Use a different address</p>
                                        </div>
                                        {selectedAddressIndex === -1 && <CheckCircle className="h-5 w-5 text-orange-600" />}
                                    </div>
                                </div>

                                {isCustomAddress && (
                                    <div className="mt-4 space-y-2 animate-fadeIn">
                                        <input
                                            type="text"
                                            name="street"
                                            value={deliveryAddress.street}
                                            onChange={handleCustomAddressChange}
                                            placeholder="Street Address"
                                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                                        />
                                        <div className="flex space-x-2">
                                            <input
                                                type="text"
                                                name="city"
                                                value={deliveryAddress.city}
                                                onChange={handleCustomAddressChange}
                                                placeholder="City"
                                                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                                            />
                                            <input
                                                type="text"
                                                name="zip"
                                                value={deliveryAddress.zip}
                                                onChange={handleCustomAddressChange}
                                                placeholder="ZIP"
                                                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Coupon Input */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Have a coupon?</label>
                                <div className="flex space-x-2">
                                    <input
                                        type="text"
                                        value={couponCode}
                                        onChange={(e) => setCouponCode(e.target.value)}
                                        placeholder="Enter code"
                                        className="flex-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                                        disabled={!!appliedCoupon}
                                    />
                                    {appliedCoupon ? (
                                        <button
                                            onClick={handleRemoveCoupon}
                                            className="bg-red-100 text-red-700 px-3 py-2 rounded-md hover:bg-red-200"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleApplyCoupon}
                                            className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-700 text-sm font-medium"
                                        >
                                            Apply
                                        </button>
                                    )}
                                </div>
                                {couponError && <p className="mt-2 text-sm text-red-600">{couponError}</p>}
                                {couponSuccess && <p className="mt-2 text-sm text-green-600">{couponSuccess}</p>}
                            </div>

                            {(() => {
                                const total = getCartTotal();
                                const delivery = cartItems.reduce((acc, item) => acc + (item.deliveryCharge || 0), 0);
                                const subtotal = total - delivery;
                                const discountAmount = calculateDiscount(subtotal);
                                const finalTotal = total - discountAmount;

                                return (
                                    <>
                                        <div className="flex justify-between mb-2">
                                            <span className="text-gray-600">Subtotal</span>
                                            <span className="font-medium text-gray-900">₹{subtotal}</span>
                                        </div>
                                        <div className="flex justify-between mb-2">
                                            <span className="text-gray-600">Delivery</span>
                                            <span className="font-medium text-green-600">
                                                {delivery > 0 ? `₹${delivery}` : 'Free'}
                                            </span>
                                        </div>
                                        {discountAmount > 0 && (
                                            <div className="flex justify-between mb-4 text-green-600">
                                                <span>Discount ({appliedCoupon.code})</span>
                                                <span>-₹{discountAmount}</span>
                                            </div>
                                        )}
                                        <div className="border-t border-gray-200 pt-4 flex justify-between mb-6">
                                            <span className="text-xl font-bold text-gray-900">Total</span>
                                            <span className="text-xl font-bold text-gray-900">₹{finalTotal}</span>
                                        </div>
                                    </>
                                );
                            })()}
                            <button
                                onClick={handleCheckout}
                                disabled={loading}
                                className="w-full bg-orange-600 text-white py-3 px-4 rounded-md font-medium hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
                            >
                                {loading ? 'Processing...' : 'Checkout'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Cart;
