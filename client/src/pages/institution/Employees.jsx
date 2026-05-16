import { useEffect, useState } from 'react';
import { Card, Table, Tag, Typography, Space, Spin, Avatar, Descriptions, Modal, Button } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import api from '../../api';

const { Title, Text } = Typography;

export default function InstitutionEmployees() {
  const [enrollments, setEnrollments] = useState([]);
  const [detail, setDetail]           = useState(null);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    api.get('/enrollments', { params: { status: 'active' } })
      .then(r => setEnrollments(Array.isArray(r.data.enrollments) ? r.data.enrollments : []))
      .catch(err => console.error('Employees load failed:', err))
      .finally(() => setLoading(false));
  }, []);

  const openDetail = (e) => api.get(`/enrollments/${e._id}`).then(r => setDetail(r.data.enrollment));

  const allMembers = enrollments.flatMap(e => (e.insuredPersons || []).map(p => ({ ...p, enrollment: e })));

  const columns = [
    { title: 'Employee', key: 'name', render: (_, r) => (
      <Space>
        <Avatar size={32} style={{ background: '#3b82f6', fontSize: 12 }}>{r.firstName?.[0]}{r.lastName?.[0]}</Avatar>
        <div>
          <div style={{ fontWeight: 600 }}>{r.firstName} {r.lastName}</div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>{r.email}</div>
        </div>
      </Space>
    )},
    { title: 'National ID', dataIndex: 'nationalId', key: 'id', render: v => v || '—' },
    { title: 'Enrollment', key: 'enr', render: (_, r) => <Text code style={{ fontSize: 11 }}>{r.enrollment?.enrollmentNumber}</Text> },
    { title: 'Tier', key: 'tier', render: (_, r) => r.enrollment?.tier ? <Tag color="blue">{r.enrollment.tier.name}</Tag> : '—' },
    { title: 'Dependents', key: 'dep', render: (_, r) => r.dependents?.length || 0 },
    { title: '', key: 'act', render: (_, r) => <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(r.enrollment)}>Policy</Button> },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#111827' }}>Enrolled Employees ({allMembers.length})</Title>
          <span style={{ color: '#6b7280', fontSize: 14 }}>View all employees currently covered under active policies.</span>
        </div>
      </div>
      <Card style={{ borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        {loading ? <Spin /> : <Table dataSource={allMembers} columns={columns} rowKey="_id" pagination={{ pageSize: 10 }} />}
      </Card>

      <Modal title="Enrollment Details" open={!!detail} onCancel={() => setDetail(null)} footer={null} width={600}>
        {detail && (
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="Enrollment #">{detail.enrollmentNumber}</Descriptions.Item>
            <Descriptions.Item label="Status"><Tag color={detail.status === 'active' ? 'success' : 'default'}>{detail.status}</Tag></Descriptions.Item>
            <Descriptions.Item label="Product">{detail.product?.name}</Descriptions.Item>
            <Descriptions.Item label="Tier">{detail.tier?.name || '—'}</Descriptions.Item>
            <Descriptions.Item label="Annual Premium">{detail.premium?.amount?.toLocaleString()} ETB</Descriptions.Item>
            <Descriptions.Item label="Members">{detail.insuredPersons?.length}</Descriptions.Item>
            <Descriptions.Item label="Period">{new Date(detail.startDate).toLocaleDateString()} – {new Date(detail.endDate).toLocaleDateString()}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
