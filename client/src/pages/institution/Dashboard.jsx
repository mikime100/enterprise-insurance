import { useEffect, useState } from 'react';
import { Row, Col, Card, Table, Tag, Button, Typography, Spin } from 'antd';
import { TeamOutlined, SafetyOutlined, AlertOutlined, DollarOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import StatCard from '../../components/ui/StatCard';

const { Title, Text } = Typography;
const STATUS_COLOR = { submitted: 'blue', under_review: 'processing', approved: 'green', denied: 'red', settled: 'success', pending_finance_approval: 'volcano' };

export default function InstitutionDashboard() {
  const [enrollments, setEnrollments] = useState([]);
  const [claims, setClaims]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const navigate                      = useNavigate();

  useEffect(() => {
    Promise.all([api.get('/enrollments'), api.get('/claims')])
      .then(([e, c]) => { setEnrollments(Array.isArray(e.data.enrollments) ? e.data.enrollments : []); setClaims(Array.isArray(c.data.claims) ? c.data.claims : []); })
      .catch(err => console.error('Institution dashboard load failed:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>;

  const activeEnrollment = enrollments.find(e => e.status === 'active');
  const totalMembers     = activeEnrollment?.insuredPersons?.length || 0;
  const openClaims       = claims.filter(c => !['settled','closed','denied'].includes(c.status)).length;
  const totalPremium     = enrollments.filter(e => e.status === 'active').reduce((s, e) => s + (e.premium?.amount || 0), 0);

  const claimColumns = [
    { title: 'Claim #', dataIndex: 'claimNumber', key: 'n', render: v => <Text code style={{ fontSize: 12 }}>{v}</Text> },
    { title: 'Employee', key: 'e', render: (_, r) => `${r.insuredPerson?.firstName || ''} ${r.insuredPerson?.lastName || ''}` },
    { title: 'Type', dataIndex: 'claimType', key: 't', render: v => <Tag>{v?.replace(/_/g,' ')}</Tag> },
    { title: 'Amount (ETB)', dataIndex: 'claimedAmount', key: 'a', render: v => v?.toLocaleString() },
    { title: 'Status', dataIndex: 'status', key: 's', render: v => <Tag color={STATUS_COLOR[v]}>{v?.replace(/_/g,' ')}</Tag> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#111827' }}>Institution Dashboard</Title>
          <Text style={{ color: '#6b7280' }}>Your organization's insurance overview and employee claims.</Text>
        </div>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title="Enrolled Employees" value={totalMembers} icon={<TeamOutlined />} color="#3b82f6" />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title="Active Policies" value={enrollments.filter(e => e.status === 'active').length} icon={<SafetyOutlined />} color="#10b981" />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title="Open Claims" value={openClaims} icon={<AlertOutlined />} color="#f59e0b" />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title="Annual Premium (ETB)" value={totalPremium.toLocaleString()} icon={<DollarOutlined />} color="#8b5cf6" />
        </Col>
      </Row>

      <Card
        title={<span style={{ fontWeight: 700 }}>Recent Employee Claims</span>}
        extra={<Button type="link" onClick={() => navigate('/institution/claims')}>View All</Button>}
        style={{ borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
      >
        <Table dataSource={claims.slice(0, 6)} columns={claimColumns} rowKey="_id" pagination={false} size="small" />
      </Card>
    </div>
  );
}
