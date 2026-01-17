import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Calendar, ChevronLeft, ChevronRight, Star, X, ShoppingCart } from 'lucide-react';
import CartContext from '../context/CartContext';
import NotificationContext from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';

const Menu = () => {
    const [selectedPlan, setSelectedPlan] = useState('Basic');
    const [weeklyMenu, setWeeklyMenu] = useState([]);
    const [todaysMenu, setTodaysMenu] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());

    // Single Tiffin Order State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [orderMealTime, setOrderMealTime] = useState('Lunch');
    const [orderQuantity, setOrderQuantity] = useState(1);
    const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedDateMenu, setSelectedDateMenu] = useState(null);
    const [loadingSelectedMenu, setLoadingSelectedMenu] = useState(false);
    const { addToCart } = useContext(CartContext);
    const { showNotification } = useContext(NotificationContext);
    const navigate = useNavigate();

    const PLAN_PRICES = {
        'Basic': 120,
        'Premium': 150,
        'Exotic': 200
    };

    useEffect(() => {
        fetchMenuData();
    }, [selectedPlan, currentDate]);

    const fetchMenuData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Today's Menu (Always based on actual today)
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayRes = await axios.get(
                `http://localhost:5000/api/menu?date=${today.toISOString()}&planType=${selectedPlan}`
            );
            if (todayRes.data.length > 0) {
                setTodaysMenu(todayRes.data[0]);
            } else {
                setTodaysMenu(null);
            }

            // 2. Fetch Representative Weekly Menu for the selected Month
            const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

            const endOfRange = new Date(startOfMonth);
            endOfRange.setDate(endOfRange.getDate() + 14); // Fetch 2 weeks to ensure we get all weekdays

            const weeklyRes = await axios.get(
                `http://localhost:5000/api/menu?startDate=${startOfMonth.toISOString()}&endDate=${endOfRange.toISOString()}&planType=${selectedPlan}`
            );

            // Process to get one of each weekday
            const uniqueWeekdays = [];

            // Order: Sunday (0) to Saturday (6)
            const targetOrder = [0, 1, 2, 3, 4, 5, 6];

            targetOrder.forEach(dayIndex => {
                const found = weeklyRes.data.find(m => new Date(m.date).getDay() === dayIndex);
                if (found) {
                    uniqueWeekdays.push(found);
                }
            });

            setWeeklyMenu(uniqueWeekdays);

        } catch (error) {
            console.error('Error fetching menu:', error);
            showNotification('Failed to load menu data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handlePrevMonth = () => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() - 1);
        setCurrentDate(newDate);
    };

    const handleNextMonth = () => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + 1);
        setCurrentDate(newDate);
    };

    const formatMonthYear = (date) => {
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    const getDayName = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', { weekday: 'long' });
    };

    const getDayIndex = (dateString) => {
        return new Date(dateString).getDay();
    }

    const sortedMenu = [...weeklyMenu].sort((a, b) => getDayIndex(a.date) - getDayIndex(b.date));

    // Fetch menu for selected date
    useEffect(() => {
        const fetchSelectedDateMenu = async () => {
            if (!orderDate) return;

            setLoadingSelectedMenu(true);
            try {
                const selectedDate = new Date(orderDate);
                selectedDate.setHours(0, 0, 0, 0);
                const res = await axios.get(
                    `http://localhost:5000/api/menu?date=${selectedDate.toISOString()}&planType=${selectedPlan}`
                );
                if (res.data.length > 0) {
                    setSelectedDateMenu(res.data[0]);
                } else {
                    setSelectedDateMenu(null);
                }
            } catch (error) {
                console.error('Error fetching selected date menu:', error);
                setSelectedDateMenu(null);
            } finally {
                setLoadingSelectedMenu(false);
            }
        };

        if (isModalOpen) {
            fetchSelectedDateMenu();
        }
    }, [orderDate, selectedPlan, isModalOpen]);

    const handleOrderNow = () => {
        setOrderDate(new Date().toISOString().split('T')[0]); // Reset to today
        setIsModalOpen(true);
    };

    const handleAddToCart = () => {
        // 12-Hour Validation
        const now = new Date();
        const targetDate = new Date(orderDate);

        if (orderMealTime === 'Lunch') {
            targetDate.setHours(12, 0, 0, 0);
        } else if (orderMealTime === 'Dinner') {
            targetDate.setHours(20, 0, 0, 0);
        }

        const diffInHours = (targetDate - now) / 1000 / 60 / 60;

        if (diffInHours < 12) {
            showNotification(`Order window closed. Lunch/Dinner must be ordered 12 hours in advance.`, 'error');
            return;
        }

        // Use selected date's menu instead of today's menu
        if (!selectedDateMenu) {
            showNotification('Menu not available for selected date', 'error');
            return;
        }

        const price = PLAN_PRICES[selectedPlan];
        const totalAmount = (price * orderQuantity) + 100; // 100 Delivery Charge

        const orderItem = {
            id: `single_${Date.now()}`, // Unique ID
            type: 'single_tiffin',
            name: `${selectedPlan} Tiffin (${orderMealTime})`,
            planType: selectedPlan,
            mealTime: orderMealTime,
            quantity: parseInt(orderQuantity),
            price: price,
            deliveryCharge: 100,
            totalAmount: totalAmount,
            menuItems: selectedDateMenu.items[orderMealTime.toLowerCase()],
            deliveryDate: orderDate // Pass selected date
        };

        addToCart(orderItem);
        setIsModalOpen(false);
        showNotification('Tiffin added to cart!', 'success');
        navigate('/cart');
    };

    return (
        <div className="bg-white relative">
            {/* Header */}
            <div className="bg-orange-50 py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                        Weekly Menu
                    </h2>
                    <p className="mt-4 text-xl text-gray-500">
                        Fixed weekly menu for the entire month.
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Plan Tabs */}
                <div className="flex justify-center mb-8">
                    <div className="flex space-x-4 bg-gray-100 p-1 rounded-lg">
                        {['Basic', 'Premium', 'Exotic'].map((plan) => (
                            <button
                                key={plan}
                                onClick={() => setSelectedPlan(plan)}
                                className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${selectedPlan === plan
                                    ? 'bg-white text-orange-600 shadow'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {plan}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Today's Special Highlight */}
                {todaysMenu && (
                    <div className="mb-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl shadow-xl overflow-hidden text-white relative">
                        <div className="px-6 py-8 sm:p-10 sm:pb-6">
                            <div className="flex flex-col md:flex-row items-center justify-between">
                                <div>
                                    <h3 className="text-2xl font-extrabold tracking-tight sm:text-3xl flex items-center">
                                        <Star className="h-8 w-8 text-yellow-300 mr-3" fill="currentColor" />
                                        Today's Menu ({getDayName(todaysMenu.date)})
                                    </h3>
                                    <p className="mt-2 text-lg text-orange-100">
                                        Freshly prepared for you today. Don't miss out!
                                    </p>
                                </div>
                                <div className="mt-4 md:mt-0 flex flex-col items-end space-y-2">
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white text-orange-800">
                                        {selectedPlan} Plan
                                    </span>
                                    <button
                                        onClick={handleOrderNow}
                                        className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-orange-700 bg-white hover:bg-orange-50 shadow-sm"
                                    >
                                        Order Now
                                    </button>
                                </div>
                            </div>
                            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                                <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                                    <h4 className="font-bold text-yellow-200 uppercase tracking-wider text-sm">Lunch</h4>
                                    <p className="mt-2 text-white font-medium">{todaysMenu.items.lunch.join(', ')}</p>
                                </div>
                                <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                                    <h4 className="font-bold text-yellow-200 uppercase tracking-wider text-sm">Dinner</h4>
                                    <p className="mt-2 text-white font-medium">{todaysMenu.items.dinner.join(', ')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Month Navigation */}
                <div className="flex justify-between items-center mb-6">
                    <button
                        onClick={handlePrevMonth}
                        className="p-2 rounded-full hover:bg-gray-100 text-gray-600 flex items-center"
                    >
                        <ChevronLeft className="h-5 w-5 mr-1" /> Previous Month
                    </button>
                    <span className="text-lg font-medium text-gray-900 flex items-center">
                        <Calendar className="h-5 w-5 mr-2 text-orange-500" />
                        {formatMonthYear(currentDate)}
                    </span>
                    <button
                        onClick={handleNextMonth}
                        className="p-2 rounded-full hover:bg-gray-100 text-gray-600 flex items-center"
                    >
                        Next Month <ChevronRight className="h-5 w-5 ml-1" />
                    </button>
                </div>

                {/* Menu Grid */}
                {loading ? (
                    <div className="text-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
                        <p className="mt-4 text-gray-500">Loading deliciousness...</p>
                    </div>
                ) : sortedMenu.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <p className="text-gray-500 text-lg">No menu available for this month yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sortedMenu.map((dayMenu) => (
                            <div
                                key={dayMenu._id}
                                className={`rounded-lg shadow-lg overflow-hidden border ${dayMenu.isWeekendSpecial ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-white'
                                    }`}
                            >
                                <div className="px-6 py-4 border-b border-gray-100">
                                    <h3 className="text-lg font-bold text-gray-900">
                                        {getDayName(dayMenu.date)}
                                    </h3>
                                    {dayMenu.isWeekendSpecial && (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 mt-2">
                                            Weekend Special
                                        </span>
                                    )}
                                </div>
                                <div className="p-6 space-y-4">
                                    <div>
                                        <h4 className="text-sm font-semibold text-orange-600 uppercase tracking-wide">Lunch</h4>
                                        <p className="mt-1 text-gray-600">{dayMenu.items.lunch.join(', ')}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold text-orange-600 uppercase tracking-wide">Dinner</h4>
                                        <p className="mt-1 text-gray-600">{dayMenu.items.dinner.join(', ')}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Order Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setIsModalOpen(false)}></div>

                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start">
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                                Order Tiffin ({selectedPlan})
                                            </h3>
                                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                                                <X className="h-6 w-6" />
                                            </button>
                                        </div>

                                        <div className="mt-4 space-y-6">
                                            {/* Date Selection */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
                                                <input
                                                    type="date"
                                                    value={orderDate}
                                                    min={new Date().toISOString().split('T')[0]}
                                                    onChange={(e) => setOrderDate(e.target.value)}
                                                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                                                />
                                            </div>
                                            {/* Meal Time Selection */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Select Meal</label>
                                                <div className="flex space-x-4">
                                                    <label className={`flex-1 border rounded-md p-3 cursor-pointer flex items-center justify-center ${orderMealTime === 'Lunch' ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-500' : 'border-gray-300'}`}>
                                                        <input
                                                            type="radio"
                                                            name="mealTime"
                                                            value="Lunch"
                                                            checked={orderMealTime === 'Lunch'}
                                                            onChange={(e) => setOrderMealTime(e.target.value)}
                                                            className="sr-only"
                                                        />
                                                        <span className={orderMealTime === 'Lunch' ? 'text-orange-700 font-medium' : 'text-gray-700'}>Lunch</span>
                                                    </label>
                                                    <label className={`flex-1 border rounded-md p-3 cursor-pointer flex items-center justify-center ${orderMealTime === 'Dinner' ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-500' : 'border-gray-300'}`}>
                                                        <input
                                                            type="radio"
                                                            name="mealTime"
                                                            value="Dinner"
                                                            checked={orderMealTime === 'Dinner'}
                                                            onChange={(e) => setOrderMealTime(e.target.value)}
                                                            className="sr-only"
                                                        />
                                                        <span className={orderMealTime === 'Dinner' ? 'text-orange-700 font-medium' : 'text-gray-700'}>Dinner</span>
                                                    </label>
                                                </div>
                                            </div>

                                            {/* Menu Preview for Selected Date */}
                                            {loadingSelectedMenu ? (
                                                <div className="text-center text-sm text-gray-500">Loading menu...</div>
                                            ) : selectedDateMenu ? (
                                                <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
                                                    <p className="text-xs font-semibold text-orange-800 uppercase mb-2">
                                                        Menu for {new Date(orderDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                                    </p>
                                                    <p className="text-sm text-gray-700">
                                                        <strong>{orderMealTime}:</strong> {selectedDateMenu.items[orderMealTime.toLowerCase()].join(', ')}
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                                                    <p className="text-sm text-red-700">No menu available for this date</p>
                                                </div>
                                            )}

                                            {/* 12-Hour Window Warning */}
                                            {(() => {
                                                const now = new Date();
                                                const targetDate = new Date(orderDate);
                                                if (orderMealTime === 'Lunch') targetDate.setHours(12, 0, 0, 0);
                                                else if (orderMealTime === 'Dinner') targetDate.setHours(20, 0, 0, 0);

                                                const diffInHours = (targetDate - now) / 1000 / 60 / 60;

                                                if (diffInHours < 12) {
                                                    return (
                                                        <div className="bg-red-50 border-l-4 border-red-400 p-4">
                                                            <div className="flex">
                                                                <div className="ml-3">
                                                                    <p className="text-sm text-red-700">
                                                                        Order window closed. {orderMealTime} must be ordered 12 hours in advance.
                                                                        Please select a future date.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}

                                            {/* Quantity Selection */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity (Persons)</label>
                                                <select
                                                    value={orderQuantity}
                                                    onChange={(e) => setOrderQuantity(parseInt(e.target.value))}
                                                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md"
                                                >
                                                    {[1, 2, 3, 4, 5].map(num => (
                                                        <option key={num} value={num}>{num} Person{num > 1 ? 's' : ''}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Price Breakdown */}
                                            <div className="bg-gray-50 p-4 rounded-md">
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="text-gray-500">Price per tiffin ({selectedPlan}):</span>
                                                    <span className="font-medium">₹{PLAN_PRICES[selectedPlan]}</span>
                                                </div>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="text-gray-500">Quantity:</span>
                                                    <span className="font-medium">{orderQuantity}</span>
                                                </div>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="text-gray-500">Delivery Charge:</span>
                                                    <span className="font-medium">₹100</span>
                                                </div>
                                                <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between text-base font-bold">
                                                    <span>Total:</span>
                                                    <span className="text-orange-600">₹{(PLAN_PRICES[selectedPlan] * orderQuantity) + 100}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                <button
                                    type="button"
                                    onClick={handleAddToCart}
                                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-orange-600 text-base font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:ml-3 sm:w-auto sm:text-sm"
                                >
                                    <ShoppingCart className="h-4 w-4 mr-2" />
                                    Add to Cart
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
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

export default Menu;
