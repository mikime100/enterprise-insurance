import { useEffect, useState } from 'react';
import { Table, Tag, Button, Space, Card, Typography, Modal, Form, Input, Select, Descriptions, Divider, Spin } from 'antd';
import { PlusOutlined, EyeOutlined, EditOutlined } from '@ant-design/icons';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text } = Typography;
const { TextArea } = Input;
const STATUS_COLOR = { pending: 'orange', active: 'success', suspended: 'warning', terminated: 'error' };

export default function PayerProviders() {
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [detail, setDetail]         = useState(null);
  const { user }                    = useAuth();
  const canEdit = ['payer_admin','superadmin'].includes(user?.role);

  const load = () => {
    setLoading(true);
    api.get('/agreements').then(r => setAgreements(Array.isArray(r.data.agreements) ? r.data.agreements : [])).catch(err => console.error('Agreements load failed:', err)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openDetail = (a) => api.get(`/agreements/${a._id}`).then(r => setDetail(r.data.agreement));

  const toggleStatus = async (a) => {
    const newStatus = a.status === 'active' ? 'suspended' : 'active';
    await api.patch(`/agreements/${a._id}/status`, { status: newStatus });
    load();
  };

  const columns = [
    { title: 'Provider', key: 'provider', render: (_, r) => r.provider?.name },
    { title: 'Type', key: 'type', render: (_, r) => <Tag>{r.provider?.type?.replace(/_/g,' ')}</Tag> },
    { title: 'Payment Cycle', dataIndex: 'paymentCycle', key: 'cycle', render: v => v?.replace(/_/g,' ') },
    { title: 'Effective', dataIndex: 'effectiveDate', key: 'eff', render: v => v ? new Date(v).toLocaleDateString() : '—' },
    { title: 'Expiry', dataIndex: 'expiryDate', key: 'exp', render: v => v ? new Date(v).toLocaleDateString() : '—' },
    { title: 'Services', key: 'svcs', render: (_, r) => r.services?.length || 0 },
    { title: 'Status', dataIndex: 'status', key: 'status', render: v => <Tag color={STATUS_COLOR[v]}>{v}</Tag> },
    { title: 'Actions', key: 'actions', render: (_, r) => (
      <Space>
        <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(r)}>View</Button>
        {canEdit && (
          <Button size="small" danger={r.status === 'active'} onClick={() => toggleStatus(r)}>
            {r.status === 'active' ? 'Suspend' : 'Activate'}
          </Button>
        )}
      </Space>
    )},
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#111827' }}>Provider Agreements</Title>
          <span style={{ color: '#6b7280', fontSize: 14 }}>Manage network provider contracts and service agreements.</span>
        </div>
      </div>
      <Card style={{ borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        {loading ? <Spin /> : <Table dataSource={agreements} columns={columns} rowKey="_id" pagination={{ pageSize: 10 }} size="small" />}
      </Card>

      <Modal title="Agreement Details" open={!!detail} onCancel={() => setDetail(null)} footer={null} width={720}>
        {detail && (
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Provider">{detail.provider?.name}</Descriptions.Item>
              <Descriptions.Item label="Status"><Tag color={STATUS_COLOR[detail.status]}>{detail.status}</Tag></Descriptions.Item>
              <Descriptions.Item label="Payer">{detail.payer?.name}</Descriptions.Item>
              <Descriptions.Item label="Payment Cycle">{detail.paymentCycle?.replace(/_/g,' ')}</Descriptions.Item>
              <Descriptions.Item label="Effective">{detail.effectiveDate ? new Date(detail.effectiveDate).toLocaleDateString() : '—'}</Descriptions.Item>
              <Descriptions.Item label="Expiry">{detail.expiryDate ? new Date(detail.expiryDate).toLocaleDateString() : '—'}</Descriptions.Item>
              {detail.notes && <Descriptions.Item label="Notes" span={2}>{detail.notes}</Descriptions.Item>}
            </Descriptions>

            <Divider>Agreed Services & Prices</Divider>
            <Table dataSource={detail.services} rowKey={(r,i) => i} size="small" pagination={false}
              columns={[
                { title: 'Service', dataIndex: 'name', key: 'n' },
                { title: 'Description', dataIndex: 'description', key: 'd', render: v => v || '—' },
                { title: 'Agreed Price (ETB)', dataIndex: 'agreedPrice', key: 'p', render: v => v?.toLocaleString() },
              ]} />

            {detail.coverages?.length > 0 && (
              <>
                <Divider>Covered Under</Divider>
                <Space wrap>{detail.coverages.map(c => <Tag key={c._id} color="green">{c.name}</Tag>)}</Space>
              </>
            )}
          </Space>
        )}
      </Modal>
    </div>
  );
}
