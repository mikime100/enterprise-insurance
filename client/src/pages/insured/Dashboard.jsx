import { useEffect, useState } from 'react';
import { Row, Col, Card, Table, Tag, Button, Typography, Spin, Avatar } from 'antd';
import { SafetyOutlined, AlertOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import StatCard from '../../components/ui/StatCard';

const { Title, Text } = Typography;
const STATUS_COLOR = { submitted: 'blue', under_review: 'processing', approved: 'green', denied: 'red', settled: 'success' };

export default function InsuredDashboard() {
  const [enrollments, setEnrollments] = useState([]);
  const [claims, setClaims]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const navigate                      = useNavigate();
  const { user }                      = useAuth();

  useEffect(() => {
    Promise.all([api.get('/enrollments'), api.get('/claims')])
      .then(([e, c]) => { setEnrollments(Array.isArray(e.data.enrollments) ? e.data.enrollments : []); setClaims(Array.isArray(c.data.claims) ? c.data.claims : []); })
      .catch(err => console.error('Insured dashboard load failed:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>;

  const activePolicy = enrollments.find(e => e.status === 'active');
  const openClaims   = claims.filter(c => !['settled','closed','denied'].includes(c.status));

  const claimColumns = [
    { title: 'Claim #', dataIndex: 'claimNumber', key: 'n', render: v => <Text code style={{ fontSize: 12 }}>{v}</Text> },
    { title: 'Type', dataIndex: 'claimType', key: 't', render: v => <Tag>{v?.replace(/_/g,' ')}</Tag> },
    { title: 'Amount (ETB)', dataIndex: 'claimedAmount', key: 'a', render: v => v?.toLocaleString() },
    { title: 'Status', dataIndex: 'status', key: 's', render: v => <Tag color={STATUS_COLOR[v]}>{v?.replace(/_/g,' ')}</Tag> },
    { title: 'Date', dataIndex: 'createdAt', key: 'd', render: v => new Date(v).toLocaleDateString() },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px', background: 'linear-gradient(135deg, #1e3a5f, #2d5a8e)', borderRadius: 14, color: '#fff' }}>
        <Avatar size={52} style={{ background: 'rgba(255,255,255,0.2)', fontSize: 20, fontWeight: 700, border: '2px solid rgba(255,255,255,0.3)' }}>
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </Avatar>
        <div>
          <Title level={4} style={{ color: '#fff', margin: 0, fontWeight: 700 }}>Welcome back, {user?.firstName}!</Title>
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>
            {activePolicy ? `Covered under ${activePolicy.product?.name} · ${activePolicy.tier?.name || 'Standard'}` : 'No active coverage'}
          </Text>
        </div>
        {activePolicy && (
          <div style={{ marginLeft: 'auto' }}>
            <Button ghost onClick={() => navigate('/insured/coverage')} style={{ borderColor: 'rgba(255,255,255,0.4)', color: '#fff' }}>
              View Coverage
            </Button>
          </div>
        )}
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <StatCard title="Active Policies" value={enrollments.filter(e => e.status === 'active').length} icon={<SafetyOutlined />} color="#10b981" />
        </Col>
        <Col xs={24} sm={12}>
          <StatCard title="Open Claims" value={openClaims.length} icon={<AlertOutlined />} color="#f59e0b" />
        </Col>
      </Row>

      {activePolicy && (
        <Card
          title={<span style={{ fontWeight: 700 }}>My Active Coverage</span>}
          extra={<Button type="link" onClick={() => navigate('/insured/coverage')}>View Details</Button>}
          style={{ borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
            <div><Text type="secondary" style={{ fontSize: 12 }}>Product</Text><div style={{ fontWeight: 600 }}>{activePolicy.product?.name}</div></div>
            <div><Text type="secondary" style={{ fontSize: 12 }}>Tier</Text><div style={{ fontWeight: 600 }}>{activePolicy.tier?.name || '—'}</div></div>
            <div><Text type="secondary" style={{ fontSize: 12 }}>Valid Until</Text><div style={{ fontWeight: 600 }}>{new Date(activePolicy.endDate).toLocaleDateString()}</div></div>
          </div>
        </Card>
      )}

      <Card
        title={<span style={{ fontWeight: 700 }}>My Claims</span>}
        extra={<Button style={{ background: '#1e3a5f', borderColor: '#1e3a5f', color: '#fff', borderRadius: 7 }} onClick={() => navigate('/insured/claims')}>+ File New Claim</Button>}
        style={{ borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
      >
        <Table dataSource={claims.slice(0, 5)} columns={claimColumns} rowKey="_id" pagination={false} size="small" />
      </Card>
    </div>
  );
}
