import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Badge, Button, Tooltip, Input } from 'antd';
import {
  DashboardOutlined, FileTextOutlined, SafetyOutlined, AlertOutlined,
  TeamOutlined, BarChartOutlined, LogoutOutlined, ShopOutlined,
  BellOutlined, QuestionCircleOutlined, SearchOutlined,
  AuditOutlined, BankOutlined, PartitionOutlined, MedicineBoxOutlined,
  HomeOutlined, ContainerOutlined, DollarOutlined, ApiOutlined,
  MenuFoldOutlined, MenuUnfoldOutlined, PlusOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';

const { Sider, Header, Content } = Layout;

// ─── Design tokens ───────────────────────────────────────────────────────────
const SIDEBAR_BG     = '#111827';
const SIDEBAR_BORDER = 'rgba(255,255,255,0.07)';
const ACTIVE_BG      = '#16a34a';
const ACTIVE_BORDER  = 'transparent';
const NAV_INACTIVE   = '#9ca3af';
const NAV_ACTIVE     = '#ffffff';
const LOGO_GREEN     = '#16a34a';
const CTA_GREEN      = '#16a34a';
const PRIMARY_NAVY   = '#1e3a5f';

// ─── Nav definitions ─────────────────────────────────────────────────────────
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

// CTA config per role — what the sidebar "New …" button does
const CTA_CONFIG = {
  payer_admin:    { label: 'New Claim',     path: '/payer/claims' },
  claims_officer: { label: 'New Claim',     path: '/payer/claims' },
  finance_officer:{ label: 'New Claim',     path: '/payer/claims' },
  underwriter:    { label: 'New Quote',     path: '/payer/quotes' },
  sales_broker:   { label: 'Add Customer', path: '/broker/register-customer' },
  customer_support:{ label: 'New Claim',    path: '/payer/claims' },
  provider_admin: { label: 'Submit Claim',  path: '/provider/submit-claim' },
  institution_admin:{ label: 'Add Employee',path: '/institution/employees' },
  insured_person: { label: 'File Claim',    path: '/insured/claims' },
  superadmin:     { label: 'Add User',      path: '/admin/users' },
};

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = NAV[user?.role] || [];
  const activeKey = navItems.find(i => location.pathname.startsWith(i.key))?.key;
  const meta = ROLE_META[user?.role] || { label: 'User' };
  const cta  = CTA_CONFIG[user?.role];

  const siderWidth = 256;

  const userMenuItems = [
    {
      key: 'profile', label: (
        <div style={{ padding: '4px 0' }}>
          <div style={{ fontWeight: 600, color: '#111827' }}>{user?.firstName} {user?.lastName}</div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>{user?.email}</div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{meta.label}</div>
        </div>
      ), disabled: true,
    },
    { type: 'divider' },
    {
      key: 'logout', icon: <LogoutOutlined />, label: 'Sign Out', danger: true,
      onClick: async () => { await logout(); navigate('/login'); },
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f7fa' }}>

      {/* ─── Sidebar ───────────────────────────────────────────────────────── */}
      <Sider
        collapsible collapsed={collapsed} trigger={null}
        width={siderWidth} collapsedWidth={68}
        style={{
          background: SIDEBAR_BG,
          position: 'fixed', left: 0, top: 0, bottom: 0,
          zIndex: 200, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          boxShadow: '2px 0 12px rgba(0,0,0,0.25)',
        }}
      >
        {/* Logo */}
        <div style={{
          padding: collapsed ? '18px 0' : '18px 20px',
          borderBottom: `1px solid ${SIDEBAR_BORDER}`,
          display: 'flex', alignItems: 'center', gap: 12,
          justifyContent: collapsed ? 'center' : 'flex-start',
          minHeight: 70, cursor: 'pointer',
        }} onClick={() => navigate('/')}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: LOGO_GREEN,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(22,163,74,0.4)',
          }}>
            {/* Wave-style icon */}
            <svg width="22" height="14" viewBox="0 0 22 14" fill="none">
              <path d="M1 7 Q4 2, 7 7 Q10 12, 13 7 Q16 2, 19 7 Q20.5 9.5, 22 7" stroke="white" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
            </svg>
          </div>
          {!collapsed && (
            <div style={{ lineHeight: 1.25, overflow: 'hidden' }}>
              <div style={{ color: '#ffffff', fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap' }}>Enterprise Ins.</div>
              <div style={{ color: NAV_INACTIVE, fontSize: 10, fontWeight: 500, whiteSpace: 'nowrap' }}>Digital Platform</div>
            </div>
          )}
        </div>

        {/* CTA Button */}
        {cta && (
          <div style={{ padding: collapsed ? '12px 10px' : '12px 14px', borderBottom: `1px solid ${SIDEBAR_BORDER}` }}>
            <button
              onClick={() => navigate(cta.path)}
              style={{
                width: '100%', padding: collapsed ? '9px 0' : '9px 0',
                background: CTA_GREEN, border: 'none', borderRadius: 8,
                color: '#ffffff', fontWeight: 700,
                fontSize: collapsed ? 16 : 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                boxShadow: '0 2px 8px rgba(22,163,74,0.35)',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#15803d'}
              onMouseLeave={e => e.currentTarget.style.background = CTA_GREEN}
            >
              <PlusOutlined style={{ fontSize: 13 }} />
              {!collapsed && cta.label}
            </button>
          </div>
        )}

        {/* Navigation */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '10px 0' }}>
          <Menu
            theme="dark" mode="inline"
            selectedKeys={[activeKey]}
            onClick={({ key }) => navigate(key)}
            style={{ background: 'transparent', border: 'none' }}
            items={navItems.map(item => ({
              key: item.key,
              icon: (
                <span style={{
                  fontSize: 16,
                  color: activeKey === item.key ? NAV_ACTIVE : NAV_INACTIVE,
                  transition: 'color 0.2s',
                }}>
                  {item.icon}
                </span>
              ),
              label: (
                <span style={{
                  color: activeKey === item.key ? NAV_ACTIVE : NAV_INACTIVE,
                  fontWeight: activeKey === item.key ? 600 : 400,
                  fontSize: 14,
                  transition: 'color 0.2s',
                }}>
                  {item.label}
                </span>
              ),
              style: {
                margin: '2px 8px',
                borderRadius: 8,
                height: 44,
                lineHeight: '44px',
                background: activeKey === item.key ? ACTIVE_BG : 'transparent',
                transition: 'all 0.2s',
              },
            }))}
          />
        </div>

        {/* User info + logout at bottom */}
        <div style={{ borderTop: `1px solid ${SIDEBAR_BORDER}` }}>
          {!collapsed ? (
            <>
              <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar size={36} style={{ background: LOGO_GREEN, fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </Avatar>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ color: '#ffffff', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user?.firstName} {user?.lastName}
                  </div>
                  <div style={{ color: NAV_INACTIVE, fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {meta.label}
                  </div>
                </div>
              </div>
              <div style={{ padding: '0 14px 14px' }}>
                <button
                  onClick={async () => { await logout(); navigate('/login'); }}
                  style={{
                    width: '100%', padding: '8px 0', borderRadius: 8,
                    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                    color: '#d1d5db', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.13)'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#d1d5db'; }}
                >
                  <LogoutOutlined style={{ fontSize: 13 }} /> Logout
                </button>
              </div>
            </>
          ) : (
            <div style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <Avatar size={34} style={{ background: LOGO_GREEN, fontWeight: 700, fontSize: 12 }}>
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </Avatar>
              <Tooltip title="Logout" placement="right">
                <LogoutOutlined style={{ color: NAV_INACTIVE, fontSize: 14, cursor: 'pointer' }}
                  onClick={async () => { await logout(); navigate('/login'); }} />
              </Tooltip>
            </div>
          )}
        </div>
      </Sider>

      {/* ─── Main area ─────────────────────────────────────────────────────── */}
      <Layout style={{ marginLeft: collapsed ? 68 : siderWidth, transition: 'margin 0.2s ease', background: '#f5f7fa' }}>

        {/* Header */}
        <Header style={{
          background: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          padding: '0 20px',
          height: 64,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 100,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          gap: 16,
        }}>
          {/* Left: collapse + search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ color: '#6b7280', fontSize: 17, width: 38, height: 38, flexShrink: 0 }}
            />
            <Input
              prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
              placeholder="Search policies, claims..."
              style={{
                background: '#f3f4f6', border: 'none', borderRadius: 8,
                maxWidth: 360, height: 38, fontSize: 13,
              }}
            />
          </div>

          {/* Right: actions + user */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, height: 64 }}>
            {/* Emergency Claim — shown for payer/claims roles */}
            {['payer_admin','claims_officer','finance_officer','superadmin'].includes(user?.role) && (
              <button
                onClick={() => navigate(user?.role === 'superadmin' ? '/admin/reports' : '/payer/claims')}
                style={{
                  height: 34, padding: '0 12px', borderRadius: 7, border: `1.5px solid ${LOGO_GREEN}`,
                  background: 'transparent', color: LOGO_GREEN, fontWeight: 600, fontSize: 12,
                  cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s', lineHeight: '34px',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f0fdf4'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                Emergency Claim
              </button>
            )}

            {/* ETB Wallet / Reports shortcut */}
            <button
              onClick={() => {
                const reportPaths = { superadmin: '/admin/reports', provider_admin: '/provider/claims', institution_admin: '/institution/claims', insured_person: '/insured/claims' };
                navigate(reportPaths[user?.role] || '/payer/reports');
              }}
              style={{
                height: 34, padding: '0 14px', borderRadius: 7, border: 'none',
                background: PRIMARY_NAVY, color: '#ffffff', fontWeight: 600, fontSize: 12,
                cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background 0.2s', lineHeight: '34px',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#162d4a'; }}
              onMouseLeave={e => { e.currentTarget.style.background = PRIMARY_NAVY; }}
            >
              ETB Wallet
            </button>

            {/* Notifications */}
            <Badge count={3} size="small">
              <Button type="text" icon={<BellOutlined />}
                style={{ color: '#6b7280', fontSize: 18, width: 38, height: 38 }} />
            </Badge>

            <Button type="text" icon={<QuestionCircleOutlined />}
              style={{ color: '#6b7280', fontSize: 17, width: 38, height: 38 }} />

            {/* Avatar dropdown */}
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
              <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <Avatar
                  size={36}
                  style={{ background: LOGO_GREEN, fontWeight: 700, fontSize: 13 }}
                >
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </Avatar>
              </div>
            </Dropdown>
          </div>
        </Header>

        <Content style={{ padding: '24px', minHeight: 'calc(100vh - 64px)', background: '#f5f7fa' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
