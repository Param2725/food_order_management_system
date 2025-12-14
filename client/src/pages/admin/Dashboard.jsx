import React, { useEffect, useState, useContext } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Users, ShoppingBag, DollarSign, Calendar, Plus, Trash2 } from 'lucide-react';
import axios from 'axios';
import AuthContext from '../../context/AuthContext';
import NotificationContext from '../../context/NotificationContext';

const AdminDashboard = () => {
    const { user } = useContext(AuthContext);
    const { showNotification } = useContext(NotificationContext);
    const [plans, setPlans] = useState([]);
    const [newPlan, setNewPlan] = useState({ name: 'Basic', price: '', duration: 'monthly', description: '', features: '' });
    const [menuDate, setMenuDate] = useState('');
    const [menuPlanType, setMenuPlanType] = useState('Basic');
    const [menuItems, setMenuItems] = useState({ lunch: '', dinner: '' });

    // Mock data for charts
    const salesData = [
        { name: 'Mon', sales: 4000 },
        { name: 'Tue', sales: 3000 },
        { name: 'Wed', sales: 2000 },
        { name: 'Thu', sales: 2780 },
        { name: 'Fri', sales: 1890 },
        { name: 'Sat', sales: 2390 },
        { name: 'Sun', sales: 3490 },
    ];

    const ordersData = [
        { name: 'Mon', orders: 24 },
        { name: 'Tue', orders: 13 },
        { name: 'Wed', orders: 98 },
        { name: 'Thu', orders: 39 },
        { name: 'Fri', orders: 48 },
        { name: 'Sat', orders: 38 },
        { name: 'Sun', orders: 43 },
    ];

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/plans');
            setPlans(res.data);
        } catch (error) {
            console.error('Error fetching plans:', error);
            showNotification('Failed to fetch plans', 'error');
        }
    };

    const handleCreatePlan = async (e) => {
        e.preventDefault();
        try {
            const config = {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            };
            const planData = {
                ...newPlan,
                features: newPlan.features.split(',').map(f => f.trim()),
            };
            await axios.post('http://localhost:5000/api/plans', planData, config);
            fetchPlans();
            setNewPlan({ name: 'Basic', price: '', duration: 'monthly', description: '', features: '' });
            showNotification('Plan created successfully', 'success');
        } catch (error) {
            console.error('Error creating plan:', error);
            showNotification('Failed to create plan', 'error');
        }
    };

    const handleDeletePlan = async (id) => {
        if (!window.confirm('Are you sure?')) return;
        try {
            const config = {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            };
            await axios.delete(`http://localhost:5000/api/plans/${id}`, config);
            fetchPlans();
            showNotification('Plan deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting plan:', error);
            showNotification('Failed to delete plan', 'error');
        }
    };

    const handleCreateMenu = async (e) => {
        e.preventDefault();
        try {
            const config = {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            };
            const menuData = {
                date: menuDate,
                planType: menuPlanType,
                items: {
                    lunch: menuItems.lunch.split(',').map(i => i.trim()),
                    dinner: menuItems.dinner.split(',').map(i => i.trim()),
                },
            };
            await axios.post('http://localhost:5000/api/menu', menuData, config);
            setMenuItems({ lunch: '', dinner: '' });
            showNotification('Menu created successfully', 'success');
        } catch (error) {
            console.error('Error creating menu:', error);
            showNotification('Failed to create menu (Ensure no duplicate menu for this date/plan)', 'error');
        }
    };

    return (
        <div className="bg-gray-50 min-h-screen py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-3xl font-extrabold text-gray-900 mb-8">Admin Dashboard</h2>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <DollarSign className="h-6 w-6 text-gray-400" />
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                                        <dd className="text-lg font-medium text-gray-900">₹1,20,000</dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <ShoppingBag className="h-6 w-6 text-gray-400" />
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">Total Orders</dt>
                                        <dd className="text-lg font-medium text-gray-900">345</dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <Users className="h-6 w-6 text-gray-400" />
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">Active Subscriptions</dt>
                                        <dd className="text-lg font-medium text-gray-900">120</dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <Calendar className="h-6 w-6 text-gray-400" />
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">Pending Tasks</dt>
                                        <dd className="text-lg font-medium text-gray-900">5</dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Weekly Sales</h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={salesData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="sales" fill="#ea580c" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Weekly Orders</h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={ordersData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="orders" stroke="#ea580c" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Management Sections */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Manage Plans */}
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Manage Plans</h3>
                        <form onSubmit={handleCreatePlan} className="space-y-4 mb-6">
                            <div className="grid grid-cols-2 gap-4">
                                <select
                                    value={newPlan.name}
                                    onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                                >
                                    <option value="Basic">Basic</option>
                                    <option value="Premium">Premium</option>
                                    <option value="Exotic">Exotic</option>
                                </select>
                                <select
                                    value={newPlan.duration}
                                    onChange={(e) => setNewPlan({ ...newPlan, duration: e.target.value })}
                                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                                >
                                    <option value="monthly">Monthly</option>
                                    <option value="yearly">Yearly</option>
                                </select>
                            </div>
                            <input
                                type="number"
                                placeholder="Price"
                                value={newPlan.price}
                                onChange={(e) => setNewPlan({ ...newPlan, price: e.target.value })}
                                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                                required
                            />
                            <input
                                type="text"
                                placeholder="Description"
                                value={newPlan.description}
                                onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                            />
                            <input
                                type="text"
                                placeholder="Features (comma separated)"
                                value={newPlan.features}
                                onChange={(e) => setNewPlan({ ...newPlan, features: e.target.value })}
                                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                            />
                            <button
                                type="submit"
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700"
                            >
                                <Plus className="h-5 w-5 mr-2" /> Create Plan
                            </button>
                        </form>
                        <ul className="divide-y divide-gray-200">
                            {plans.map((plan) => (
                                <li key={plan._id} className="py-4 flex justify-between items-center">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{plan.name} ({plan.duration})</p>
                                        <p className="text-sm text-gray-500">₹{plan.price}</p>
                                    </div>
                                    <button onClick={() => handleDeletePlan(plan._id)} className="text-red-600 hover:text-red-800">
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Manage Menu */}
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Daily Menu</h3>
                        <form onSubmit={handleCreateMenu} className="space-y-4">
                            <input
                                type="date"
                                value={menuDate}
                                onChange={(e) => setMenuDate(e.target.value)}
                                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                                required
                            />
                            <select
                                value={menuPlanType}
                                onChange={(e) => setMenuPlanType(e.target.value)}
                                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                            >
                                <option value="Basic">Basic</option>
                                <option value="Premium">Premium</option>
                                <option value="Exotic">Exotic</option>
                            </select>
                            <textarea
                                placeholder="Lunch Items (comma separated)"
                                value={menuItems.lunch}
                                onChange={(e) => setMenuItems({ ...menuItems, lunch: e.target.value })}
                                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                                rows={2}
                            />
                            <textarea
                                placeholder="Dinner Items (comma separated)"
                                value={menuItems.dinner}
                                onChange={(e) => setMenuItems({ ...menuItems, dinner: e.target.value })}
                                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                                rows={2}
                            />
                            <button
                                type="submit"
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700"
                            >
                                <Plus className="h-5 w-5 mr-2" /> Add Menu
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
