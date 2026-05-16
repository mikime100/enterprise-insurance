import { useEffect, useState } from 'react';
import { Table, Tag, Button, Space, Card, Typography, Modal, Form, Input, Select, InputNumber, Spin, Popconfirm, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function PayerCoverages() {
  const [coverages, setCoverages] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState({ open: false, coverage: null });
  const [form]                    = Form.useForm();
  const { user }                  = useAuth();
  const canEdit                   = ['payer_admin', 'superadmin'].includes(user?.role);

  const load = () => {
    setLoading(true);
    api.get('/coverages').then(r => setCoverages(Array.isArray(r.data.coverages) ? r.data.coverages : [])).catch(err => console.error('Coverages load failed:', err)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { form.resetFields(); setModal({ open: true, coverage: null }); };
  const openEdit   = (c) => { form.setFieldsValue(c); setModal({ open: true, coverage: c }); };

  const handleSave = async () => {
    const vals = await form.validateFields();
    if (modal.coverage) {
      await api.put(`/coverages/${modal.coverage._id}`, vals);
    } else {
      await api.post('/coverages', { ...vals, payer: user.linkedEntity?.entityId });
    }
    setModal({ open: false, coverage: null });
    load();
  };

  const columns = [
    { title: 'Coverage Name', dataIndex: 'name', key: 'name', render: v => <Text strong>{v}</Text> },
    { title: 'Product Type', dataIndex: 'productType', key: 'type', render: v => <Tag color="blue">{v}</Tag> },
    { title: 'Annual Limit (ETB)', key: 'annual', render: (_, r) => r.limits?.annual?.toLocaleString() || '—' },
    { title: 'Per Claim (ETB)', key: 'perClaim', render: (_, r) => r.limits?.perClaim?.toLocaleString() || '—' },
    { title: 'Deductible (ETB)', dataIndex: 'deductible', key: 'ded', render: v => v?.toLocaleString() || 0 },
    { title: 'Co-pay %', dataIndex: 'copaymentPct', key: 'copay', render: v => `${v || 0}%` },
    { title: 'Status', dataIndex: 'isActive', key: 'status', render: v => <Tag color={v ? 'success' : 'default'}>{v ? 'Active' : 'Inactive'}</Tag> },
    { title: 'Actions', key: 'actions', render: (_, r) => (
      <Space>
        {canEdit && <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>Edit</Button>}
        {canEdit && (
          <Popconfirm title={r.isActive ? 'Deactivate?' : 'Activate?'} onConfirm={async () => { await api.patch(`/coverages/${r._id}/toggle`); load(); }}>
            <Button size="small" danger={r.isActive}>{r.isActive ? 'Deactivate' : 'Activate'}</Button>
          </Popconfirm>
        )}
      </Space>
    )},
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#111827' }}>Coverage Types</Title>
          <span style={{ color: '#6b7280', fontSize: 14 }}>Define coverage limits, deductibles, and co-payment rules.</span>
        </div>
        {canEdit && <Button icon={<PlusOutlined />} onClick={openCreate}
          style={{ background: '#1e3a5f', borderColor: '#1e3a5f', color: '#fff', borderRadius: 8, height: 38 }}>New Coverage</Button>}
      </div>
      <Card style={{ borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        {loading ? <Spin /> : <Table dataSource={coverages} columns={columns} rowKey="_id" pagination={{ pageSize: 12 }} size="small" />}
      </Card>

      <Modal title={modal.coverage ? 'Edit Coverage' : 'New Coverage'} open={modal.open}
        onOk={handleSave} onCancel={() => setModal({ open: false, coverage: null })} width={560}>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={16}><Form.Item name="name" label="Coverage Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={8}>
              <Form.Item name="productType" label="Product Type" rules={[{ required: true }]}>
                <Select options={['auto','home','life','health','travel','business','pet','renters','disability'].map(v => ({ label: v, value: v }))} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Description"><TextArea rows={2} /></Form.Item>
          <Row gutter={12}>
            <Col span={12}><Form.Item name={['limits','annual']} label="Annual Limit (ETB)"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
            <Col span={12}><Form.Item name={['limits','perClaim']} label="Per Claim Limit (ETB)"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
            <Col span={12}><Form.Item name="deductible" label="Deductible (ETB)"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
            <Col span={12}><Form.Item name="copaymentPct" label="Co-payment %"><InputNumber style={{ width: '100%' }} min={0} max={100} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
