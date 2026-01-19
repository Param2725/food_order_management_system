import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { Menu, User, ShoppingCart, LogOut, ClipboardList, MessageSquare, CreditCard } from 'lucide-react';
import AuthContext from '../context/AuthContext';
import CartContext from '../context/CartContext';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const { cartItems } = useContext(CartContext);

    const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);

    return (
        <nav className="bg-white shadow-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <Link to="/" className="flex-shrink-0 flex items-center">
                            <span className="text-2xl font-bold text-orange-600">Payal's Kitchen</span>
                        </Link>
                        <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                            <Link to="/" className="text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-orange-500 text-sm font-medium">
                                Home
                            </Link>
                            <Link to="/menu" className="text-gray-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-orange-500 text-sm font-medium">
                                Menu
                            </Link>
                            <Link to="/plans" className="text-gray-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-orange-500 text-sm font-medium">
                                Plans
                            </Link>
                            <Link to="/events" className="text-gray-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-orange-500 text-sm font-medium">
                                Event Catering
                            </Link>
                        </div>
                    </div>
                    <div className="flex items-center">
                        <Link to="/cart" className="p-2 text-gray-400 hover:text-gray-500 relative">
                            <ShoppingCart className="h-6 w-6" />
                            {cartCount > 0 && (
                                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full">
                                    {cartCount}
                                </span>
                            )}
                        </Link>
                        {user ? (
                            <div className="ml-4 flex items-center space-x-4">
                                <Link to="/profile" className="p-2 text-gray-400 hover:text-gray-500" title="My Profile">
                                    <User className="h-6 w-6" />
                                </Link>
                                <Link to="/my-subscription" className="p-2 text-gray-400 hover:text-gray-500" title="My Subscription">
                                    <CreditCard className="h-6 w-6" />
                                </Link>
                                <Link to="/orders" className="p-2 text-gray-400 hover:text-gray-500" title="My Orders">
                                    <ClipboardList className="h-6 w-6" />
                                </Link>
                                <Link to="/complaints" className="p-2 text-gray-400 hover:text-gray-500" title="Feedback & Complaints">
                                    <MessageSquare className="h-6 w-6" />
                                </Link>
                                <span className="text-sm font-medium text-gray-700 hidden md:block">Hello, {user.name}</span>
                                <button onClick={logout} className="p-2 text-gray-400 hover:text-gray-500" title="Logout">
                                    <LogOut className="h-6 w-6" />
                                </button>
                            </div>
                        ) : (
                            <Link to="/login" className="ml-4 p-2 text-gray-400 hover:text-gray-500">
                                <User className="h-6 w-6" />
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
