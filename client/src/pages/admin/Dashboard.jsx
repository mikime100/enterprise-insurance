import { useEffect, useState } from 'react';
import { Row, Col, Card, Typography, Spin, Table, Tag, Progress, Avatar, Space, Button, message, Badge } from 'antd';
import { TeamOutlined, SafetyOutlined, AlertOutlined, UserOutlined, DollarOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import api from '../../api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const S = { card: { background: '#ffffff', border: '1px solid #e8edf3', borderRadius: 12 } };
const TYPE_COLORS   = ['#22c55e', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];
const STATUS_COLORS = { submitted: '#22c55e', acknowledged: '#06b6d4', under_review: '#f59e0b', documentation_requested: '#8b5cf6', investigation: '#6366f1', assessment: '#eab308', approved: '#10b981', partially_approved: '#84cc16', denied: '#ef4444', settled: '#10b981', closed: '#9ca3af' };
const TT_STYLE      = { contentStyle: { background: '#f0f4f8', border: '1px solid #e8edf3', borderRadius: 8 }, labelStyle: { color: '#111827' }, itemStyle: { color: '#6b7280' } };

function StatCard({ label, value, sub, icon, color, borderClass }) {
  return (
    <Card className={`ei-card-hover ${borderClass}`} style={S.card} styles={{ body: { padding: '18px 20px' } }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, minWidth: 0 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <Text style={{ color: '#9ca3af', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</Text>
          <div style={{ color: '#111827', fontSize: 24, fontWeight: 800, lineHeight: 1 }}>{value}</div>
          {sub && <div style={{ color: '#9ca3af', fontSize: 11, marginTop: 5 }}>{sub}</div>}
        </div>
        <div style={{ flexShrink: 0, width: 38, height: 38, borderRadius: 10, background: `${color}18`, border: `1px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, fontSize: 17 }}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

export default function AdminDashboard() {
  const [summary, setSummary]         = useState(null);
  const [claimsByStatus, setByStatus] = useState([]);
  const [policiesByType, setByType]   = useState([]);
  const [claimsTrend, setTrend]       = useState([]);
  const [brokers, setBrokers]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [brokerLoading, setBrokerLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});

  const loadBrokers = () => {
    setBrokerLoading(true);
    api.get('/admin/brokers', { params: { status: 'pending' } })
      .then(r => setBrokers(Array.isArray(r.data.brokers) ? r.data.brokers : []))
      .catch(() => {})
      .finally(() => setBrokerLoading(false));
  };

  useEffect(() => {
    Promise.all([
      api.get('/reports/summary'),
      api.get('/reports/claims-by-status'),
      api.get('/reports/enrollments-by-type'),
      api.get('/reports/claims-trend'),
    ]).then(([s, cs, pt, tr]) => {
      setSummary(s.data);
      setByStatus(cs.data.data);
      setByType(pt.data.data);
      setTrend(tr.data.data.map(d => ({ month: dayjs(`${d._id.year}-${d._id.month}-1`).format('MMM'), claims: d.count, amount: Math.round(d.totalClaimed / 1000) })));
    }).catch(err => console.error('Dashboard load failed:', err)).finally(() => setLoading(false));

    loadBrokers();
  }, []);

  const handleBroker = async (id, action) => {
    setActionLoading(prev => ({ ...prev, [id]: action }));
    try {
      await api.patch(`/admin/brokers/${id}/${action}`);
      message.success(`Broker ${action === 'approve' ? 'approved' : 'rejected'}`);
      loadBrokers();
    } catch (err) {
      message.error(err.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading(prev => { const n = { ...prev }; delete n[id]; return n; });
    }
  };

  const brokerColumns = [
    {
      title: 'Broker', key: 'name',
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
    { title: 'Applied', dataIndex: 'createdAt', key: 'date', render: v => dayjs(v).format('MMM D, YYYY') },
    {
      title: 'Actions', key: 'actions',
      render: (_, r) => (
        <Space>
          <Button
            size="small" type="primary" icon={<CheckOutlined />}
            loading={actionLoading[r._id] === 'approve'}
            onClick={() => handleBroker(r._id, 'approve')}
            style={{ background: '#10b981', border: 'none', borderRadius: 6 }}
          >
            Approve
          </Button>
          <Button
            size="small" danger icon={<CloseOutlined />}
            loading={actionLoading[r._id] === 'reject'}
            onClick={() => handleBroker(r._id, 'reject')}
            style={{ borderRadius: 6 }}
          >
            Reject
          </Button>
        </Space>
      )
    },
  ];

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><Spin size="large" /></div>;

  const totalC = claimsByStatus.reduce((s, c) => s + c.count, 0);

  return (
    <div>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%)', border: '1px solid #1e3a5f', borderRadius: 16, padding: '22px 28px', marginBottom: 24 }}>
        <Title level={4} style={{ color: '#fff', margin: 0, fontWeight: 800 }}>System Dashboard</Title>
        <Text style={{ color: 'rgba(255,255,255,0.7)' }}>Full platform overview · {dayjs().format('MMMM D, YYYY')}</Text>
      </div>

      {/* KPI grid */}
      <Row gutter={[14, 14]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} md={8}><StatCard label="Institutions" value={summary?.totalInstitutions || 0} sub="Registered" icon={<TeamOutlined />} color="#22c55e" borderClass="stat-card-blue" /></Col>
        <Col xs={24} sm={12} md={8}><StatCard label="Providers" value={summary?.totalProviders || 0} sub="Network" icon={<UserOutlined />} color="#8b5cf6" borderClass="stat-card-purple" /></Col>
        <Col xs={24} sm={12} md={8}><StatCard label="Policies" value={summary?.activeEnrollments || 0} sub={`of ${summary?.totalEnrollments || 0} total`} icon={<SafetyOutlined />} color="#10b981" borderClass="stat-card-green" /></Col>
        <Col xs={24} sm={12} md={8}><StatCard label="Open Claims" value={summary?.openClaims || 0} sub="Pending" icon={<AlertOutlined />} color="#f59e0b" borderClass="stat-card-amber" /></Col>
        <Col xs={24} sm={12} md={8}><StatCard label="Total Claims" value={summary?.totalClaims || 0} sub="All time" icon={<AlertOutlined />} color="#06b6d4" borderClass="stat-card-cyan" /></Col>
        <Col xs={24} sm={12} md={8}><StatCard label="Revenue (ETB)" value={(summary?.annualRevenue || 0).toLocaleString()} sub="Annual premiums" icon={<DollarOutlined />} color="#ec4899" borderClass="stat-card-pink" /></Col>
      </Row>

      {/* Broker Applications */}
      <Card
        style={{ ...S.card, marginBottom: 20 }}
        title={
          <Space>
            <Text style={{ color: '#111827', fontWeight: 700 }}>Pending Broker Applications</Text>
            {brokers.length > 0 && <Badge count={brokers.length} style={{ background: '#f59e0b' }} />}
          </Space>
        }
      >
        {brokerLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spin /></div>
        ) : brokers.length === 0 ? (
          <Text style={{ color: '#9ca3af', fontSize: 13 }}>No pending broker applications.</Text>
        ) : (
          <Table dataSource={brokers} columns={brokerColumns} rowKey="_id" pagination={false} size="small" />
        )}
      </Card>

      {/* Charts row 1 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={16}>
          <Card style={S.card} title={<Text style={{ color: '#111827', fontWeight: 700 }}>Claims Volume — 6 Months</Text>}>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={claimsTrend} margin={{ top: 10, right: 20, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8edf3" />
                <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <Tooltip {...TT_STYLE} />
                <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
                <Line type="monotone" dataKey="claims" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e', r: 4 }} name="Claims" />
                <Line type="monotone" dataKey="amount" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 4 }} name="Value ($K)" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card style={S.card} title={<Text style={{ color: '#111827', fontWeight: 700 }}>Policies by Type</Text>}>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={policiesByType} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={90} innerRadius={45}>
                  {policiesByType.map((_, i) => <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />)}
                </Pie>
                <Tooltip {...TT_STYLE} />
                <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Charts row 2 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card style={S.card} title={<Text style={{ color: '#111827', fontWeight: 700 }}>Revenue by Product Type</Text>}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={policiesByType} margin={{ top: 10, right: 10, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8edf3" />
                <XAxis dataKey="type" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={v => `$${v}`} />
                <Tooltip {...TT_STYLE} formatter={v => [`$${v?.toLocaleString()}`, 'Revenue']} />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                  {policiesByType.map((_, i) => <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card style={S.card} title={<Text style={{ color: '#111827', fontWeight: 700 }}>Claims Status Distribution</Text>}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 220, overflowY: 'auto' }}>
              {claimsByStatus.map(c => (
                <div key={c.status}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ color: '#111827', fontSize: 12 }}>{c.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</Text>
                    <Text style={{ color: '#9ca3af', fontSize: 12 }}>{c.count} ({totalC ? Math.round((c.count / totalC) * 100) : 0}%)</Text>
                  </div>
                  <Progress percent={totalC ? Math.round((c.count / totalC) * 100) : 0} size={['100%', 5]} showInfo={false}
                    strokeColor={STATUS_COLORS[c.status] || '#9ca3af'} trailColor="#e8edf3" />
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
