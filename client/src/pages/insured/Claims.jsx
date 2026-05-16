import { useEffect, useState } from 'react';
import { Card, Table, Tag, Typography, Space, Spin, Button, Modal, Form, Select, Input, InputNumber, DatePicker, Descriptions, Timeline, Divider, message } from 'antd';
import { PlusOutlined, EyeOutlined } from '@ant-design/icons';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text } = Typography;
const { TextArea } = Input;
const STATUS_COLOR = {
  submitted: 'blue', acknowledged: 'cyan', under_review: 'processing',
  documentation_requested: 'orange', approved: 'green', denied: 'red',
  payment_initiated: 'geekblue', settled: 'success', closed: 'default'
};

export default function InsuredClaims() {
  const [claims, setClaims]         = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [detail, setDetail]         = useState(null);
  const [createModal, setCreate]    = useState(false);
  const [form]                      = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const { user }                    = useAuth();

  const load = () => {
    setLoading(true);
    Promise.all([api.get('/claims'), api.get('/enrollments', { params: { status: 'active' } })])
      .then(([c, e]) => { setClaims(Array.isArray(c.data.claims) ? c.data.claims : []); setEnrollments(Array.isArray(e.data.enrollments) ? e.data.enrollments : []); })
      .catch(err => console.error('Insured claims load failed:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openDetail = (c) => api.get(`/claims/${c._id}`).then(r => setDetail(r.data.claim));

  const handleCreate = async () => {
    const vals = await form.validateFields();
    setSubmitting(true);
    try {
      await api.post('/claims', {
        ...vals,
        incidentDate: vals.incidentDate?.toISOString(),
        insuredPersonId: user.linkedEntity?.entityId,
        submissionType: 'insured_reimbursement'
      });
      message.success('Claim submitted successfully');
      setCreate(false);
      form.resetFields();
      load();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to submit claim');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { title: 'Claim #', dataIndex: 'claimNumber', key: 'n', render: v => <Text code style={{ fontSize: 12 }}>{v}</Text> },
    { title: 'Type', dataIndex: 'claimType', key: 't', render: v => <Tag>{v?.replace(/_/g,' ')}</Tag> },
    { title: 'Claimed (ETB)', dataIndex: 'claimedAmount', key: 'c', render: v => v?.toLocaleString() },
    { title: 'Approved (ETB)', dataIndex: 'approvedAmount', key: 'a', render: v => v?.toLocaleString() || '—' },
    { title: 'Status', dataIndex: 'status', key: 's', render: v => <Tag color={STATUS_COLOR[v]}>{v?.replace(/_/g,' ')}</Tag> },
    { title: 'Date', dataIndex: 'createdAt', key: 'd', render: v => new Date(v).toLocaleDateString() },
    { title: '', key: 'act', render: (_, r) => <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(r)}>View</Button> },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#111827' }}>My Claims</Title>
          <span style={{ color: '#6b7280', fontSize: 14 }}>File and track your reimbursement claims.</span>
        </div>
        <Button style={{ background: '#1e3a5f', borderColor: '#1e3a5f', color: '#fff', borderRadius: 7, height: 38 }}
          icon={<PlusOutlined />} onClick={() => { form.resetFields(); setCreate(true); }}>
          File New Claim
        </Button>
      </div>

      <Card style={{ borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        {loading ? <Spin /> : <Table dataSource={claims} columns={columns} rowKey="_id" pagination={{ pageSize: 10 }} />}
      </Card>

      {/* File Claim Modal */}
      <Modal title="File a Reimbursement Claim" open={createModal} onOk={handleCreate}
        onCancel={() => setCreate(false)} confirmLoading={submitting} okText="Submit Claim">
        <Form form={form} layout="vertical">
          <Form.Item name="enrollmentId" label="Policy" rules={[{ required: true }]}>
            <Select options={enrollments.map(e => ({ label: `${e.enrollmentNumber} — ${e.product?.name}`, value: e._id }))} />
          </Form.Item>
          <Form.Item name="claimType" label="Claim Type" rules={[{ required: true }]}>
            <Select options={['inpatient','outpatient','dental','optical','maternity','pharmacy','emergency','auto_accident','property_damage','other'].map(v => ({ label: v.replace(/_/g,' '), value: v }))} />
          </Form.Item>
          <Form.Item name="incidentDate" label="Date of Incident" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="claimedAmount" label="Amount Claimed (ETB)" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={1} />
          </Form.Item>
          <Form.Item name="description" label="Description" rules={[{ required: true }]}>
            <TextArea rows={3} placeholder="Describe the incident and treatment received..." />
          </Form.Item>
          <Form.Item name="diagnosis" label="Diagnosis (if applicable)">
            <Input placeholder="e.g. Acute appendicitis" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Detail Modal */}
      <Modal title="Claim Details" open={!!detail} onCancel={() => setDetail(null)} footer={null} width={660}>
        {detail && (
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Claim #">{detail.claimNumber}</Descriptions.Item>
              <Descriptions.Item label="Status"><Tag color={STATUS_COLOR[detail.status]}>{detail.status?.replace(/_/g,' ')}</Tag></Descriptions.Item>
              <Descriptions.Item label="Type"><Tag>{detail.claimType?.replace(/_/g,' ')}</Tag></Descriptions.Item>
              <Descriptions.Item label="Incident Date">{new Date(detail.incidentDate).toLocaleDateString()}</Descriptions.Item>
              <Descriptions.Item label="Claimed">{detail.claimedAmount?.toLocaleString()} ETB</Descriptions.Item>
              <Descriptions.Item label="Approved">{detail.approvedAmount?.toLocaleString() || '—'} ETB</Descriptions.Item>
              {detail.settlementAmount && <Descriptions.Item label="Settlement">{detail.settlementAmount?.toLocaleString()} ETB</Descriptions.Item>}
              <Descriptions.Item label="Description" span={2}>{detail.description}</Descriptions.Item>
              {detail.resolution && <Descriptions.Item label="Resolution" span={2}>{detail.resolution}</Descriptions.Item>}
            </Descriptions>

            <Divider>Status Updates</Divider>
            <Timeline items={detail.statusHistory?.map(h => ({
              color: h.status === 'settled' ? 'green' : h.status === 'denied' ? 'red' : 'blue',
              children: <><Tag color={STATUS_COLOR[h.status]}>{h.status?.replace(/_/g,' ')}</Tag> <Text type="secondary" style={{ fontSize: 11 }}>{new Date(h.timestamp).toLocaleString()}</Text>{h.reason && <div style={{ fontSize: 12, color: '#6b7280' }}>{h.reason}</div>}</>
            }))} />

            {detail.notes?.filter(n => !n.isInternal).map((n, i) => (
              <div key={i} style={{ padding: '8px 12px', background: '#f0f9ff', borderRadius: 8, borderLeft: '3px solid #3b82f6' }}>
                <Text style={{ fontSize: 12 }}>{n.content}</Text>
              </div>
            ))}
          </Space>
        )}
      </Modal>
    </div>
  );
}
