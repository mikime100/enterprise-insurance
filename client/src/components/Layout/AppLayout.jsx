import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Typography, Space, Button, Tooltip, Badge, Divider } from 'antd';
import {
  DashboardOutlined, FileTextOutlined, SafetyOutlined, AlertOutlined,
  UserOutlined, TeamOutlined, BarChartOutlined, LogoutOutlined,
  MenuFoldOutlined, MenuUnfoldOutlined, ShopOutlined, BellOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

const NAV = {
  customer: [
    { key: '/customer/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/customer/quotes',    icon: <FileTextOutlined />,  label: 'Get a Quote' },
    { key: '/customer/policies',  icon: <SafetyOutlined />,    label: 'My Policies' },
    { key: '/customer/claims',    icon: <AlertOutlined />,     label: 'My Claims' },
    { key: '/customer/profile',   icon: <UserOutlined />,      label: 'Profile' },
  ],
  agent: [
    { key: '/agent/dashboard',  icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/agent/customers',  icon: <TeamOutlined />,      label: 'Customers' },
    { key: '/agent/policies',   icon: <SafetyOutlined />,    label: 'Policies' },
    { key: '/agent/claims',     icon: <AlertOutlined />,     label: 'Claims' },
    { key: '/agent/reports',    icon: <BarChartOutlined />,  label: 'Reports' },
  ],
  admin: [
    { key: '/admin/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/admin/users',     icon: <TeamOutlined />,      label: 'User Management' },
    { key: '/admin/products',  icon: <ShopOutlined />,      label: 'Products' },
    { key: '/admin/reports',   icon: <BarChartOutlined />,  label: 'Reports' },
  ],
};

const ROLE_META = {
  customer:  { label: 'Customer',      color: '#3b82f6', bg: 'rgba(59,130,246,0.12)'  },
  agent:     { label: 'Agent',         color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)'  },
  admin:     { label: 'Administrator', color: '#ec4899', bg: 'rgba(236,72,153,0.12)'  },
};

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = NAV[user?.role] || [];
  const activeKey = navItems.find(i => location.pathname.startsWith(i.key))?.key;
  const meta = ROLE_META[user?.role] || ROLE_META.customer;

  const userMenuItems = [
    {
      key: 'profile', icon: <UserOutlined />, label: 'My Profile',
      onClick: () => navigate(`/${user?.role}/profile`),
    },
    { type: 'divider' },
    {
      key: 'logout', icon: <LogoutOutlined />, label: 'Sign Out', danger: true,
      onClick: async () => { await logout(); navigate('/login'); },
    },
  ];

  const siderWidth = 260;

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f6fa' }}>
      {/* ─── Sidebar ─── */}
      <Sider
        collapsible collapsed={collapsed} trigger={null}
        width={siderWidth} collapsedWidth={72}
        style={{
          background: '#111417',
          borderRight: '1px solid #1e2730',
          position: 'fixed', left: 0, top: 0, bottom: 0,
          zIndex: 200, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Logo */}
        <div style={{
          padding: collapsed ? '14px 0' : '14px 16px',
          borderBottom: '1px solid #1e2730',
          display: 'flex', alignItems: 'center',
          gap: 10, cursor: 'pointer', justifyContent: collapsed ? 'center' : 'flex-start',
          minHeight: 72,
        }} onClick={() => navigate('/')}>
          <img
            src="/logo.png"
            alt="Nile Insurance"
            style={{ height: collapsed ? 40 : 38, width: 'auto', objectFit: 'contain', flexShrink: 0 }}
          />
          {!collapsed && (
            <div style={{ lineHeight: 1.2, overflow: 'hidden' }}>
              <div style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap' }}>Nile Insurance</div>
              <div style={{ color: '#60a5fa', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Management Platform</div>
            </div>
          )}
        </div>

        {/* User card */}
        {!collapsed ? (
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #1e2730' }}>
            <div style={{
              background: 'rgba(255,255,255,0.05)', borderRadius: 10,
              border: '1px solid #1e2730', padding: '12px 14px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <Avatar size={38} style={{ background: meta.color, fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </Avatar>
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.firstName} {user?.lastName}
                </div>
                <div style={{ color: '#64748b', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.email}
                </div>
                <div style={{
                  marginTop: 5, display: 'inline-block',
                  background: meta.bg, color: meta.color,
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
                  textTransform: 'uppercase', padding: '2px 7px', borderRadius: 20,
                  border: `1px solid ${meta.color}44`,
                }}>
                  {meta.label}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '12px 0', borderBottom: '1px solid #1e2730', display: 'flex', justifyContent: 'center' }}>
            <Avatar size={36} style={{ background: meta.color, fontWeight: 700, fontSize: 13 }}>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </Avatar>
          </div>
        )}

        {/* Navigation */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 0' }}>
          {!collapsed && (
            <div style={{ padding: '12px 20px 6px', color: '#374151', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Navigation
            </div>
          )}
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
                  color: activeKey === item.key ? '#60a5fa' : '#64748b',
                  transition: 'color 0.2s',
                }}>
                  {item.icon}
                </span>
              ),
              label: (
                <span style={{
                  color: activeKey === item.key ? '#ffffff' : '#94a3b8',
                  fontWeight: activeKey === item.key ? 600 : 400,
                  fontSize: 14,
                  transition: 'color 0.2s',
                }}>
                  {item.label}
                </span>
              ),
              style: {
                margin: '1px 8px',
                borderRadius: 8,
                height: 42,
                lineHeight: '42px',
                paddingLeft: collapsed ? undefined : 12,
                background: activeKey === item.key
                  ? 'rgba(29,78,216,0.18)'
                  : 'transparent',
                borderLeft: activeKey === item.key ? '2px solid #60a5fa' : '2px solid transparent',
                transition: 'all 0.2s',
              },
            }))}
          />
        </div>

        {/* Bottom links */}
        <div style={{ padding: '8px 8px 12px', borderTop: '1px solid #1e2730' }}>
          {!collapsed ? (
            <Space direction="vertical" style={{ width: '100%' }} size={2}>
              <div
                style={{ padding: '8px 12px', borderRadius: 8, cursor: 'pointer', color: '#64748b', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = '#94a3b8'}
                onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
              >
                <QuestionCircleOutlined /> Help & Support
              </div>
              <div
                onClick={async () => { await logout(); navigate('/login'); }}
                style={{ padding: '8px 12px', borderRadius: 8, cursor: 'pointer', color: '#ef444466', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                onMouseLeave={e => e.currentTarget.style.color = '#ef444466'}
              >
                <LogoutOutlined /> Sign Out
              </div>
            </Space>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <Tooltip title="Help" placement="right">
                <Button type="text" icon={<QuestionCircleOutlined />} style={{ color: '#64748b' }} />
              </Tooltip>
              <Tooltip title="Sign Out" placement="right">
                <Button type="text" icon={<LogoutOutlined />} style={{ color: '#ef444466' }}
                  onClick={async () => { await logout(); navigate('/login'); }} />
              </Tooltip>
            </div>
          )}
        </div>
      </Sider>

      {/* ─── Main area ─── */}
      <Layout style={{ marginLeft: collapsed ? 72 : siderWidth, transition: 'margin 0.2s ease', background: '#f5f6fa' }}>
        {/* Header */}
        <Header style={{
          background: '#ffffff', borderBottom: '1px solid #e8edf3',
          padding: '0 24px', height: 64,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 100,
          boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ color: '#6b7280', fontSize: 17, width: 40, height: 40 }}
          />

          <Space size={8}>
            <Tooltip title="Notifications">
              <Badge count={3} size="small" offset={[-2, 2]}>
                <Button type="text" icon={<BellOutlined />} style={{ color: '#6b7280', fontSize: 17, width: 40, height: 40 }} />
              </Badge>
            </Tooltip>

            <div style={{ width: 1, height: 24, background: '#e8edf3' }} />

            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '4px 8px', borderRadius: 8, transition: 'background 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <Avatar size={34} style={{ background: meta.color, fontWeight: 700, fontSize: 13 }}>
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </Avatar>
                <div>
                  <div style={{ color: '#111827', fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>
                    {user?.firstName} {user?.lastName}
                  </div>
                  <div style={{ color: meta.color, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {meta.label}
                  </div>
                </div>
              </div>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{ padding: '24px', minHeight: 'calc(100vh - 64px)', background: '#f5f6fa' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
