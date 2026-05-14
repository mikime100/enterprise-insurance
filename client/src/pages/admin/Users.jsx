import { useEffect, useState } from 'react';
import {
  Card, Table, Typography, Tag, Space, Button, Select, Input, Modal,
  Form, Avatar, message, Popconfirm, Descriptions, Divider, Row, Col,
} from 'antd';
import {
  SearchOutlined, PlusOutlined, EyeOutlined, StopOutlined,
  CheckCircleOutlined, UserOutlined, SwapOutlined,
} from '@ant-design/icons';
import api from '../../api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const S = { card:{ background:'#ffffff', border:'1px solid #e8edf3', borderRadius:12 } };

const ROLE_CONFIG = {
  customer: { color:'#22c55e', label:'Customer' },
  agent:    { color:'#8b5cf6', label:'Agent' },
  admin:    { color:'#ec4899', label:'Admin' },
};

function RoleBadge({ role }) {
  const cfg = ROLE_CONFIG[role] || { color:'#9ca3af', label:role };
  return (
    <Tag style={{ background:`${cfg.color}18`, color:cfg.color, border:`1px solid ${cfg.color}33`, fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>
      {cfg.label}
    </Tag>
  );
}

export default function AdminUsers() {
  const [users, setUsers]           = useState([]);
  const [agents, setAgents]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch]         = useState('');
  const [createModal, setCreate]    = useState(false);
  const [selected, setSelected]     = useState(null);
  const [detailModal, setDetail]    = useState(false);
  const [assignModal, setAssign]    = useState(false);
  const [creating, setCreating]     = useState(false);
  const [createForm]                = Form.useForm();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, limit:15 });
      if (roleFilter) p.set('role', roleFilter);
      if (search)     p.set('search', search);
      const res = await api.get(`/users?${p}`);
      setUsers(res.data.users);
      setTotal(res.data.total);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, [page, roleFilter, search]);
  useEffect(() => { api.get('/users/agents').then(r => setAgents(r.data.agents)); }, []);

  const handleCreate = async (values) => {
    setCreating(true);
    try {
      await api.post('/users', values);
      message.success('User created successfully');
      setCreate(false);
      createForm.resetFields();
      fetchUsers();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to create user');
    } finally { setCreating(false); }
  };

  const handleToggleActive = async (user) => {
    try {
      const res = await api.patch(`/users/${user._id}/toggle-active`);
      setUsers(prev => prev.map(u => u._id === user._id ? res.data.user : u));
      message.success(`User ${res.data.user.isActive ? 'activated' : 'deactivated'}`);
    } catch { message.error('Failed to update user status'); }
  };

  const handleAssignAgent = async (agentId) => {
    try {
      await api.patch(`/users/${selected._id}/assign-agent`, { agentId: agentId || null });
      message.success('Agent assigned successfully');
      setAssign(false);
      fetchUsers();
    } catch { message.error('Failed to assign agent'); }
  };

  const columns = [
    {
      title: 'User', width: 240,
      render: (_, r) => (
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Avatar size={36} style={{ background:`${ROLE_CONFIG[r.role]?.color || '#9ca3af'}18`, color:ROLE_CONFIG[r.role]?.color || '#9ca3af', fontWeight:700, fontSize:12, border:`1px solid ${ROLE_CONFIG[r.role]?.color || '#9ca3af'}33`, flexShrink:0 }}>
            {r.firstName?.[0]}{r.lastName?.[0]}
          </Avatar>
          <div>
            <Text style={{ color:'#111827', fontWeight:600, fontSize:13 }}>{r.firstName} {r.lastName}</Text>
            <div style={{ color:'#9ca3af', fontSize:11 }}>{r.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Role', width: 110,
      render: (_, r) => <RoleBadge role={r.role} />,
    },
    {
      title: 'Phone', width: 130,
      render: (_, r) => <Text style={{ color:'#6b7280', fontSize:12 }}>{r.phone || '—'}</Text>,
    },
    {
      title: 'Agent', width: 160,
      render: (_, r) => r.role === 'customer'
        ? <Text style={{ color:'#6b7280', fontSize:12 }}>{r.assignedAgent ? `${r.assignedAgent.firstName} ${r.assignedAgent.lastName}` : 'Unassigned'}</Text>
        : <Text style={{ color:'#e8edf3', fontSize:12 }}>—</Text>,
    },
    {
      title: 'Status', width: 100,
      render: (_, r) => (
        <Tag style={{ background: r.isActive ? '#10b98118' : '#ef444418', color: r.isActive ? '#10b981' : '#ef4444', border:`1px solid ${r.isActive ? '#10b98133' : '#ef444433'}`, fontSize:11 }}>
          {r.isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Joined', width: 110,
      render: (_, r) => <Text style={{ color:'#9ca3af', fontSize:11 }}>{dayjs(r.createdAt).format('MMM D, YYYY')}</Text>,
    },
    {
      title: 'Actions', width: 140,
      render: (_, r) => (
        <Space size={4}>
          <Button size="small" icon={<EyeOutlined />} style={{ background:'#f0f4f8', border:'1px solid #e8edf3', color:'#111827' }}
            onClick={() => { setSelected(r); setDetail(true); }} />
          {r.role === 'customer' && (
            <Button size="small" icon={<SwapOutlined />} style={{ background:'#f0f4f8', border:'1px solid #e8edf3', color:'#6b7280' }}
              onClick={() => { setSelected(r); setAssign(true); }}>
              Assign
            </Button>
          )}
          <Popconfirm title={`${r.isActive ? 'Deactivate' : 'Activate'} this user?`} onConfirm={() => handleToggleActive(r)} okText="Yes">
            <Button size="small" danger={r.isActive} type={r.isActive ? 'default' : 'primary'}
              icon={r.isActive ? <StopOutlined /> : <CheckCircleOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <Title level={4} style={{ color:'#111827', margin:0 }}>User Management</Title>
          <Text style={{ color:'#9ca3af' }}>{total} total users across all roles</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} size="large" style={{ height:42, fontWeight:600 }}
          onClick={() => { createForm.resetFields(); setCreate(true); }}>
          Add User
        </Button>
      </div>

      <Card style={S.card}>
        <Space style={{ marginBottom:16 }} wrap>
          <Input
            prefix={<SearchOutlined style={{ color:'#9ca3af' }} />}
            placeholder="Search by name or email..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ width:280, background:'#f8f9fc', borderColor:'#e8edf3' }} allowClear
          />
          <Select placeholder="All roles" allowClear value={roleFilter||undefined}
            onChange={v => { setRoleFilter(v||''); setPage(1); }} style={{ width:160 }}
            options={Object.entries(ROLE_CONFIG).map(([v,c]) => ({ value:v, label:c.label }))}
          />
        </Space>

        <Table
          dataSource={users} columns={columns} rowKey="_id" loading={loading}
          pagination={{ current:page, pageSize:15, total, onChange:setPage, showTotal:t=>`${t} users` }}
          style={{ background:'#ffffff' }}
        />
      </Card>

      {/* Create user modal */}
      <Modal
        title={<Text style={{ color:'#111827', fontWeight:700 }}>Create New User</Text>}
        open={createModal} onCancel={() => setCreate(false)}
        onOk={() => createForm.submit()} confirmLoading={creating} okText="Create User"
        styles={{ content:{ background:'#ffffff' }, header:{ background:'#ffffff', borderBottom:'1px solid #e8edf3' }, footer:{ background:'#ffffff', borderTop:'1px solid #e8edf3' } }}
      >
        <Form form={createForm} onFinish={handleCreate} layout="vertical" style={{ marginTop:16 }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="firstName" label="First Name" rules={[{ required:true }]}>
                <Input prefix={<UserOutlined style={{ color:'#9ca3af' }} />} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="lastName" label="Last Name" rules={[{ required:true }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="email" label="Email" rules={[{ required:true },{ type:'email' }]}>
            <Input />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="role" label="Role" initialValue="customer" rules={[{ required:true }]}>
                <Select options={Object.entries(ROLE_CONFIG).map(([v,c])=>({ value:v, label:c.label }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="Phone (optional)">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="password" label="Password" rules={[{ required:true },{ min:8 }]}>
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>

      {/* User detail modal */}
      <Modal
        title={
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <Avatar size={36} style={{ background:`${ROLE_CONFIG[selected?.role]?.color || '#9ca3af'}18`, color:ROLE_CONFIG[selected?.role]?.color || '#9ca3af', fontWeight:700 }}>
              {selected?.firstName?.[0]}{selected?.lastName?.[0]}
            </Avatar>
            <Text style={{ color:'#111827', fontWeight:700 }}>{selected?.firstName} {selected?.lastName}</Text>
          </div>
        }
        open={detailModal} onCancel={() => setDetail(false)} footer={null}
        styles={{ content:{ background:'#ffffff' }, header:{ background:'#ffffff', borderBottom:'1px solid #e8edf3' } }}
      >
        {selected && (
          <Descriptions column={1} size="small" labelStyle={{ color:'#9ca3af', width:140 }} contentStyle={{ color:'#111827' }} style={{ marginTop:8 }}>
            <Descriptions.Item label="Email">{selected.email}</Descriptions.Item>
            <Descriptions.Item label="Role"><RoleBadge role={selected.role} /></Descriptions.Item>
            <Descriptions.Item label="Phone">{selected.phone || '—'}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag style={{ background: selected.isActive ? '#10b98118' : '#ef444418', color: selected.isActive ? '#10b981' : '#ef4444', border:`1px solid ${selected.isActive ? '#10b98133' : '#ef444433'}` }}>
                {selected.isActive ? 'Active' : 'Inactive'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Joined">{dayjs(selected.createdAt).format('MMMM D, YYYY')}</Descriptions.Item>
            {selected.role === 'customer' && (
              <Descriptions.Item label="Agent">
                {selected.assignedAgent ? `${selected.assignedAgent.firstName} ${selected.assignedAgent.lastName}` : 'Unassigned'}
              </Descriptions.Item>
            )}
            {selected.address?.city && (
              <Descriptions.Item label="Location">
                {selected.address.city}, {selected.address.state} {selected.address.zip}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>

      {/* Assign agent modal */}
      <Modal
        title={<Text style={{ color:'#111827', fontWeight:700 }}>Assign Agent — {selected?.firstName}</Text>}
        open={assignModal} onCancel={() => setAssign(false)} footer={null}
        styles={{ content:{ background:'#ffffff' }, header:{ background:'#ffffff', borderBottom:'1px solid #e8edf3' } }}
      >
        <Text style={{ color:'#9ca3af', fontSize:13, display:'block', marginBottom:14 }}>
          Select an agent to manage this customer:
        </Text>
        <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:12 }}>
          {agents.map(a => {
            const isCurrentAgent = selected?.assignedAgent?._id === a._id;
            return (
              <div key={a._id} onClick={() => handleAssignAgent(a._id)} style={{
                background: isCurrentAgent ? '#eff6ff' : '#f8f9fc',
                border:`1px solid ${isCurrentAgent ? '#22c55e' : '#e8edf3'}`,
                borderRadius:10, padding:'12px 16px', cursor:'pointer',
                display:'flex', justifyContent:'space-between', alignItems:'center',
                transition:'all 0.15s',
              }}>
                <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                  <Avatar size={34} style={{ background:'#8b5cf618', color:'#8b5cf6', fontWeight:700, border:'1px solid #8b5cf633' }}>
                    {a.firstName?.[0]}{a.lastName?.[0]}
                  </Avatar>
                  <div>
                    <Text style={{ color:'#111827', fontWeight:600, fontSize:13 }}>{a.firstName} {a.lastName}</Text>
                    <div style={{ color:'#9ca3af', fontSize:11 }}>{a.email}</div>
                  </div>
                </div>
                {isCurrentAgent && <Tag style={{ background:'#10b98118', color:'#10b981', border:'1px solid #10b98133', fontSize:11 }}>Current</Tag>}
              </div>
            );
          })}
        </div>
        <Button block danger onClick={() => handleAssignAgent(null)}>Remove Agent Assignment</Button>
      </Modal>
    </div>
  );
}
