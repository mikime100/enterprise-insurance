import { useEffect, useState } from 'react';
import { Card, Table, Tag, Typography, Space, Spin, Avatar, List } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text } = Typography;

export default function InsuredDependents() {
  const [enrollment, setEnrollment] = useState(null);
  const [insuredPerson, setInsuredPerson] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    api.get('/enrollments', { params: { status: 'active' } })
      .then(async (e) => {
        const list = Array.isArray(e.data.enrollments) ? e.data.enrollments : [];
        if (list.length) {
          const detail = await api.get(`/enrollments/${list[0]._id}`);
          setEnrollment(detail.data.enrollment);
          const me = detail.data.enrollment.insuredPersons?.find(p => p.user?.toString() === user._id || p._id === user.linkedEntity?.entityId?.toString());
          setInsuredPerson(me || detail.data.enrollment.insuredPersons?.[0]);
        }
      })
      .catch(err => console.error('Dependents load failed:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>;

  const dependents = insuredPerson?.dependents || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#111827' }}>My Dependents</Title>
          <span style={{ color: '#6b7280', fontSize: 14 }}>Family members covered under your policy.</span>
        </div>
      </div>

      {enrollment && (
        <Card title="Coverage for Dependents" style={{ borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <Text style={{ color: '#6b7280' }}>
            Your current plan ({enrollment.tier?.name || 'Standard'}) covers up to {enrollment.tier?.maxDependents || 4} dependents.
          </Text>
        </Card>
      )}

      <Card title={`Registered Dependents (${dependents.length})`} style={{ borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        {dependents.length === 0 ? (
          <Text type="secondary">No dependents registered. Contact your HR department to add dependents to your plan.</Text>
        ) : (
          <List dataSource={dependents} renderItem={(d, i) => (
            <List.Item key={i}>
              <List.Item.Meta
                avatar={<Avatar size={40} style={{ background: '#8b5cf6' }}>{d.firstName?.[0]}</Avatar>}
                title={`${d.firstName} ${d.lastName}`}
                description={
                  <Space>
                    <Tag color="blue">{d.relationship}</Tag>
                    <Tag>{d.gender}</Tag>
                    {d.dateOfBirth && <Text style={{ fontSize: 12, color: '#9ca3af' }}>DOB: {new Date(d.dateOfBirth).toLocaleDateString()}</Text>}
                  </Space>
                }
              />
            </List.Item>
          )} />
        )}
      </Card>
    </div>
  );
}
