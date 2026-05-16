import { useEffect, useState } from 'react';
import { Card, Descriptions, Tag, Typography, Space, Spin, Divider, Table, List, Avatar } from 'antd';
import api from '../../api';

const { Title, Text } = Typography;
const STATUS_COLOR = { pending: 'orange', active: 'success', suspended: 'warning', cancelled: 'error', expired: 'default' };

export default function InstitutionPolicy() {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    api.get('/enrollments').then(async (r) => {
      const list = Array.isArray(r.data.enrollments) ? r.data.enrollments : [];
      const details = await Promise.all(list.map(e => api.get(`/enrollments/${e._id}`).then(d => d.data.enrollment)));
      setEnrollments(details);
    }).catch(err => console.error('Policy load failed:', err)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#111827' }}>Our Policies</Title>
          <span style={{ color: '#6b7280', fontSize: 14 }}>View policy details, coverage periods, and payment history.</span>
        </div>
      </div>

      {enrollments.map(e => (
        <Card key={e._id} style={{ borderRadius: 12 }}
          title={<Space><Text strong>{e.product?.name}</Text><Tag color={STATUS_COLOR[e.status]}>{e.status}</Tag></Space>}
          extra={<Text code style={{ fontSize: 12 }}>{e.enrollmentNumber}</Text>}>
          <Descriptions column={3} size="small">
            <Descriptions.Item label="Tier">{e.tier?.name || '—'}</Descriptions.Item>
            <Descriptions.Item label="Annual Premium">{e.premium?.amount?.toLocaleString()} ETB</Descriptions.Item>
            <Descriptions.Item label="Members">{e.insuredPersons?.length || 0}</Descriptions.Item>
            <Descriptions.Item label="Start">{new Date(e.startDate).toLocaleDateString()}</Descriptions.Item>
            <Descriptions.Item label="End">{new Date(e.endDate).toLocaleDateString()}</Descriptions.Item>
            <Descriptions.Item label="Renewal">{new Date(e.renewalDate).toLocaleDateString()}</Descriptions.Item>
          </Descriptions>

          {e.paymentHistory?.length > 0 && (
            <>
              <Divider>Payment History</Divider>
              <Table dataSource={e.paymentHistory} rowKey={(r, i) => i} size="small" pagination={false}
                columns={[
                  { title: 'Date', dataIndex: 'date', key: 'd', render: v => new Date(v).toLocaleDateString() },
                  { title: 'Amount (ETB)', dataIndex: 'amount', key: 'a', render: v => v?.toLocaleString() },
                  { title: 'Method', dataIndex: 'method', key: 'm', render: v => v?.replace(/_/g,' ') },
                  { title: 'Reference', dataIndex: 'reference', key: 'r' },
                  { title: 'Status', dataIndex: 'status', key: 's', render: v => <Tag color={v === 'completed' ? 'success' : 'warning'}>{v}</Tag> },
                ]} />
            </>
          )}
        </Card>
      ))}
    </div>
  );
}
