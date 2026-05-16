import { useEffect, useState } from 'react';
import { Card, Table, Tag, Typography, Space, Spin, Button, Modal, Form, Input, Select } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import api from '../../api';

const { Title, Text } = Typography;

export default function AdminProviders() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form] = Form.useForm();

  const load = () => { setLoading(true); api.get('/admin/providers').then(r => setProviders(Array.isArray(r.data.providers) ? r.data.providers : [])).catch(err => console.error('Providers load failed:', err)).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'n', render: v => <Text strong>{v}</Text> },
    { title: 'Type', dataIndex: 'type', key: 't', render: v => <Tag>{v?.replace(/_/g,' ')}</Tag> },
    { title: 'License #', dataIndex: 'licenseNumber', key: 'l', render: v => v || '—' },
    { title: 'Contact', dataIndex: 'contactEmail', key: 'c' },
    { title: 'Status', dataIndex: 'isActive', key: 's', render: v => <Tag color={v ? 'success' : 'default'}>{v ? 'Active' : 'Inactive'}</Tag> },
  ];

  const handleCreate = async () => {
    const vals = await form.validateFields();
    await api.post('/admin/providers', vals);
    setModal(false); form.resetFields(); load();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#111827' }}>Providers (Hospitals & Services)</Title>
          <span style={{ color: '#6b7280', fontSize: 14 }}>Manage hospitals, clinics, and service providers in the network.</span>
        </div>
        <Button style={{ background: '#1e3a5f', borderColor: '#1e3a5f', color: '#fff', borderRadius: 7, height: 38 }}
          icon={<PlusOutlined />} onClick={() => setModal(true)}>Add Provider</Button>
      </div>
      <Card style={{ borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        {loading ? <Spin /> : <Table dataSource={providers} columns={columns} rowKey="_id" />}
      </Card>
      <Modal title="Add Provider" open={modal} onOk={handleCreate} onCancel={() => setModal(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Provider Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="type" label="Type" rules={[{ required: true }]}>
            <Select options={['hospital','clinic','pharmacy','lab','auto_repair','property_assessor','specialist'].map(v => ({ label: v.replace(/_/g,' '), value: v }))} />
          </Form.Item>
          <Form.Item name="contactEmail" label="Contact Email"><Input /></Form.Item>
          <Form.Item name="contactPhone" label="Contact Phone"><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
