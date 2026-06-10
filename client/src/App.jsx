import { Component } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Spin, Button, Result } from 'antd';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AppLayout from './components/Layout/AppLayout';

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(err) { return { error: err }; }
  render() {
    if (this.state.error) return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f7fa' }}>
        <Result status="error" title="Something went wrong"
          subTitle={this.state.error?.message || 'An unexpected error occurred.'}
          extra={<Button type="primary" onClick={() => { this.setState({ error: null }); window.location.reload(); }}>Reload Page</Button>}
        />
      </div>
    );
    return this.props.children;
  }
}

import Landing            from './pages/Landing';
import Plans              from './pages/Plans';
import Login              from './pages/auth/Login';
import Register           from './pages/auth/Register';
import VerifyEmail        from './pages/auth/VerifyEmail';
import ForceChangePassword from './pages/auth/ForceChangePassword';
import BrokerApply        from './pages/auth/BrokerApply';

// Payer portal
import PayerDashboard    from './pages/payer/Dashboard';
import PayerProducts     from './pages/payer/Products';
import PayerCoverages    from './pages/payer/Coverages';
import PayerQuotes       from './pages/payer/Quotes';
import PayerEnrollments  from './pages/payer/Enrollments';
import PayerClaims       from './pages/payer/Claims';
import PayerProviders    from './pages/payer/Providers';
import PayerReports        from './pages/payer/Reports';
import PayerEndorsements  from './pages/payer/Endorsements';

// Provider portal
import ProviderDashboard   from './pages/provider/Dashboard';
import ProviderSubmitClaim from './pages/provider/SubmitClaim';
import ProviderClaims      from './pages/provider/Claims';

// Institution portal
import InstitutionDashboard from './pages/institution/Dashboard';
import InstitutionGroups    from './pages/institution/Groups';
import InstitutionEmployees from './pages/institution/Employees';
import InstitutionPolicy    from './pages/institution/Policy';
import InstitutionClaims    from './pages/institution/Claims';

// Insured portal
import InsuredDashboard   from './pages/insured/Dashboard';
import InsuredCoverage    from './pages/insured/Coverage';
import InsuredClaims      from './pages/insured/Claims';
import InsuredDependents  from './pages/insured/Dependents';
import InsuredQuotes      from './pages/insured/Quotes';
import ExploreCoverage    from './pages/insured/ExploreCoverage';
import ProductDetail      from './pages/insured/ProductDetail';

// Admin portal
import AdminDashboard    from './pages/admin/Dashboard';
import AdminPayers       from './pages/admin/Payers';
import AdminProviders    from './pages/admin/Providers';
import AdminInstitutions from './pages/admin/Institutions';
import AdminUsers        from './pages/admin/Users';
import AdminReports      from './pages/admin/Reports';

// Broker portal
import BrokerDashboard        from './pages/broker/Dashboard';
import BrokerCustomers        from './pages/broker/Customers';
import BrokerRegisterCustomer from './pages/broker/RegisterCustomer';

const PAYER_ROLES = ['payer_admin', 'underwriter', 'claims_officer', 'finance_officer', 'customer_support'];

function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
  if (user.role === 'superadmin')       return <Navigate to="/admin/dashboard" replace />;
  if (user.role === 'sales_broker')     return <Navigate to="/broker/dashboard" replace />;
  if (PAYER_ROLES.includes(user.role))  return <Navigate to="/payer/dashboard" replace />;
  if (user.role === 'provider_admin')   return <Navigate to="/provider/dashboard" replace />;
  if (user.role === 'institution_admin') return <Navigate to="/institution/dashboard" replace />;
  return <Navigate to="/insured/dashboard" replace />;
}

function PublicOrRedirect() {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f6fa' }}>
      <Spin size="large" />
    </div>
  );
  if (user) return <RoleRedirect />;
  return <Landing />;
}

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f6fa' }}>
      <Spin size="large" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
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
      {/* Public auth routes */}
      <Route path="/plans"           element={<Plans />} />
      <Route path="/login"          element={<Login />} />
      <Route path="/register"       element={<Register />} />
      <Route path="/verify-email"   element={<VerifyEmail />} />
      <Route path="/broker-apply"   element={<BrokerApply />} />
      <Route path="/change-password" element={<ForceChangePassword />} />

      <Route path="/" element={<PublicOrRedirect />} />

      {/* Payer Portal */}
      <Route path="/payer" element={<ProtectedRoute roles={PAYER_ROLES}><AppLayout /></ProtectedRoute>}>
        <Route path="dashboard"   element={<PayerDashboard />} />
        <Route path="products"    element={<PayerProducts />} />
        <Route path="coverages"   element={<PayerCoverages />} />
        <Route path="quotes"      element={<PayerQuotes />} />
        <Route path="enrollments" element={<PayerEnrollments />} />
        <Route path="claims"      element={<PayerClaims />} />
        <Route path="providers"    element={<PayerProviders />} />
        <Route path="endorsements" element={<PayerEndorsements />} />
        <Route path="reports"      element={<PayerReports />} />
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>

      {/* Provider Portal */}
      <Route path="/provider" element={<ProtectedRoute roles={['provider_admin']}><AppLayout /></ProtectedRoute>}>
        <Route path="dashboard"    element={<ProviderDashboard />} />
        <Route path="submit-claim" element={<ProviderSubmitClaim />} />
        <Route path="claims"       element={<ProviderClaims />} />
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>

      {/* Institution Portal */}
      <Route path="/institution" element={<ProtectedRoute roles={['institution_admin']}><AppLayout /></ProtectedRoute>}>
        <Route path="dashboard" element={<InstitutionDashboard />} />
        <Route path="groups"    element={<InstitutionGroups />} />
        <Route path="employees" element={<InstitutionEmployees />} />
        <Route path="policy"    element={<InstitutionPolicy />} />
        <Route path="claims"    element={<InstitutionClaims />} />
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>

      {/* Insured Person Portal */}
      <Route path="/insured" element={<ProtectedRoute roles={['insured_person']}><AppLayout /></ProtectedRoute>}>
        <Route path="dashboard"  element={<InsuredDashboard />} />
        <Route path="coverage"   element={<InsuredCoverage />} />
        <Route path="explore"    element={<ExploreCoverage />} />
        <Route path="explore/:productId" element={<ProductDetail />} />
        <Route path="claims"     element={<InsuredClaims />} />
        <Route path="dependents" element={<InsuredDependents />} />
        <Route path="quotes"     element={<InsuredQuotes />} />
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>

      {/* Super Admin Portal */}
      <Route path="/admin" element={<ProtectedRoute roles={['superadmin']}><AppLayout /></ProtectedRoute>}>
        <Route path="dashboard"    element={<AdminDashboard />} />
        <Route path="payers"       element={<AdminPayers />} />
        <Route path="providers"    element={<AdminProviders />} />
        <Route path="institutions" element={<AdminInstitutions />} />
        <Route path="users"        element={<AdminUsers />} />
        <Route path="reports"      element={<AdminReports />} />
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>

      {/* Broker Portal */}
      <Route path="/broker" element={<ProtectedRoute roles={['sales_broker']}><AppLayout /></ProtectedRoute>}>
        <Route path="dashboard"         element={<BrokerDashboard />} />
        <Route path="customers"         element={<BrokerCustomers />} />
        <Route path="register-customer" element={<BrokerRegisterCustomer />} />
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
