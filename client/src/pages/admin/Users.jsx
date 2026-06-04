import { useEffect, useState } from 'react';
import { Table, Typography, Tag, Space, Button, Select, Input, Modal, Form, Avatar, message, Popconfirm, Descriptions, Row, Col, Tabs, Spin } from 'antd';
import { SearchOutlined, PlusOutlined, EyeOutlined, StopOutlined, CheckCircleOutlined, UserOutlined, BankOutlined, TeamOutlined, DownOutlined, RightOutlined } from '@ant-design/icons';
import api from '../../api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const ROLE_COLOR = {
  superadmin:        '#ec4899',
  payer_admin:       '#1e3a5f',
  underwriter:       '#8b5cf6',
  claims_officer:    '#f59e0b',
  finance_officer:   '#14b8a6',
  sales_broker:      '#a855f7',
  provider_admin:    '#10b981',
  institution_admin: '#f97316',
  insured_person:    '#22c55e',
  customer_support:  '#3b82f6',
};
const ROLE_LABEL = {
  superadmin: 'Super Admin', payer_admin: 'Payer Admin', underwriter: 'Underwriter',
  claims_officer: 'Claims Officer', finance_officer: 'Finance Officer',
  sales_broker: 'Sales Broker', provider_admin: 'Provider Admin',
  institution_admin: 'Institution HR', insured_person: 'Insured Person',
  customer_support: 'Support',
};

function RoleBadge({ role }) {
  const color = ROLE_COLOR[role] || '#9ca3af';
  return (
    <span style={{ background: `${color}18`, color, border: `1px solid ${color}33`, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {ROLE_LABEL[role] || role}
    </span>
  );
}

function StatusBadge({ active }) {
  return (
    <span style={{ background: active ? '#dcfce7' : '#fee2e2', color: active ? '#16a34a' : '#dc2626', border: `1px solid ${active ? '#bbf7d0' : '#fecaca'}`, borderRadius: 20, padding: '2px 9px', fontSize: 11, fontWeight: 700 }}>
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function UserRow({ u }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 34, height: 34, borderRadius: '50%', background: `${ROLE_COLOR[u.role] || '#9ca3af'}20`, border: `1px solid ${ROLE_COLOR[u.role] || '#9ca3af'}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: ROLE_COLOR[u.role] || '#9ca3af', flexShrink: 0 }}>
        {u.firstName?.[0]}{u.lastName?.[0]}
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>{u.firstName} {u.lastName}</div>
        <div style={{ fontSize: 11, color: '#9ca3af' }}>{u.email}</div>
      </div>
    </div>
  );
}

// ── Flat user table (for Staff + Self-registered tabs) ────────────────────────
function FlatTable({ users, loading, onToggle, onView, showRole = true }) {
  const columns = [
    { title: 'User', key: 'u', render: (_, r) => <UserRow u={r} /> },
    showRole && { title: 'Role', key: 'r', width: 160, render: (_, r) => <RoleBadge role={r.role} /> },
    { title: 'Phone', key: 'p', width: 140, render: (_, r) => <span style={{ color: '#6b7280', fontSize: 12 }}>{r.phone || '—'}</span> },
    { title: 'Status', key: 's', width: 90, render: (_, r) => <StatusBadge active={r.isActive} /> },
    { title: 'Joined', key: 'j', width: 110, render: (_, r) => <span style={{ color: '#9ca3af', fontSize: 11 }}>{dayjs(r.createdAt).format('MMM D, YYYY')}</span> },
    {
      title: '', key: 'a', width: 80,
      render: (_, r) => (
        <Space size={4}>
          <button onClick={() => onView(r)} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, color: '#374151', padding: '4px 8px', cursor: 'pointer', fontSize: 13 }}>
            <EyeOutlined />
          </button>
          <Popconfirm title={`${r.isActive ? 'Deactivate' : 'Activate'} this user?`} onConfirm={() => onToggle(r)} okText="Yes">
            <button style={{ background: r.isActive ? '#fef2f2' : '#f0fdf4', border: `1px solid ${r.isActive ? '#fecaca' : '#bbf7d0'}`, borderRadius: 6, color: r.isActive ? '#dc2626' : '#16a34a', padding: '4px 8px', cursor: 'pointer', fontSize: 13 }}>
              {r.isActive ? <StopOutlined /> : <CheckCircleOutlined />}
            </button>
          </Popconfirm>
        </Space>
      ),
    },
  ].filter(Boolean);

  return (
    <Table dataSource={users} columns={columns} rowKey="_id" loading={loading}
      pagination={{ pageSize: 15, showTotal: t => `${t} users` }} size="small"
      locale={{ emptyText: <div style={{ padding: '24px 0', color: '#9ca3af' }}>No users found</div> }} />
  );
}

// ── Grouped section (institution or broker) ───────────────────────────────────
function GroupSection({ title, subtitle, icon, color, members, onToggle, onView }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ background: '#f9fafb', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, fontSize: 17 }}>{icon}</div>
          <div>
            <div style={{ fontWeight: 700, color: '#111827', fontSize: 14 }}>{title}</div>
            <div style={{ color: '#6b7280', fontSize: 12 }}>{subtitle}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ background: `${color}15`, color, borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>{members.length} member{members.length !== 1 ? 's' : ''}</span>
          {open ? <DownOutlined style={{ color: '#9ca3af', fontSize: 12 }} /> : <RightOutlined style={{ color: '#9ca3af', fontSize: 12 }} />}
        </div>
      </div>
      {open && (
        <div style={{ padding: '0 4px 4px' }}>
          <FlatTable users={members} onToggle={onToggle} onView={onView} showRole={false} />
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminUsers() {
  const [flatUsers, setFlatUsers]   = useState([]);
  const [flatTotal, setFlatTotal]   = useState(0);
  const [flatLoading, setFlatLoading] = useState(false);
  const [grouped, setGrouped]       = useState(null);
  const [groupedLoading, setGroupedLoading] = useState(false);
  const [page, setPage]             = useState(1);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch]         = useState('');
  const [selected, setSelected]     = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating]     = useState(false);
  const [createForm]                = Form.useForm();
  const [activeTab, setActiveTab]   = useState('staff');

  // Flat list (All Users tab)
  const fetchFlat = async () => {
    setFlatLoading(true);
    try {
      const p = new URLSearchParams({ page, limit: 15 });
      if (roleFilter) p.set('role', roleFilter);
      if (search)     p.set('search', search);
      const res = await api.get(`/admin/users?${p}`);
      setFlatUsers(res.data.users);
      setFlatTotal(res.data.total || res.data.users.length);
    } catch (err) { console.error(err); }
    finally { setFlatLoading(false); }
  };

  // Grouped view
  const fetchGrouped = async () => {
    if (grouped) return; // already loaded
    setGroupedLoading(true);
    try {
      const res = await api.get('/admin/users/grouped');
      setGrouped(res.data);
    } catch (err) { console.error(err); }
    finally { setGroupedLoading(false); }
  };

  useEffect(() => { fetchFlat(); }, [page, roleFilter, search]);
  useEffect(() => {
    if (['institution', 'broker', 'individual'].includes(activeTab)) fetchGrouped();
  }, [activeTab]);

  const handleToggle = async (u) => {
    try {
      const res = await api.patch(`/admin/users/${u._id}/toggle`);
      const updated = res.data.user;
      setFlatUsers(prev => prev.map(x => x._id === updated._id ? updated : x));
      if (grouped) {
        setGrouped(prev => ({
          ...prev,
          staff:          prev.staff?.map(x => x._id === updated._id ? updated : x),
          selfRegistered: prev.selfRegistered?.map(x => x._id === updated._id ? updated : x),
          byInstitution:  prev.byInstitution?.map(g => ({ ...g, members: g.members.map(x => x._id === updated._id ? updated : x) })),
          byBroker:       prev.byBroker?.map(g => ({ ...g, customers: g.customers.map(x => x._id === updated._id ? updated : x) })),
        }));
      }
      message.success(`User ${updated.isActive ? 'activated' : 'deactivated'}`);
    } catch { message.error('Failed to update user'); }
  };

  const handleCreate = async (values) => {
    setCreating(true);
    try {
      await api.post('/admin/users', values);
      message.success('User created');
      setCreateOpen(false); createForm.resetFields();
      fetchFlat(); setGrouped(null);
    } catch (err) { message.error(err.response?.data?.message || 'Failed to create user'); }
    finally { setCreating(false); }
  };

  const openView = (u) => { setSelected(u); setDetailOpen(true); };

  const totalInsured = grouped
    ? (grouped.selfRegistered?.length || 0) +
      (grouped.byInstitution?.reduce((s, g) => s + g.members.length, 0) || 0) +
      (grouped.byBroker?.reduce((s, g) => s + g.customers.length, 0) || 0)
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={3} style={{ color: '#111827', margin: 0 }}>User Management</Title>
          <Text style={{ color: '#6b7280' }}>{flatTotal} total users across all roles</Text>
        </div>
        <Button icon={<PlusOutlined />} onClick={() => { createForm.resetFields(); setCreateOpen(true); }}
          style={{ background: '#1e3a5f', borderColor: '#1e3a5f', color: '#fff', borderRadius: 8, height: 38, fontWeight: 600 }}>
          Add User
        </Button>
      </div>

      {/* Summary badges */}
      {grouped && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { label: 'Staff',           count: grouped.staff?.length || 0,          color: '#1e3a5f', icon: <UserOutlined /> },
            { label: 'Self-Registered', count: grouped.selfRegistered?.length || 0, color: '#22c55e', icon: <UserOutlined /> },
            { label: 'Institution',     count: grouped.byInstitution?.reduce((s,g)=>s+g.members.length,0)||0, color: '#f97316', icon: <BankOutlined /> },
            { label: 'Broker-Managed',  count: grouped.byBroker?.reduce((s,g)=>s+g.customers.length,0)||0,    color: '#8b5cf6', icon: <TeamOutlined /> },
          ].map(b => (
            <div key={b.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: b.color }}>{b.icon}</span>
              <span style={{ fontWeight: 700, color: '#111827' }}>{b.count}</span>
              <span style={{ color: '#6b7280', fontSize: 13 }}>{b.label}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} style={{ padding: '0 20px' }}
          items={[
            {
              key: 'all',
              label: 'All Users',
              children: (
                <div style={{ padding: '0 0 20px' }}>
                  <Space style={{ marginBottom: 16 }} wrap>
                    <Input prefix={<SearchOutlined style={{ color: '#9ca3af' }} />} placeholder="Search name or email…"
                      value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                      style={{ width: 260, background: '#f8f9fc', borderColor: '#e8edf3' }} allowClear />
                    <Select placeholder="All roles" allowClear value={roleFilter || undefined}
                      onChange={v => { setRoleFilter(v || ''); setPage(1); }} style={{ width: 160 }}
                      options={Object.entries(ROLE_LABEL).map(([v, l]) => ({ value: v, label: l }))} />
                  </Space>
                  <FlatTable users={flatUsers} loading={flatLoading} onToggle={handleToggle} onView={openView} />
                </div>
              ),
            },
            {
              key: 'staff',
              label: 'Staff',
              children: (
                <div style={{ padding: '0 0 20px' }}>
                  {groupedLoading ? <div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>
                    : <FlatTable users={grouped?.staff || []} onToggle={handleToggle} onView={openView} />}
                </div>
              ),
            },
            {
              key: 'individual',
              label: `Self-Registered${grouped ? ` (${grouped.selfRegistered?.length || 0})` : ''}`,
              children: (
                <div style={{ padding: '0 0 20px' }}>
                  {groupedLoading ? <div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>
                    : <FlatTable users={grouped?.selfRegistered || []} onToggle={handleToggle} onView={openView} showRole={false} />}
                </div>
              ),
            },
            {
              key: 'institution',
              label: `By Institution${grouped ? ` (${grouped.byInstitution?.length || 0})` : ''}`,
              children: (
                <div style={{ padding: '0 0 20px' }}>
                  {groupedLoading
                    ? <div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>
                    : grouped?.byInstitution?.length
                      ? grouped.byInstitution.map((g, i) => (
                          <GroupSection key={i}
                            title={g.institution?.name || 'Unknown Institution'}
                            subtitle={`${g.members.length} enrolled employee${g.members.length !== 1 ? 's' : ''}`}
                            icon={<BankOutlined />} color="#f97316"
                            members={g.members} onToggle={handleToggle} onView={openView} />
                        ))
                      : <div style={{ padding: '32px 0', textAlign: 'center', color: '#9ca3af' }}>No institution-enrolled users yet</div>
                  }
                </div>
              ),
            },
            {
              key: 'broker',
              label: `By Broker${grouped ? ` (${grouped.byBroker?.length || 0})` : ''}`,
              children: (
                <div style={{ padding: '0 0 20px' }}>
                  {groupedLoading
                    ? <div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>
                    : grouped?.byBroker?.length
                      ? grouped.byBroker.map((g, i) => (
                          <GroupSection key={i}
                            title={`${g.broker?.firstName || ''} ${g.broker?.lastName || ''}`.trim() || 'Unknown Broker'}
                            subtitle={`${g.customers.length} customer${g.customers.length !== 1 ? 's' : ''} · ${g.broker?.email || ''}`}
                            icon={<TeamOutlined />} color="#8b5cf6"
                            members={g.customers} onToggle={handleToggle} onView={openView} />
                        ))
                      : <div style={{ padding: '32px 0', textAlign: 'center', color: '#9ca3af' }}>No broker-managed users yet</div>
                  }
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* User detail modal */}
      <Modal open={detailOpen} onCancel={() => setDetailOpen(false)} footer={null}
        title={selected ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${ROLE_COLOR[selected.role] || '#9ca3af'}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: ROLE_COLOR[selected.role] || '#9ca3af' }}>
              {selected.firstName?.[0]}{selected.lastName?.[0]}
            </div>
            <span style={{ fontWeight: 700 }}>{selected.firstName} {selected.lastName}</span>
          </div>
        ) : null}
      >
        {selected && (
          <Descriptions column={1} size="small" labelStyle={{ color: '#9ca3af', width: 140 }} contentStyle={{ color: '#111827' }} style={{ marginTop: 8 }}>
            <Descriptions.Item label="Email">{selected.email}</Descriptions.Item>
            <Descriptions.Item label="Role"><RoleBadge role={selected.role} /></Descriptions.Item>
            <Descriptions.Item label="Phone">{selected.phone || '—'}</Descriptions.Item>
            <Descriptions.Item label="Status"><StatusBadge active={selected.isActive} /></Descriptions.Item>
            <Descriptions.Item label="Email Verified">{selected.isEmailVerified ? '✓ Yes' : '✗ No'}</Descriptions.Item>
            <Descriptions.Item label="Joined">{dayjs(selected.createdAt).format('MMMM D, YYYY')}</Descriptions.Item>
            {selected.registeredByBroker && (
              <Descriptions.Item label="Registered By">
                {typeof selected.registeredByBroker === 'object'
                  ? `${selected.registeredByBroker.firstName} ${selected.registeredByBroker.lastName}`
                  : 'Sales Broker'}
              </Descriptions.Item>
            )}
            {selected.institutionId && <Descriptions.Item label="Institution">Employer-enrolled</Descriptions.Item>}
            {selected.brokerStatus && (
              <Descriptions.Item label="Broker Status">
                <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{selected.brokerStatus}</span>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>

      {/* Create user modal */}
      <Modal title="Create New User" open={createOpen} onCancel={() => setCreateOpen(false)}
        onOk={() => createForm.submit()} confirmLoading={creating} okText="Create User"
        okButtonProps={{ style: { background: '#1e3a5f', borderColor: '#1e3a5f' } }}>
        <Form form={createForm} onFinish={handleCreate} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="firstName" label="First Name" rules={[{ required: true }]}>
                <Input prefix={<UserOutlined style={{ color: '#9ca3af' }} />} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="lastName" label="Last Name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="email" label="Email" rules={[{ required: true }, { type: 'email' }]}>
            <Input />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="role" label="Role" initialValue="insured_person" rules={[{ required: true }]}>
                <Select options={Object.entries(ROLE_LABEL).map(([v, l]) => ({ value: v, label: l }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="Phone (optional)">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="password" label="Password" rules={[{ required: true }, { min: 8 }]}>
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
