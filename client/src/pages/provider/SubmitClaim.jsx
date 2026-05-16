import { useState, useEffect } from 'react';
import { Card, Form, Input, Select, InputNumber, DatePicker, Button, Typography, Space, Row, Col, message, Table, Divider } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function ProviderSubmitClaim() {
  const [form]          = Form.useForm();
  const [enrollments, setEnrollments] = useState([]);
  const [services, setServices]       = useState([{ name: '', quantity: 1, unitPrice: 0, totalAmount: 0 }]);
  const [loading, setLoading]         = useState(false);
  const navigate                      = useNavigate();
  const { user }                      = useAuth();

  useEffect(() => {
    api.get('/enrollments', { params: { status: 'active' } })
      .then(r => setEnrollments(r.data.enrollments));
  }, []);

  const updateService = (idx, field, value) => {
    const updated = [...services];
    updated[idx][field] = value;
    if (field === 'quantity' || field === 'unitPrice') {
      updated[idx].totalAmount = (updated[idx].quantity || 0) * (updated[idx].unitPrice || 0);
    }
    setServices(updated);
  };

  const totalClaimed = services.reduce((sum, s) => sum + (s.totalAmount || 0), 0);

  const handleSubmit = async () => {
    const vals = await form.validateFields();
    setLoading(true);
    try {
      await api.post('/claims', {
        ...vals,
        incidentDate: vals.incidentDate?.toISOString(),
        providerId: user.linkedEntity?.entityId,
        submissionType: 'provider_direct',
        claimedAmount: totalClaimed,
        services: services.filter(s => s.name)
      });
      message.success('Claim submitted successfully');
      navigate('/provider/claims');
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to submit claim');
    } finally {
      setLoading(false);
    }
  };

  const serviceColumns = [
    { title: 'Service / Procedure', key: 'name', render: (_, r, i) => (
      <Input value={r.name} onChange={e => updateService(i, 'name', e.target.value)} placeholder="e.g. Consultation" />
    )},
    { title: 'Qty', key: 'qty', width: 80, render: (_, r, i) => (
      <InputNumber min={1} value={r.quantity} onChange={v => updateService(i, 'quantity', v)} style={{ width: '100%' }} />
    )},
    { title: 'Unit Price (ETB)', key: 'up', width: 150, render: (_, r, i) => (
      <InputNumber min={0} value={r.unitPrice} onChange={v => updateService(i, 'unitPrice', v)} style={{ width: '100%' }} />
    )},
    { title: 'Total (ETB)', key: 'total', width: 130, render: (_, r) => <Text strong>{r.totalAmount?.toLocaleString()}</Text> },
    { title: '', key: 'del', width: 40, render: (_, r, i) => (
      <Button type="text" danger icon={<DeleteOutlined />} onClick={() => setServices(s => s.filter((_, idx) => idx !== i))} />
    )},
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <Title level={4} style={{ margin: 0 }}>Submit Direct Billing Claim</Title>

      <Card style={{ borderRadius: 12 }}>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="enrollmentId" label="Policy Enrollment" rules={[{ required: true }]}>
                <Select
                  showSearch
                  placeholder="Select enrollment"
                  options={enrollments.map(e => ({
                    label: `${e.enrollmentNumber} — ${e.institution?.name || 'Individual'} (${e.product?.name})`,
                    value: e._id
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="insuredPersonId" label="Insured Person (Patient)" rules={[{ required: true }]}>
                <Input placeholder="Insured person ID or select from enrollment" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="claimType" label="Claim Type" rules={[{ required: true }]}>
                <Select options={['inpatient','outpatient','dental','optical','maternity','pharmacy','emergency','specialist','other'].map(v => ({ label: v, value: v }))} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="incidentDate" label="Date of Service" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="priority" label="Priority" initialValue="medium">
                <Select options={['low','medium','high','urgent'].map(v => ({ label: v, value: v }))} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="diagnosis" label="Diagnosis / ICD Code">
            <Input placeholder="e.g. Type 2 Diabetes mellitus (E11)" />
          </Form.Item>

          <Form.Item name="description" label="Clinical Notes / Description" rules={[{ required: true }]}>
            <TextArea rows={3} placeholder="Summary of treatment provided..." />
          </Form.Item>

          <Divider>Services & Line Items</Divider>
          <Table dataSource={services} columns={serviceColumns} rowKey={(r, i) => i} pagination={false} size="small" />
          <Button icon={<PlusOutlined />} style={{ marginTop: 8 }} onClick={() => setServices(s => [...s, { name: '', quantity: 1, unitPrice: 0, totalAmount: 0 }])}>
            Add Service
          </Button>

          <div style={{ marginTop: 16, padding: 16, background: '#f9fafb', borderRadius: 8, display: 'flex', justifyContent: 'flex-end' }}>
            <Text strong style={{ fontSize: 16 }}>Total Claimed: {totalClaimed.toLocaleString()} ETB</Text>
          </div>

          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <Button onClick={() => navigate('/provider/claims')}>Cancel</Button>
            <Button type="primary" loading={loading} onClick={handleSubmit}>Submit Claim</Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
