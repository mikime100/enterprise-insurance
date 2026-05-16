import { useEffect, useState } from 'react';
import { Card, Table, Tag, Typography, Space, Spin, Button, Modal, Form, Input, Select } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import api from '../../api';

const { Title, Text } = Typography;

export default function AdminPayers() {
  const [payers, setPayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form] = Form.useForm();

  const load = () => { setLoading(true); api.get('/admin/payers').then(r => setPayers(Array.isArray(r.data.payers) ? r.data.payers : [])).catch(err => console.error('Payers load failed:', err)).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'n', render: v => <Text strong>{v}</Text> },
    { title: 'License #', dataIndex: 'licenseNumber', key: 'l' },
    { title: 'Type', dataIndex: 'type', key: 't', render: v => <Tag>{v}</Tag> },
    { title: 'Contact', dataIndex: 'contactEmail', key: 'c' },
    { title: 'Status', dataIndex: 'isActive', key: 's', render: v => <Tag color={v ? 'success' : 'default'}>{v ? 'Active' : 'Inactive'}</Tag> },
  ];

  const handleCreate = async () => {
    const vals = await form.validateFields();
    await api.post('/admin/payers', vals);
    setModal(false); form.resetFields(); load();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#111827' }}>Payers (Insurance Companies)</Title>
          <span style={{ color: '#6b7280', fontSize: 14 }}>Manage all registered insurance payer organizations.</span>
        </div>
        <Button style={{ background: '#1e3a5f', borderColor: '#1e3a5f', color: '#fff', borderRadius: 7, height: 38 }}
          icon={<PlusOutlined />} onClick={() => setModal(true)}>Add Payer</Button>
      </div>
      <Card style={{ borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        {loading ? <Spin /> : <Table dataSource={payers} columns={columns} rowKey="_id" />}
      </Card>
      <Modal title="Add Payer" open={modal} onOk={handleCreate} onCancel={() => setModal(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Company Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="licenseNumber" label="License Number" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="type" label="Type" rules={[{ required: true }]}>
            <Select options={['life','general','composite'].map(v => ({ label: v, value: v }))} />
          </Form.Item>
          <Form.Item name="contactEmail" label="Contact Email"><Input /></Form.Item>
          <Form.Item name="contactPhone" label="Contact Phone"><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
