import { useEffect, useState } from 'react';
import { Row, Col, Card, Table, Tag, Typography, Button, Spin } from 'antd';
import { AlertOutlined, AuditOutlined, TeamOutlined, DollarOutlined, SafetyOutlined, RiseOutlined, DownloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import StatCard from '../../components/ui/StatCard';

const { Title, Text } = Typography;

const STATUS_COLOR = {
  submitted: 'blue', acknowledged: 'cyan', under_review: 'processing',
  documentation_requested: 'orange', investigation: 'gold', assessment: 'purple',
  pending_finance_approval: 'volcano', approved: 'green', partially_approved: 'lime',
  denied: 'red', payment_initiated: 'geekblue', settled: 'success', closed: 'default',
};

export default function PayerDashboard() {
  const [summary, setSummary]     = useState(null);
  const [recentClaims, setRecent] = useState([]);
  const [loading, setLoading]     = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([api.get('/reports/summary'), api.get('/reports/recent-claims')])
      .then(([s, c]) => { setSummary(s.data); setRecent(Array.isArray(c.data.claims) ? c.data.claims : []); })
      .catch(err => console.error('Dashboard load failed:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>;

  const claimColumns = [
    { title: 'Claim #', dataIndex: 'claimNumber', key: 'claimNumber', render: v => <Text code style={{ fontSize: 12 }}>{v}</Text> },
    { title: 'Insured', key: 'insured', render: (_, r) => `${r.insuredPerson?.firstName ?? ''} ${r.insuredPerson?.lastName ?? ''}` },
    { title: 'Type', dataIndex: 'claimType', key: 'type', render: v => <Tag>{v?.replace(/_/g, ' ')}</Tag> },
    { title: 'Amount (ETB)', dataIndex: 'claimedAmount', key: 'amount', render: v => v?.toLocaleString() },
    { title: 'Priority', dataIndex: 'priority', key: 'priority',
      render: v => <Tag color={v === 'urgent' ? 'red' : v === 'high' ? 'orange' : v === 'medium' ? 'blue' : 'default'}>{v}</Tag> },
    { title: 'Status', dataIndex: 'status', key: 'status',
      render: v => <Tag color={STATUS_COLOR[v]}>{v?.replace(/_/g, ' ')}</Tag> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#111827' }}>Dashboard Overview</Title>
          <Text style={{ color: '#6b7280' }}>Welcome back. Here is today's summary.</Text>
        </div>
        <Button icon={<DownloadOutlined />} style={{ borderRadius: 8, height: 38 }}>Export</Button>
      </div>

      {/* Stat cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={8}>
          <StatCard title="Active Enrollments" value={summary?.activeEnrollments ?? 0}
            icon={<AuditOutlined />} color="#3b82f6" trend={12}
            suffix={`of ${summary?.totalEnrollments ?? 0}`} />
        </Col>
        <Col xs={24} sm={12} xl={8}>
          <StatCard title="Gross Premiums (ETB)" value={summary?.annualRevenue ?? 0}
            icon={<DollarOutlined />} color="#22c55e" trend={8} />
        </Col>
        <Col xs={24} sm={12} xl={8}>
          <StatCard title="Open Claims" value={summary?.openClaims ?? 0}
            icon={<AlertOutlined />} color="#ef4444" trend={-3}
            suffix={`of ${summary?.totalClaims ?? 0}`} />
        </Col>
        <Col xs={24} sm={12} xl={8}>
          <StatCard title="Insured Persons" value={summary?.totalInsuredPersons ?? 0}
            icon={<TeamOutlined />} color="#8b5cf6" trend={0} />
        </Col>
        <Col xs={24} sm={12} xl={8}>
          <StatCard title="Institutions" value={summary?.totalInstitutions ?? 0}
            icon={<SafetyOutlined />} color="#ec4899" trend={5} />
        </Col>
        <Col xs={24} sm={12} xl={8}>
          <StatCard title="Network Providers" value={summary?.totalProviders ?? 0}
            icon={<RiseOutlined />} color="#06b6d4" trend={2} />
        </Col>
      </Row>

      {/* Recent claims table */}
      <Card
        title={<span style={{ fontWeight: 700, fontSize: 15 }}>Recent Claims</span>}
        extra={
          <Button type="link" style={{ color: '#1e3a5f', fontWeight: 600 }}
            onClick={() => navigate('/payer/claims')}>View All →</Button>
        }
        style={{ borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
      >
        <Table
          dataSource={recentClaims}
          columns={claimColumns}
          rowKey="_id"
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  );
}
