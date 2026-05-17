import { useEffect, useState } from 'react';
import { Row, Col, Card, Typography, Spin, Table, Tag, Avatar, Space, Button } from 'antd';
import { UserAddOutlined, TeamOutlined, SafetyOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const S = { card: { background: '#ffffff', border: '1px solid #e8edf3', borderRadius: 12 } };

function StatCard({ label, value, icon, color }) {
  return (
    <Card style={S.card} styles={{ body: { padding: '18px 20px' } }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Text style={{ color: '#9ca3af', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 8 }}>{label}</Text>
          <div style={{ color: '#111827', fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{value}</div>
        </div>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}18`, border: `1px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, fontSize: 17 }}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

export default function BrokerDashboard() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/broker/customers')
      .then(r => setCustomers(Array.isArray(r.data.customers) ? r.data.customers : []))
      .catch(err => console.error('Dashboard load failed:', err))
      .finally(() => setLoading(false));
  }, []);

  const active = customers.filter(c => c.isActive).length;

  const columns = [
    {
      title: 'Customer', key: 'name',
      render: (_, r) => (
        <Space>
          <Avatar size={32} style={{ background: '#1d4ed8', fontSize: 12 }}>{r.firstName?.[0]}{r.lastName?.[0]}</Avatar>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{r.firstName} {r.lastName}</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>{r.email}</div>
          </div>
        </Space>
      )
    },
    { title: 'Phone', dataIndex: 'phone', key: 'phone', render: v => v || '—' },
    { title: 'Joined', dataIndex: 'createdAt', key: 'joined', render: v => dayjs(v).format('MMM D, YYYY') },
    { title: 'Status', dataIndex: 'isActive', key: 'status', render: v => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag> },
  ];

  return (
    <div>
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%)', borderRadius: 16, padding: '22px 28px', marginBottom: 24 }}>
        <Title level={4} style={{ color: '#fff', margin: 0, fontWeight: 800 }}>Broker Dashboard</Title>
        <Text style={{ color: 'rgba(255,255,255,0.7)' }}>Welcome back, {user?.firstName} · {dayjs().format('MMMM D, YYYY')}</Text>
      </div>

      <Row gutter={[14, 14]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}><StatCard label="Total Customers" value={customers.length} icon={<TeamOutlined />} color="#1d4ed8" /></Col>
        <Col xs={24} sm={8}><StatCard label="Active Customers" value={active} icon={<SafetyOutlined />} color="#10b981" /></Col>
        <Col xs={24} sm={8}><StatCard label="Pending" value={customers.length - active} icon={<ClockCircleOutlined />} color="#f59e0b" /></Col>
      </Row>

      <Card
        style={S.card}
        title={<Text style={{ color: '#111827', fontWeight: 700 }}>My Customers</Text>}
        extra={
          <Link to="/broker/register-customer">
            <Button type="primary" icon={<UserAddOutlined />} style={{ background: '#1d4ed8', border: 'none', borderRadius: 8 }}>
              Add Customer
            </Button>
          </Link>
        }
      >
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>
        ) : (
          <Table
            dataSource={customers}
            columns={columns}
            rowKey="_id"
            pagination={{ pageSize: 8 }}
            locale={{ emptyText: 'No customers yet — click "Add Customer" to register your first client.' }}
          />
        )}
      </Card>
    </div>
  );
}
