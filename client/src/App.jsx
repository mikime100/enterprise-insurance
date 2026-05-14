import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AppLayout from './components/Layout/AppLayout';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

import CustomerDashboard from './pages/customer/Dashboard';
import CustomerQuotes from './pages/customer/Quotes';
import CustomerPolicies from './pages/customer/Policies';
import CustomerClaims from './pages/customer/Claims';
import CustomerProfile from './pages/customer/Profile';

import AgentDashboard from './pages/agent/Dashboard';
import AgentCustomers from './pages/agent/Customers';
import AgentPolicies from './pages/agent/Policies';
import AgentClaims from './pages/agent/Claims';
import AgentReports from './pages/agent/Reports';

import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminProducts from './pages/admin/Products';
import AdminReports from './pages/admin/Reports';

function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (user.role === 'agent') return <Navigate to="/agent/dashboard" replace />;
  return <Navigate to="/customer/dashboard" replace />;
}

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f6fa' }}>
      <Spin size="large" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <RoleRedirect />;
  return children;
}

function AppRoutes() {
  const { loading } = useAuth();
  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f6fa' }}>
      <Spin size="large" />
    </div>
  );

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/" element={<ProtectedRoute><RoleRedirect /></ProtectedRoute>} />

      {/* Customer routes */}
      <Route path="/customer" element={<ProtectedRoute roles={['customer']}><AppLayout /></ProtectedRoute>}>
        <Route path="dashboard" element={<CustomerDashboard />} />
        <Route path="quotes" element={<CustomerQuotes />} />
        <Route path="policies" element={<CustomerPolicies />} />
        <Route path="claims" element={<CustomerClaims />} />
        <Route path="profile" element={<CustomerProfile />} />
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>

      {/* Agent routes */}
      <Route path="/agent" element={<ProtectedRoute roles={['agent']}><AppLayout /></ProtectedRoute>}>
        <Route path="dashboard" element={<AgentDashboard />} />
        <Route path="customers" element={<AgentCustomers />} />
        <Route path="policies" element={<AgentPolicies />} />
        <Route path="claims" element={<AgentClaims />} />
        <Route path="reports" element={<AgentReports />} />
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>

      {/* Admin routes */}
      <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AppLayout /></ProtectedRoute>}>
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="reports" element={<AdminReports />} />
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
