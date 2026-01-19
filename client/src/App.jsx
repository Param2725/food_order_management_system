import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { NotificationProvider } from './context/NotificationContext';
import Notification from './components/Notification';

import Home from './pages/Home';
import Menu from './pages/Menu';
import Plans from './pages/Plans';
import Login from './pages/Login';
import Register from './pages/Register';
import Cart from './pages/Cart';
import Profile from './pages/Profile';
import MySubscription from './pages/MySubscription';

import Orders from './pages/Orders';
import EventCatering from './pages/EventCatering';

import AdminDashboard from './pages/admin/Dashboard';
import EmployeeDashboard from './pages/employee/Dashboard';

import Complaints from './pages/Complaints';

import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <CartProvider>
          <Router>
            <Layout>
              <Notification />
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/menu" element={<Menu />} />
                <Route path="/plans" element={<Plans />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/orders" element={<Orders />} />

                <Route path="/events" element={<EventCatering />} />
                <Route path="/complaints" element={<Complaints />} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/my-subscription" element={<ProtectedRoute><MySubscription /></ProtectedRoute>} />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute roles={['admin']}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/employee"
                  element={
                    <ProtectedRoute roles={['employee', 'admin']}>
                      <EmployeeDashboard />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </Layout>
          </Router>
        </CartProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
