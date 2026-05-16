import { useEffect, useState } from 'react';
import { Card, Table, Tag, Typography, Space, Spin, Button } from 'antd';
import api from '../../api';

const { Title, Text } = Typography;

export default function InstitutionGroups() {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    api.get('/enrollments').then(r => setEnrollments(Array.isArray(r.data.enrollments) ? r.data.enrollments : [])).catch(err => console.error('Groups load failed:', err)).finally(() => setLoading(false));
  }, []);

  const columns = [
    { title: 'Enrollment #', dataIndex: 'enrollmentNumber', key: 'n', render: v => <Text code style={{ fontSize: 12 }}>{v}</Text> },
    { title: 'Product', key: 'p', render: (_, r) => r.product?.name },
    { title: 'Tier', key: 't', render: (_, r) => r.tier ? <Tag color="blue">{r.tier.name}</Tag> : '—' },
    { title: 'Members', key: 'm', render: (_, r) => r.insuredPersons?.length || 0 },
    { title: 'Annual Premium (ETB)', key: 'pr', render: (_, r) => r.premium?.amount?.toLocaleString() },
    { title: 'Status', dataIndex: 'status', key: 's', render: v => <Tag color={v === 'active' ? 'success' : 'default'}>{v}</Tag> },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#111827' }}>Groups & Enrollments</Title>
          <span style={{ color: '#6b7280', fontSize: 14 }}>Manage group enrollments and policy tiers.</span>
        </div>
      </div>
      <Card style={{ borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        {loading ? <Spin /> : <Table dataSource={enrollments} columns={columns} rowKey="_id" pagination={{ pageSize: 10 }} />}
      </Card>
    </div>
  );
}
