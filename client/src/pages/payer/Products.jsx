import { useEffect, useState } from 'react';
import { Table, Tag, Button, Space, Card, Typography, Modal, Form, Input, Select, InputNumber, Spin, Popconfirm, Row, Col, Divider } from 'antd';
import { PlusOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text } = Typography;
const { TextArea } = Input;

const TYPE_COLOR = { health: 'green', auto: 'blue', life: 'purple', home: 'orange', travel: 'cyan', business: 'gold', pet: 'lime', renters: 'geekblue', disability: 'volcano' };

export default function PayerProducts() {
  const [products, setProducts] = useState([]);
  const [tiers, setTiers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState({ open: false, product: null });
  const [viewModal, setView]    = useState({ open: false, product: null, tiers: [] });
  const [form]                  = Form.useForm();
  const { user }                = useAuth();
  const canEdit                 = ['payer_admin', 'superadmin'].includes(user?.role);

  const load = () => {
    setLoading(true);
    api.get('/products').then(r => setProducts(Array.isArray(r.data.products) ? r.data.products : [])).catch(err => console.error('Products load failed:', err)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openView = (product) => {
    api.get(`/products/${product._id}`).then(r => setView({ open: true, product: r.data.product, tiers: r.data.tiers }));
  };

  const openCreate = () => { form.resetFields(); setModal({ open: true, product: null }); };
  const openEdit   = (p) => { form.setFieldsValue({ ...p, productType: p.productType }); setModal({ open: true, product: p }); };

  const handleSave = async () => {
    const vals = await form.validateFields();
    if (modal.product) {
      await api.put(`/products/${modal.product._id}`, vals);
    } else {
      // Attach current user's payer entity
      await api.post('/products', { ...vals, payer: user.linkedEntity?.entityId });
    }
    setModal({ open: false, product: null });
    load();
  };

  const toggleActive = async (p) => {
    await api.patch(`/products/${p._id}/toggle`);
    load();
  };

  const columns = [
    { title: 'Product Name', dataIndex: 'name', key: 'name', render: (v, r) => (
      <Text strong>{v}</Text>
    )},
    { title: 'Type', dataIndex: 'productType', key: 'type', render: v => <Tag color={TYPE_COLOR[v]}>{v}</Tag> },
    { title: 'Target Markets', dataIndex: 'targetMarkets', key: 'markets', render: v => v?.map(m => <Tag key={m}>{m}</Tag>) },
    { title: 'Base Annual Premium', dataIndex: 'baseAnnualPremium', key: 'premium', render: v => `${v?.toLocaleString()} ETB` },
    { title: 'Status', dataIndex: 'isActive', key: 'status', render: v => <Tag color={v ? 'success' : 'default'}>{v ? 'Active' : 'Inactive'}</Tag> },
    { title: 'Actions', key: 'actions', render: (_, r) => (
      <Space>
        <Button size="small" icon={<EyeOutlined />} onClick={() => openView(r)}>View Tiers</Button>
        {canEdit && <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>Edit</Button>}
        {canEdit && (
          <Popconfirm title={r.isActive ? 'Deactivate?' : 'Activate?'} onConfirm={() => toggleActive(r)}>
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
          <Title level={3} style={{ margin: 0, color: '#111827' }}>Products & Tiers</Title>
          <span style={{ color: '#6b7280', fontSize: 14 }}>Manage insurance products and tier configurations.</span>
        </div>
        {canEdit && <Button icon={<PlusOutlined />} onClick={openCreate}
          style={{ background: '#1e3a5f', borderColor: '#1e3a5f', color: '#fff', borderRadius: 8, height: 38 }}>New Product</Button>}
      </div>

      <Card style={{ borderRadius: 12 }}>
        {loading ? <Spin /> : (
          <Table dataSource={products} columns={columns} rowKey="_id" pagination={{ pageSize: 10 }} />
        )}
      </Card>

      {/* Create / Edit Modal */}
      <Modal title={modal.product ? 'Edit Product' : 'New Product'} open={modal.open}
        onOk={handleSave} onCancel={() => setModal({ open: false, product: null })} width={600}>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item name="name" label="Product Name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="productType" label="Type" rules={[{ required: true }]}>
                <Select options={['auto','home','life','health','travel','business','pet','renters','disability'].map(v => ({ label: v, value: v }))} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Description" rules={[{ required: true }]}>
            <TextArea rows={3} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="baseAnnualPremium" label="Base Annual Premium (ETB)" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="waitingPeriodMonths" label="Waiting Period (months)">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="targetMarkets" label="Target Markets">
            <Select mode="multiple" options={['Corporate','SME','Individual','Students','Seniors','Government'].map(v => ({ label: v, value: v }))} />
          </Form.Item>
        </Form>
      </Modal>

      {/* View Tiers Modal */}
      <Modal title={`${viewModal.product?.name} — Tiers`} open={viewModal.open}
        onCancel={() => setView({ open: false, product: null, tiers: [] })} footer={null} width={700}>
        {viewModal.tiers.length === 0 ? (
          <Text type="secondary">No tiers configured yet. Use the Tiers section to add pricing tiers.</Text>
        ) : (
          <Row gutter={[12, 12]}>
            {viewModal.tiers.map(tier => (
              <Col span={24} key={tier._id}>
                <Card size="small" title={<Space><Tag color="blue">{tier.name}</Tag><Text strong>{tier.annualPremium?.toLocaleString()} ETB / year</Text></Space>}>
                  <Text style={{ fontSize: 12 }}>{tier.description}</Text>
                  <Divider style={{ margin: '8px 0' }} />
                  <div>
                    {tier.coverages?.map(c => (
                      <Tag key={c._id} style={{ marginBottom: 4 }}>
                        {c.coverage?.name} {c.customLimit ? `(${c.customLimit.toLocaleString()} ETB)` : ''}
                      </Tag>
                    ))}
                  </div>
                  <div style={{ marginTop: 8, color: '#6b7280', fontSize: 12 }}>
                    Employer pays {tier.employerSharePct}% · Max {tier.maxDependents} dependents
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Modal>
    </div>
  );
}
