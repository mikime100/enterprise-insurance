import { useEffect, useState } from 'react';
import { Row, Col, Table, Tag, Button, Space, Card, Typography, Modal, Descriptions, Divider, Spin, List, Avatar } from 'antd';
import { EyeOutlined, CheckCircleOutlined, DownloadOutlined, PlusOutlined } from '@ant-design/icons';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import StatCard from '../../components/ui/StatCard';
import { AuditOutlined, AlertOutlined, CalendarOutlined, CheckOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const STATUS_COLOR = { pending: 'orange', active: 'success', suspended: 'warning', cancelled: 'error', expired: 'default', pending_renewal: 'blue' };
const STATUS_TABS = ['All Policies', 'Active', 'Expired', 'Cancelled', 'Pending Renewal'];

export default function PayerEnrollments() {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [detail, setDetail]           = useState(null);
  const [activeTab, setActiveTab]     = useState('All Policies');
  const { user }                      = useAuth();

  const load = () => {
    setLoading(true);
    api.get('/enrollments').then(r => setEnrollments(Array.isArray(r.data.enrollments) ? r.data.enrollments : [])).catch(err => console.error('Enrollments load failed:', err)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openDetail = (e) => api.get(`/enrollments/${e._id}`).then(r => setDetail(r.data.enrollment));
  const activate = async (e) => { await api.patch(`/enrollments/${e._id}/status`, { status: 'active', notes: 'Activated by payer admin' }); load(); };

  const tabFilter = { 'All Policies': undefined, 'Active': 'active', 'Expired': 'expired', 'Cancelled': 'cancelled', 'Pending Renewal': 'pending_renewal' };
  const filtered = tabFilter[activeTab] ? enrollments.filter(e => e.status === tabFilter[activeTab]) : enrollments;

  const counts = {
    active: enrollments.filter(e => e.status === 'active').length,
    expiring: enrollments.filter(e => e.status === 'pending_renewal').length,
    cancelled: enrollments.filter(e => e.status === 'cancelled').length,
    renewed: enrollments.filter(e => e.status === 'active').length,
  };

  const columns = [
    { title: 'Policy No', dataIndex: 'enrollmentNumber', key: 'num', render: v => <Text code style={{ fontSize: 12 }}>{v}</Text> },
    { title: 'Policyholder', key: 'client', render: (_, r) => r.institution?.name || 'Individual' },
    { title: 'Product', key: 'product', render: (_, r) => r.product?.name },
    { title: 'Tier', key: 'tier', render: (_, r) => r.tier ? <Tag color="blue">{r.tier.name}</Tag> : '—' },
    { title: 'Coverage Period', key: 'period', render: (_, r) => `${new Date(r.startDate).toLocaleDateString()} – ${new Date(r.endDate).toLocaleDateString()}` },
    { title: 'Sum Insured (ETB)', key: 'prem', render: (_, r) => r.premium?.amount?.toLocaleString() },
    { title: 'Premium (ETB)', key: 'eprem', render: (_, r) => r.premium?.employeeShare?.toLocaleString() || r.premium?.amount?.toLocaleString() },
    { title: 'Status', dataIndex: 'status', key: 'status', render: v => <Tag color={STATUS_COLOR[v]}>{v?.replace(/_/g, ' ')}</Tag> },
    { title: 'Actions', key: 'actions', render: (_, r) => (
      <Space>
        <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(r)}>View</Button>
        {['payer_admin','superadmin'].includes(user?.role) && r.status === 'pending' && (
          <Button size="small" style={{ background: '#1e3a5f', borderColor: '#1e3a5f', color: '#fff' }} icon={<CheckCircleOutlined />} onClick={() => activate(r)}>Activate</Button>
        )}
      </Space>
    )},
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#111827' }}>Policy Management</Title>
          <Text style={{ color: '#6b7280' }}>Manage and track all insurance policies across branches.</Text>
        </div>
        <Space>
          <Button icon={<DownloadOutlined />} style={{ borderRadius: 8, height: 38 }}>Export</Button>
          <Button style={{ background: '#1e3a5f', borderColor: '#1e3a5f', color: '#fff', borderRadius: 8, height: 38 }} icon={<PlusOutlined />}>New Policy</Button>
        </Space>
      </div>

      {/* Stat cards */}
      <Row gutter={[16, 16]}>
        <Col xs={12} lg={6}><StatCard title="Total Active Policies" value={counts.active} icon={<AuditOutlined />} color="#3b82f6" trend={12} /></Col>
        <Col xs={12} lg={6}><StatCard title="Expiring in 30 Days" value={counts.expiring} icon={<CalendarOutlined />} color="#f59e0b" trend={-5} /></Col>
        <Col xs={12} lg={6}><StatCard title="Cancelled This Month" value={counts.cancelled} icon={<AlertOutlined />} color="#ef4444" trend={-2} /></Col>
        <Col xs={12} lg={6}><StatCard title="Renewed This Month" value={counts.renewed} icon={<CheckOutlined />} color="#22c55e" trend={18} /></Col>
      </Row>

      {/* Tab navigation */}
      <Card style={{ borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e5e7eb', marginBottom: 16, marginTop: -4 }}>
          {STATUS_TABS.map(tab => (
            <div key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '10px 18px', cursor: 'pointer', fontSize: 14, fontWeight: activeTab === tab ? 600 : 400,
              color: activeTab === tab ? '#1e3a5f' : '#6b7280',
              borderBottom: activeTab === tab ? '2px solid #1e3a5f' : '2px solid transparent',
              marginBottom: -1, transition: 'all 0.15s',
            }}>
              {tab}
            </div>
          ))}
        </div>
        {loading ? <Spin /> : <Table dataSource={filtered} columns={columns} rowKey="_id" pagination={{ pageSize: 10 }} size="small" />}
      </Card>

      <Modal title="Enrollment Details" open={!!detail} onCancel={() => setDetail(null)} footer={null} width={760}>
        {detail && (
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Policy #">{detail.enrollmentNumber}</Descriptions.Item>
              <Descriptions.Item label="Status"><Tag color={STATUS_COLOR[detail.status]}>{detail.status}</Tag></Descriptions.Item>
              <Descriptions.Item label="Client">{detail.institution?.name || 'Individual'}</Descriptions.Item>
              <Descriptions.Item label="Product">{detail.product?.name}</Descriptions.Item>
              <Descriptions.Item label="Tier">{detail.tier?.name || '—'}</Descriptions.Item>
              <Descriptions.Item label="Annual Premium">{detail.premium?.amount?.toLocaleString()} ETB</Descriptions.Item>
              <Descriptions.Item label="Employer Share">{detail.premium?.employerShare?.toLocaleString()} ETB</Descriptions.Item>
              <Descriptions.Item label="Employee Share">{detail.premium?.employeeShare?.toLocaleString()} ETB</Descriptions.Item>
              <Descriptions.Item label="Start">{new Date(detail.startDate).toLocaleDateString()}</Descriptions.Item>
              <Descriptions.Item label="End">{new Date(detail.endDate).toLocaleDateString()}</Descriptions.Item>
            </Descriptions>
            <Divider>Insured Members ({detail.insuredPersons?.length})</Divider>
            <List dataSource={detail.insuredPersons} renderItem={p => (
              <List.Item>
                <List.Item.Meta avatar={<Avatar style={{ background: '#1e3a5f' }}>{p.firstName?.[0]}{p.lastName?.[0]}</Avatar>}
                  title={`${p.firstName} ${p.lastName}`} description={`${p.email || '—'} · ${p.dependents?.length || 0} dependents`} />
              </List.Item>
            )} />
          </Space>
        )}
      </Modal>
    </div>
  );
}
