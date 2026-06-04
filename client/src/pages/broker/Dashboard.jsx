import { useEffect, useState } from 'react';
import { Table, Tag, Typography, Spin, Avatar } from 'antd';
import { UserAddOutlined, TeamOutlined, SafetyOutlined, ClockCircleOutlined, ArrowRightOutlined, TrophyOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import dayjs from 'dayjs';

const { Text } = Typography;

function StatBox({ label, value, icon, color, sub }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '20px 22px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', flex: 1, minWidth: 140 }}>
      <div style={{ width: 42, height: 42, borderRadius: 10, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, fontSize: 19, marginBottom: 14 }}>{icon}</div>
      <div style={{ color: '#6b7280', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{label}</div>
      <div style={{ color: '#111827', fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

export default function BrokerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    api.get('/broker/customers')
      .then(r => setCustomers(Array.isArray(r.data.customers) ? r.data.customers : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const active   = customers.filter(c => c.isActive).length;
  const pending  = customers.filter(c => !c.isActive).length;
  const thisMonth = customers.filter(c => dayjs(c.createdAt).isAfter(dayjs().startOf('month'))).length;

  const columns = [
    {
      title: 'Customer', key: 'name',
      render: (_, r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 12, flexShrink: 0 }}>
            {r.firstName?.[0]}{r.lastName?.[0]}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>{r.firstName} {r.lastName}</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>{r.email}</div>
          </div>
        </div>
      ),
    },
    { title: 'Phone', dataIndex: 'phone', key: 'phone', render: v => <span style={{ color: '#6b7280' }}>{v || '—'}</span> },
    { title: 'Joined', dataIndex: 'createdAt', key: 'joined', render: v => <span style={{ color: '#6b7280', fontSize: 13 }}>{dayjs(v).format('MMM D, YYYY')}</span> },
    {
      title: 'Status', dataIndex: 'isActive', key: 'status',
      render: v => (
        <span style={{
          background: v ? '#dcfce7' : '#fef9c3',
          color: v ? '#16a34a' : '#ca8a04',
          border: `1px solid ${v ? '#bbf7d0' : '#fde68a'}`,
          borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700,
          display: 'inline-flex', alignItems: 'center', gap: 5,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: v ? '#16a34a' : '#ca8a04', display: 'inline-block' }} />
          {v ? 'Active' : 'Pending'}
        </span>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Hero ── */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%)', borderRadius: 16, padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20, color: '#fff', flexShrink: 0 }}>
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sales Broker Dashboard</div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 20 }}>Welcome back, {user?.firstName}!</div>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 2 }}>{dayjs().format('dddd, MMMM D, YYYY')}</div>
          </div>
        </div>
        <button onClick={() => navigate('/broker/register-customer')}
          style={{ background: '#22c55e', border: 'none', borderRadius: 9, color: '#fff', padding: '11px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <UserAddOutlined /> Add Customer
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <StatBox label="Total Customers"    value={customers.length} icon={<TeamOutlined />}         color="#1d4ed8" sub="All time" />
        <StatBox label="Active Customers"   value={active}           icon={<SafetyOutlined />}        color="#10b981" sub="With active coverage" />
        <StatBox label="Pending Activation" value={pending}          icon={<ClockCircleOutlined />}   color="#f59e0b" sub="Awaiting approval" />
        <StatBox label="Joined This Month"  value={thisMonth}        icon={<TrophyOutlined />}        color="#8b5cf6" sub={dayjs().format('MMMM YYYY')} />
      </div>

      {/* ── Customer table ── */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>My Customers</div>
            <div style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>{customers.length} registered · {active} active</div>
          </div>
          <button onClick={() => navigate('/broker/register-customer')}
            style={{ background: '#1e3a5f', border: 'none', borderRadius: 8, color: '#fff', padding: '8px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <UserAddOutlined /> Add Customer
          </button>
        </div>
        {loading
          ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>
          : <Table dataSource={customers} columns={columns} rowKey="_id" pagination={{ pageSize: 8 }} size="small"
              locale={{ emptyText: <div style={{ padding: '32px 0', color: '#9ca3af' }}>No customers yet — click "Add Customer" to register your first client</div> }} />
        }
      </div>

    </div>
  );
}
