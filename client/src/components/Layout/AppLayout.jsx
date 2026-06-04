import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Menu, Avatar, Dropdown, Badge, Button, Input } from 'antd';
import {
  DashboardOutlined, FileTextOutlined, SafetyOutlined, AlertOutlined,
  TeamOutlined, BarChartOutlined, LogoutOutlined, ShopOutlined,
  BellOutlined, QuestionCircleOutlined, SearchOutlined,
  AuditOutlined, BankOutlined, PartitionOutlined, MedicineBoxOutlined,
  ContainerOutlined, DollarOutlined, HomeOutlined,
  MenuFoldOutlined, MenuUnfoldOutlined, PlusOutlined, CloseOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';

// ─── Design tokens ────────────────────────────────────────────────────────────
const SIDEBAR_BG   = '#111827';
const SB_BORDER    = 'rgba(255,255,255,0.07)';
const ACTIVE_BG    = '#16a34a';
const NAV_INACTIVE = '#9ca3af';
const NAV_ACTIVE   = '#ffffff';
const LOGO_GREEN   = '#16a34a';
const CTA_GREEN    = '#16a34a';
const PRIMARY_NAVY = '#1e3a5f';
const SIDEBAR_W    = 256;
const COLLAPSED_W  = 68;

// ─── Nav definitions ──────────────────────────────────────────────────────────
const NAV = {
  payer_admin: [
    { key: '/payer/dashboard',   icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/payer/quotes',      icon: <FileTextOutlined />,  label: 'Underwriting' },
    { key: '/payer/enrollments', icon: <AuditOutlined />,     label: 'Policies' },
    { key: '/payer/claims',      icon: <AlertOutlined />,     label: 'Claims' },
    { key: '/payer/products',    icon: <ShopOutlined />,      label: 'Products' },
    { key: '/payer/coverages',   icon: <SafetyOutlined />,    label: 'Coverages' },
    { key: '/payer/providers',   icon: <BankOutlined />,      label: 'Providers' },
    { key: '/payer/reports',     icon: <BarChartOutlined />,  label: 'Reports' },
  ],
  underwriter: [
    { key: '/payer/dashboard',   icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/payer/quotes',      icon: <FileTextOutlined />,  label: 'Underwriting' },
    { key: '/payer/enrollments', icon: <AuditOutlined />,     label: 'Policies' },
    { key: '/payer/products',    icon: <ShopOutlined />,      label: 'Products' },
    { key: '/payer/reports',     icon: <BarChartOutlined />,  label: 'Reports' },
  ],
  claims_officer: [
    { key: '/payer/dashboard',   icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/payer/claims',      icon: <AlertOutlined />,     label: 'Claims' },
    { key: '/payer/enrollments', icon: <AuditOutlined />,     label: 'Policies' },
    { key: '/payer/reports',     icon: <BarChartOutlined />,  label: 'Reports' },
  ],
  finance_officer: [
    { key: '/payer/dashboard',   icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/payer/claims',      icon: <AlertOutlined />,     label: 'Claims' },
    { key: '/payer/enrollments', icon: <AuditOutlined />,     label: 'Policies' },
    { key: '/payer/reports',     icon: <BarChartOutlined />,  label: 'Financial Reports' },
  ],
  sales_broker: [
    { key: '/broker/dashboard',         icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/broker/customers',         icon: <TeamOutlined />,      label: 'My Customers' },
    { key: '/broker/register-customer', icon: <PlusOutlined />,      label: 'Add Customer' },
  ],
  customer_support: [
    { key: '/payer/dashboard',   icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/payer/claims',      icon: <AlertOutlined />,     label: 'Claims' },
    { key: '/payer/enrollments', icon: <AuditOutlined />,     label: 'Policies' },
  ],
  provider_admin: [
    { key: '/provider/dashboard',    icon: <DashboardOutlined />,  label: 'Dashboard' },
    { key: '/provider/submit-claim', icon: <ContainerOutlined />,  label: 'Submit Claim' },
    { key: '/provider/claims',       icon: <AlertOutlined />,      label: 'My Claims' },
  ],
  institution_admin: [
    { key: '/institution/dashboard', icon: <DashboardOutlined />,  label: 'Dashboard' },
    { key: '/institution/groups',    icon: <PartitionOutlined />,  label: 'Departments' },
    { key: '/institution/employees', icon: <TeamOutlined />,       label: 'Employees' },
    { key: '/institution/policy',    icon: <SafetyOutlined />,     label: 'Our Policy' },
    { key: '/institution/claims',    icon: <AlertOutlined />,      label: 'Employee Claims' },
  ],
  insured_person: [
    { key: '/insured/dashboard',  icon: <DashboardOutlined />,  label: 'Dashboard' },
    { key: '/insured/coverage',   icon: <MedicineBoxOutlined />,label: 'My Benefits' },
    { key: '/insured/claims',     icon: <AlertOutlined />,      label: 'My Claims' },
    { key: '/insured/dependents', icon: <TeamOutlined />,       label: 'Dependents' },
  ],
  superadmin: [
    { key: '/admin/dashboard',    icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/admin/payers',       icon: <BankOutlined />,      label: 'Payers' },
    { key: '/admin/providers',    icon: <HomeOutlined />,      label: 'Providers' },
    { key: '/admin/institutions', icon: <AuditOutlined />,     label: 'Institutions' },
    { key: '/admin/users',        icon: <TeamOutlined />,      label: 'Users' },
    { key: '/admin/reports',      icon: <BarChartOutlined />,  label: 'Reports' },
  ],
};

const ROLE_META = {
  payer_admin:       { label: 'Payer Admin' },
  underwriter:       { label: 'Underwriter' },
  claims_officer:    { label: 'Claims Officer' },
  finance_officer:   { label: 'Finance Officer' },
  sales_broker:      { label: 'Sales Broker' },
  customer_support:  { label: 'Support' },
  provider_admin:    { label: 'Provider' },
  institution_admin: { label: 'Institution HR' },
  insured_person:    { label: 'Insured Person' },
  superadmin:        { label: 'Super Admin' },
};

const CTA_CONFIG = {
  payer_admin:       { label: 'New Claim',     path: '/payer/claims' },
  claims_officer:    { label: 'New Claim',     path: '/payer/claims' },
  finance_officer:   { label: 'New Claim',     path: '/payer/claims' },
  underwriter:       { label: 'New Quote',     path: '/payer/quotes' },
  sales_broker:      { label: 'Add Customer',  path: '/broker/register-customer' },
  customer_support:  { label: 'New Claim',     path: '/payer/claims' },
  provider_admin:    { label: 'Submit Claim',  path: '/provider/submit-claim' },
  institution_admin: { label: 'Add Employee',  path: '/institution/employees' },
  insured_person:    { label: 'File Claim',    path: '/insured/claims' },
  superadmin:        { label: 'Add User',      path: '/admin/users' },
};

export default function AppLayout() {
  const [collapsed, setCollapsed]     = useState(false);
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [isMobile, setIsMobile]       = useState(() => window.innerWidth < 768);
  const { user, logout }              = useAuth();
  const navigate                      = useNavigate();
  const location                      = useLocation();

  // Track viewport width
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e) => {
      setIsMobile(e.matches);
      if (!e.matches) setMobileOpen(false);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const navItems   = NAV[user?.role] || [];
  const activeKey  = navItems.find(i => location.pathname.startsWith(i.key))?.key;
  const meta       = ROLE_META[user?.role] || { label: 'User' };
  const cta        = CTA_CONFIG[user?.role];

  // On desktop: sidebar pushes content. On mobile: sidebar is an overlay drawer.
  const sidebarVisible = isMobile ? mobileOpen : true;
  const sidebarLeft    = isMobile
    ? (mobileOpen ? 0 : -SIDEBAR_W)
    : 0;
  const contentMargin  = isMobile ? 0 : (collapsed ? COLLAPSED_W : SIDEBAR_W);
  const currentWidth   = isMobile ? SIDEBAR_W : (collapsed ? COLLAPSED_W : SIDEBAR_W);

  const userMenuItems = [
    {
      key: 'profile', disabled: true,
      label: (
        <div style={{ padding: '4px 0' }}>
          <div style={{ fontWeight: 600, color: '#111827' }}>{user?.firstName} {user?.lastName}</div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>{user?.email}</div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{meta.label}</div>
        </div>
      ),
    },
    { type: 'divider' },
    {
      key: 'logout', icon: <LogoutOutlined />, label: 'Sign Out', danger: true,
      onClick: async () => { await logout(); navigate('/login'); },
    },
  ];

  const Sidebar = (
    <div style={{
      position: 'fixed', left: sidebarLeft, top: 0, bottom: 0,
      width: isMobile ? SIDEBAR_W : currentWidth,
      background: SIDEBAR_BG,
      zIndex: 300,
      display: 'flex', flexDirection: 'column',
      boxShadow: '2px 0 16px rgba(0,0,0,0.3)',
      transition: isMobile ? 'left 0.28s cubic-bezier(.4,0,.2,1)' : 'width 0.2s ease',
      overflowX: 'hidden',
    }}>
      {/* Logo row */}
      <div style={{
        padding: (!isMobile && collapsed) ? '18px 0' : '18px 20px',
        borderBottom: `1px solid ${SB_BORDER}`,
        display: 'flex', alignItems: 'center',
        justifyContent: (!isMobile && collapsed) ? 'center' : 'space-between',
        minHeight: 64, cursor: 'pointer', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} onClick={() => navigate('/')}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: LOGO_GREEN, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(22,163,74,0.4)' }}>
            <svg width="20" height="13" viewBox="0 0 22 14" fill="none">
              <path d="M1 7 Q4 2, 7 7 Q10 12, 13 7 Q16 2, 19 7 Q20.5 9.5, 22 7" stroke="white" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
            </svg>
          </div>
          {(isMobile || !collapsed) && (
            <div style={{ lineHeight: 1.25 }}>
              <div style={{ color: '#fff', fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap' }}>Enterprise Ins.</div>
              <div style={{ color: NAV_INACTIVE, fontSize: 10, whiteSpace: 'nowrap' }}>Digital Platform</div>
            </div>
          )}
        </div>
        {/* Close button on mobile */}
        {isMobile && (
          <button onClick={() => setMobileOpen(false)}
            style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 7, color: NAV_INACTIVE, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CloseOutlined style={{ fontSize: 14 }} />
          </button>
        )}
      </div>

      {/* CTA */}
      {cta && (
        <div style={{ padding: (!isMobile && collapsed) ? '12px 10px' : '12px 14px', borderBottom: `1px solid ${SB_BORDER}` }}>
          <button
            onClick={() => { navigate(cta.path); if (isMobile) setMobileOpen(false); }}
            style={{
              width: '100%', padding: '10px 0',
              background: CTA_GREEN, border: 'none', borderRadius: 8,
              color: '#fff', fontWeight: 700,
              fontSize: (!isMobile && collapsed) ? 16 : 13,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              boxShadow: '0 2px 8px rgba(22,163,74,0.35)',
            }}
          >
            <PlusOutlined style={{ fontSize: 13 }} />
            {(isMobile || !collapsed) && cta.label}
          </button>
        </div>
      )}

      {/* Nav menu */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '10px 0' }}>
        <Menu
          theme="dark" mode="inline"
          selectedKeys={[activeKey]}
          inlineCollapsed={!isMobile && collapsed}
          onClick={({ key }) => { navigate(key); if (isMobile) setMobileOpen(false); }}
          style={{ background: 'transparent', border: 'none' }}
          items={navItems.map(item => ({
            key: item.key,
            icon: <span style={{ fontSize: 16, color: activeKey === item.key ? NAV_ACTIVE : NAV_INACTIVE }}>{item.icon}</span>,
            label: <span style={{ color: activeKey === item.key ? NAV_ACTIVE : NAV_INACTIVE, fontWeight: activeKey === item.key ? 600 : 400, fontSize: 14 }}>{item.label}</span>,
            style: {
              margin: '2px 8px', borderRadius: 8, height: 44, lineHeight: '44px',
              background: activeKey === item.key ? ACTIVE_BG : 'transparent',
            },
          }))}
        />
      </div>

      {/* User + logout */}
      <div style={{ borderTop: `1px solid ${SB_BORDER}` }}>
        {(isMobile || !collapsed) ? (
          <>
            <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar size={36} style={{ background: LOGO_GREEN, fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </Avatar>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.firstName} {user?.lastName}
                </div>
                <div style={{ color: NAV_INACTIVE, fontSize: 11 }}>{meta.label}</div>
              </div>
            </div>
            <div style={{ padding: '0 14px 14px' }}>
              <button onClick={async () => { await logout(); navigate('/login'); }}
                style={{ width: '100%', padding: '8px 0', borderRadius: 8, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#d1d5db', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                <LogoutOutlined style={{ fontSize: 13 }} /> Logout
              </button>
            </div>
          </>
        ) : (
          <div style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Avatar size={34} style={{ background: LOGO_GREEN, fontWeight: 700, fontSize: 12 }}>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </Avatar>
            <LogoutOutlined style={{ color: NAV_INACTIVE, fontSize: 14, cursor: 'pointer' }}
              onClick={async () => { await logout(); navigate('/login'); }} />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fa' }}>

      {/* Mobile backdrop */}
      {isMobile && mobileOpen && (
        <div onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 299, backdropFilter: 'blur(2px)' }} />
      )}

      {Sidebar}

      {/* Main area */}
      <div style={{ marginLeft: contentMargin, transition: isMobile ? 'none' : 'margin 0.2s ease', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <header style={{
          background: '#ffffff', borderBottom: '1px solid #e5e7eb',
          height: 64, padding: '0 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 200,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)', gap: 12,
        }}>
          {/* Left */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
            <button
              onClick={() => isMobile ? setMobileOpen(true) : setCollapsed(!collapsed)}
              style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 18, cursor: 'pointer', padding: 6, borderRadius: 7, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              {isMobile ? <MenuUnfoldOutlined /> : (collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />)}
            </button>

            {/* Search — hidden on small mobile */}
            <div className="ei-search-wrap" style={{ flex: 1, maxWidth: 340 }}>
              <Input
                prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
                placeholder="Search policies, claims..."
                style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, height: 38, fontSize: 13 }}
              />
            </div>
          </div>

          {/* Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {/* ETB Wallet — hide on very small screens via class */}
            <button className="ei-wallet-btn"
              onClick={() => {
                const paths = { superadmin: '/admin/reports', provider_admin: '/provider/claims', institution_admin: '/institution/claims', insured_person: '/insured/claims' };
                navigate(paths[user?.role] || '/payer/reports');
              }}
              style={{ height: 34, padding: '0 12px', borderRadius: 7, border: 'none', background: PRIMARY_NAVY, color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              ETB Wallet
            </button>

            <Badge count={3} size="small">
              <button style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 18, cursor: 'pointer', padding: 5, borderRadius: 7, display: 'flex', alignItems: 'center' }}>
                <BellOutlined />
              </button>
            </Badge>

            <button className="ei-help-btn" style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 17, cursor: 'pointer', padding: 5, borderRadius: 7, display: 'flex', alignItems: 'center' }}>
              <QuestionCircleOutlined />
            </button>

            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
              <Avatar size={36} style={{ background: LOGO_GREEN, fontWeight: 700, fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </Avatar>
            </Dropdown>
          </div>
        </header>

        {/* Page content */}
        <main style={{ padding: isMobile ? 14 : 24, flex: 1 }}>
          <Outlet />
        </main>
      </div>

      <style>{`
        @media (max-width: 480px) {
          .ei-search-wrap { display: none !important; }
          .ei-wallet-btn  { display: none !important; }
          .ei-help-btn    { display: none !important; }
        }
        @media (max-width: 767px) {
          .ei-search-wrap { max-width: 160px !important; }
        }
      `}</style>
    </div>
  );
}
