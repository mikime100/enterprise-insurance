import { useEffect, useState } from 'react';
import { Row, Col, Card, Table, Tag, Button, Typography, Spin } from 'antd';
import { AlertOutlined, FileAddOutlined, CheckCircleOutlined, DownloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import StatCard from '../../components/ui/StatCard';

const { Title, Text } = Typography;
const STATUS_COLOR = {
  submitted: 'blue', under_review: 'processing', pending_finance_approval: 'volcano',
  approved: 'green', settled: 'success', denied: 'red', closed: 'default',
};

export default function ProviderDashboard() {
  const [claims, setClaims]         = useState([]);
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading]       = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([api.get('/claims'), api.get('/agreements')])
      .then(([c, a]) => { setClaims(Array.isArray(c.data.claims) ? c.data.claims : []); setAgreements(Array.isArray(a.data.agreements) ? a.data.agreements : []); })
      .catch(err => console.error('Provider dashboard load failed:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>;

  const openClaims      = claims.filter(c => !['settled','closed','denied'].includes(c.status)).length;
  const settledClaims   = claims.filter(c => c.status === 'settled').length;
  const activeAgreements = agreements.filter(a => a.status === 'active').length;

  const columns = [
    { title: 'Claim #', dataIndex: 'claimNumber', key: 'n', render: v => <Text code style={{ fontSize: 12 }}>{v}</Text> },
    { title: 'Patient', key: 'i', render: (_, r) => `${r.insuredPerson?.firstName || ''} ${r.insuredPerson?.lastName || ''}` },
    { title: 'Type', dataIndex: 'claimType', key: 't', render: v => <Tag>{v?.replace(/_/g,' ')}</Tag> },
    { title: 'Amount (ETB)', dataIndex: 'claimedAmount', key: 'a', render: v => v?.toLocaleString() },
    { title: 'Status', dataIndex: 'status', key: 's', render: v => <Tag color={STATUS_COLOR[v]}>{v?.replace(/_/g,' ')}</Tag> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#111827' }}>Provider Dashboard</Title>
          <Text style={{ color: '#6b7280' }}>Claims and agreement overview for your facility.</Text>
        </div>
        <Button icon={<DownloadOutlined />} style={{ borderRadius: 8, height: 38 }}>Export</Button>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <StatCard title="Open Claims" value={openClaims} icon={<AlertOutlined />} color="#f59e0b" trend={-3} />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard title="Settled Claims" value={settledClaims} icon={<CheckCircleOutlined />} color="#22c55e" trend={8} />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard title="Active Agreements" value={activeAgreements} icon={<FileAddOutlined />} color="#1e3a5f" />
        </Col>
      </Row>

      <Card
        title={<span style={{ fontWeight: 700 }}>Recent Claims</span>}
        extra={
          <Button style={{ background: '#1e3a5f', borderColor: '#1e3a5f', color: '#fff', borderRadius: 7 }}
            onClick={() => navigate('/provider/submit-claim')}>+ Submit Claim</Button>
        }
        style={{ borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
      >
        <Table dataSource={claims.slice(0, 8)} columns={columns} rowKey="_id" pagination={false} size="small" />
      </Card>
    </div>
  );
}
