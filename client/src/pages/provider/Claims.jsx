import { useEffect, useState } from 'react';
import { Table, Tag, Button, Space, Card, Typography, Modal, Descriptions, Divider, Spin, Timeline } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import api from '../../api';

const { Title, Text } = Typography;
const STATUS_COLOR = {
  submitted: 'blue', acknowledged: 'cyan', under_review: 'processing',
  pending_finance_approval: 'volcano', approved: 'green', partially_approved: 'lime',
  denied: 'red', payment_initiated: 'geekblue', settled: 'success', closed: 'default'
};

export default function ProviderClaims() {
  const [claims, setClaims]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail]   = useState(null);

  useEffect(() => {
    api.get('/claims').then(r => setClaims(Array.isArray(r.data.claims) ? r.data.claims : [])).catch(err => console.error('Claims load failed:', err)).finally(() => setLoading(false));
  }, []);

  const openDetail = (c) => api.get(`/claims/${c._id}`).then(r => setDetail(r.data.claim));

  const columns = [
    { title: 'Claim #', dataIndex: 'claimNumber', key: 'n', render: v => <Text code style={{ fontSize: 12 }}>{v}</Text> },
    { title: 'Patient', key: 'p', render: (_, r) => `${r.insuredPerson?.firstName || ''} ${r.insuredPerson?.lastName || ''}` },
    { title: 'Type', dataIndex: 'claimType', key: 't', render: v => <Tag>{v?.replace(/_/g,' ')}</Tag> },
    { title: 'Claimed (ETB)', dataIndex: 'claimedAmount', key: 'c', render: v => v?.toLocaleString() },
    { title: 'Approved (ETB)', dataIndex: 'approvedAmount', key: 'a', render: v => v?.toLocaleString() || '—' },
    { title: 'Settlement (ETB)', dataIndex: 'settlementAmount', key: 's', render: v => v?.toLocaleString() || '—' },
    { title: 'Status', dataIndex: 'status', key: 'st', render: v => <Tag color={STATUS_COLOR[v]}>{v?.replace(/_/g,' ')}</Tag> },
    { title: 'Date', dataIndex: 'createdAt', key: 'd', render: v => new Date(v).toLocaleDateString() },
    { title: '', key: 'act', render: (_, r) => <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(r)}>View</Button> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#111827' }}>My Submitted Claims</Title>
          <span style={{ color: '#6b7280', fontSize: 14 }}>Track all claims submitted on behalf of your facility.</span>
        </div>
      </div>
      <Card style={{ borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        {loading ? <Spin /> : <Table dataSource={claims} columns={columns} rowKey="_id" pagination={{ pageSize: 10 }} size="small" />}
      </Card>

      <Modal title="Claim Details" open={!!detail} onCancel={() => setDetail(null)} footer={null} width={700}>
        {detail && (
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Claim #">{detail.claimNumber}</Descriptions.Item>
              <Descriptions.Item label="Status"><Tag color={STATUS_COLOR[detail.status]}>{detail.status?.replace(/_/g,' ')}</Tag></Descriptions.Item>
              <Descriptions.Item label="Patient">{detail.insuredPerson?.firstName} {detail.insuredPerson?.lastName}</Descriptions.Item>
              <Descriptions.Item label="Enrollment">{detail.enrollment?.enrollmentNumber}</Descriptions.Item>
              <Descriptions.Item label="Claimed">{detail.claimedAmount?.toLocaleString()} ETB</Descriptions.Item>
              <Descriptions.Item label="Approved">{detail.approvedAmount?.toLocaleString() || '—'} ETB</Descriptions.Item>
              {detail.diagnosis && <Descriptions.Item label="Diagnosis" span={2}>{detail.diagnosis}</Descriptions.Item>}
            </Descriptions>

            {detail.services?.length > 0 && (
              <>
                <Divider>Services</Divider>
                <Table dataSource={detail.services} rowKey={(r,i) => i} size="small" pagination={false}
                  columns={[
                    { title: 'Service', dataIndex: 'name', key: 'n' },
                    { title: 'Qty', dataIndex: 'quantity', key: 'q' },
                    { title: 'Unit Price (ETB)', dataIndex: 'unitPrice', key: 'u', render: v => v?.toLocaleString() },
                    { title: 'Total (ETB)', dataIndex: 'totalAmount', key: 't', render: v => v?.toLocaleString() },
                  ]} />
              </>
            )}

            <Divider>Status History</Divider>
            <Timeline items={detail.statusHistory?.map(h => ({
              color: h.status === 'settled' ? 'green' : h.status === 'denied' ? 'red' : 'blue',
              children: <><Tag color={STATUS_COLOR[h.status]}>{h.status?.replace(/_/g,' ')}</Tag> <Text type="secondary" style={{ fontSize: 11 }}>{new Date(h.timestamp).toLocaleString()}</Text>{h.reason && <div style={{ fontSize: 12, color: '#6b7280' }}>{h.reason}</div>}</>
            }))} />
          </Space>
        )}
      </Modal>
    </div>
  );
}
