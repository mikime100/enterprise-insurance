import { useEffect, useState } from 'react';
import { Card, Table, Tag, Typography, Space, Avatar, Input, Button, Spin } from 'antd';
import { SearchOutlined, UserAddOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import api from '../../api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function BrokerCustomers() {
  const [customers, setCustomers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/broker/customers')
      .then(r => {
        const data = Array.isArray(r.data.customers) ? r.data.customers : [];
        setCustomers(data);
        setFiltered(data);
      })
      .catch(err => console.error('Customers load failed:', err))
      .finally(() => setLoading(false));
  }, []);

  const onSearch = (val) => {
    setSearch(val);
    const q = val.toLowerCase();
    setFiltered(customers.filter(c =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    ));
  };

  const columns = [
    {
      title: 'Customer', key: 'name',
      render: (_, r) => (
        <Space>
          <Avatar size={36} style={{ background: '#1d4ed8', fontSize: 13 }}>{r.firstName?.[0]}{r.lastName?.[0]}</Avatar>
          <div>
            <div style={{ fontWeight: 600 }}>{r.firstName} {r.lastName}</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>{r.email}</div>
          </div>
        </Space>
      )
    },
    { title: 'Phone', dataIndex: 'phone', key: 'phone', render: v => v || '—' },
    { title: 'Registered', dataIndex: 'createdAt', key: 'date', render: v => dayjs(v).format('MMM D, YYYY') },
    {
      title: 'Status', dataIndex: 'isActive', key: 'status',
      render: v => <Tag color={v ? 'green' : 'orange'}>{v ? 'Active' : 'Pending activation'}</Tag>
    },
    {
      title: 'Password', dataIndex: 'mustChangePassword', key: 'pwd',
      render: v => v ? <Tag color="orange">Temp password</Tag> : <Tag color="green">Set</Tag>
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#111827' }}>My Customers</Title>
          <Text style={{ color: '#6b7280' }}>All customers you have registered on the platform</Text>
        </div>
        <Link to="/broker/register-customer">
          <Button type="primary" icon={<UserAddOutlined />} style={{ background: '#1d4ed8', border: 'none', borderRadius: 8 }}>
            Register New Customer
          </Button>
        </Link>
      </div>

      <Card style={{ borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ marginBottom: 16 }}>
          <Input
            placeholder="Search by name, email or phone..."
            prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
            value={search}
            onChange={e => onSearch(e.target.value)}
            style={{ maxWidth: 360, borderColor: '#e8edf3', borderRadius: 8 }}
          />
        </div>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>
        ) : (
          <Table
            dataSource={filtered}
            columns={columns}
            rowKey="_id"
            pagination={{ pageSize: 12 }}
            locale={{ emptyText: 'No customers found.' }}
          />
        )}
      </Card>
    </div>
  );
}
