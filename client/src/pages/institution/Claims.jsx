import { useEffect, useState } from 'react';
import { Card, Table, Tag, Typography, Space, Spin, Button, Modal, Descriptions, Timeline, Divider } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import api from '../../api';

const { Title, Text } = Typography;
const STATUS_COLOR = {
  submitted: 'blue', acknowledged: 'cyan', under_review: 'processing',
  documentation_requested: 'orange', pending_finance_approval: 'volcano',
  approved: 'green', denied: 'red', settled: 'success', closed: 'default'
};

export default function InstitutionClaims() {
  const [claims, setClaims]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail]   = useState(null);

  useEffect(() => {
    api.get('/claims').then(r => setClaims(Array.isArray(r.data.claims) ? r.data.claims : [])).catch(err => console.error('Claims load failed:', err)).finally(() => setLoading(false));
  }, []);

  const openDetail = (c) => api.get(`/claims/${c._id}`).then(r => setDetail(r.data.claim));

  const columns = [
    { title: 'Claim #', dataIndex: 'claimNumber', key: 'n', width: 130, ellipsis: true, render: v => <Text code style={{ fontSize: 12 }}>{v}</Text> },
    { title: 'Employee', key: 'e', width: 150, ellipsis: true, render: (_, r) => `${r.insuredPerson?.firstName || ''} ${r.insuredPerson?.lastName || ''}` },
    { title: 'Type', dataIndex: 'claimType', key: 't', width: 110, render: v => <Tag style={{ textTransform: 'capitalize' }}>{v?.replace(/_/g,' ')}</Tag> },
    { title: 'Claimed (ETB)', dataIndex: 'claimedAmount', key: 'c', width: 120, render: v => v?.toLocaleString() },
    { title: 'Priority', dataIndex: 'priority', key: 'p', width: 90, render: v => <Tag color={v === 'urgent' ? 'red' : v === 'high' ? 'orange' : 'default'}>{v}</Tag> },
    { title: 'Status', dataIndex: 'status', key: 's', width: 150, render: v => <Tag color={STATUS_COLOR[v]}>{v?.replace(/_/g,' ')}</Tag> },
    { title: '', key: 'act', width: 80, fixed: 'right', render: (_, r) => <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(r)}>View</Button> },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#111827' }}>Employee Claims</Title>
          <span style={{ color: '#6b7280', fontSize: 14 }}>Track all claims filed by your enrolled employees.</span>
        </div>
      </div>
      <Card style={{ borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        {loading ? <Spin /> : <Table dataSource={claims} columns={columns} rowKey="_id" pagination={{ pageSize: 10 }} scroll={{ x: 680 }} />}
      </Card>

      <Modal title="Claim Details" open={!!detail} onCancel={() => setDetail(null)} footer={null} width={680}>
        {detail && (
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Claim #">{detail.claimNumber}</Descriptions.Item>
              <Descriptions.Item label="Status"><Tag color={STATUS_COLOR[detail.status]}>{detail.status?.replace(/_/g,' ')}</Tag></Descriptions.Item>
              <Descriptions.Item label="Employee">{detail.insuredPerson?.firstName} {detail.insuredPerson?.lastName}</Descriptions.Item>
              <Descriptions.Item label="Type"><Tag>{detail.claimType?.replace(/_/g,' ')}</Tag></Descriptions.Item>
              <Descriptions.Item label="Claimed (ETB)">{detail.claimedAmount?.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="Approved (ETB)">{detail.approvedAmount?.toLocaleString() || '—'}</Descriptions.Item>
              <Descriptions.Item label="Description" span={2}>{detail.description}</Descriptions.Item>
            </Descriptions>
            <Divider>Status History</Divider>
            <Timeline items={detail.statusHistory?.map(h => ({
              color: h.status === 'settled' ? 'green' : h.status === 'denied' ? 'red' : 'blue',
              children: <><Tag color={STATUS_COLOR[h.status]}>{h.status?.replace(/_/g,' ')}</Tag> <Text type="secondary" style={{ fontSize: 11 }}>{new Date(h.timestamp).toLocaleString()}</Text></>
            }))} />
          </Space>
        )}
      </Modal>
    </div>
  );
}
