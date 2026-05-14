import { useEffect, useState } from 'react';
import {
  Card, Table, Typography, Tag, Space, Button, Modal, Form,
  Input, InputNumber, Select, message, Popconfirm, Divider, Row, Col,
} from 'antd';
import {
  PlusOutlined, EditOutlined, PoweroffOutlined, CarOutlined, HomeOutlined,
  HeartOutlined, MedicineBoxOutlined, GlobalOutlined, ShoppingOutlined, SafetyOutlined,
} from '@ant-design/icons';
import api from '../../api';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const S = { card:{ background:'#0d1a2d', border:'1px solid #1a2d45', borderRadius:12 } };

const TYPE_CONFIG = {
  auto:       { color:'#3b82f6', icon:<CarOutlined /> },
  home:       { color:'#10b981', icon:<HomeOutlined /> },
  life:       { color:'#8b5cf6', icon:<HeartOutlined /> },
  health:     { color:'#ef4444', icon:<MedicineBoxOutlined /> },
  travel:     { color:'#f59e0b', icon:<GlobalOutlined /> },
  business:   { color:'#06b6d4', icon:<ShoppingOutlined /> },
  pet:        { color:'#ec4899', icon:<SafetyOutlined /> },
  renters:    { color:'#84cc16', icon:<HomeOutlined /> },
  disability: { color:'#a78bfa', icon:<SafetyOutlined /> },
};

export default function AdminProducts() {
  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState({ open:false, editing:null });
  const [saving, setSaving]       = useState(false);
  const [form]                    = Form.useForm();
  const [coverageOptions, setOpts]= useState([]);

  const fetch = () => api.get('/products').then(r => setProducts(r.data.products)).finally(() => setLoading(false));
  useEffect(() => { fetch(); }, []);

  const openCreate = () => {
    form.resetFields();
    setOpts([{ name:'', description:'', basePrice:0, maxCoverage:null }]);
    setModal({ open:true, editing:null });
  };

  const openEdit = (p) => {
    form.setFieldsValue({ ...p, features: p.features?.join('\n') });
    setOpts(p.coverageOptions || []);
    setModal({ open:true, editing:p });
  };

  const handleSave = async (values) => {
    setSaving(true);
    try {
      const payload = {
        ...values,
        features: values.features ? values.features.split('\n').filter(Boolean) : [],
        coverageOptions,
      };
      if (modal.editing) {
        const res = await api.put(`/products/${modal.editing._id}`, payload);
        setProducts(prev => prev.map(p => p._id === modal.editing._id ? res.data.product : p));
        message.success('Product updated');
      } else {
        const res = await api.post('/products', payload);
        setProducts(prev => [res.data.product, ...prev]);
        message.success('Product created');
      }
      setModal({ open:false, editing:null });
    } catch (err) {
      message.error(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const handleToggle = async (p) => {
    try {
      const res = await api.patch(`/products/${p._id}/toggle`);
      setProducts(prev => prev.map(x => x._id === p._id ? res.data.product : x));
      message.success(`Product ${res.data.product.isActive ? 'activated' : 'deactivated'}`);
    } catch { message.error('Failed to toggle product'); }
  };

  const updateOpt = (i, field, val) => setOpts(prev => prev.map((o,idx) => idx===i ? {...o,[field]:val} : o));

  const columns = [
    {
      title: 'Product',
      render: (_, r) => {
        const cfg = TYPE_CONFIG[r.type] || { color:'#4f6272', icon:<SafetyOutlined /> };
        return (
          <div style={{ display:'flex', gap:12, alignItems:'center' }}>
            <div style={{ width:38, height:38, borderRadius:10, background:`${cfg.color}18`, border:`1px solid ${cfg.color}33`, display:'flex', alignItems:'center', justifyContent:'center', color:cfg.color, fontSize:17, flexShrink:0 }}>
              {cfg.icon}
            </div>
            <div>
              <Text style={{ color:'#e2e8f0', fontWeight:600, fontSize:13 }}>{r.name}</Text>
              <div>
                <Tag style={{ background:`${cfg.color}18`, color:cfg.color, border:`1px solid ${cfg.color}33`, fontSize:10, marginTop:2 }}>
                  {r.type?.toUpperCase()}
                </Tag>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Base Premium', width: 140,
      render: (_, r) => <Text style={{ color:'#3b82f6', fontWeight:700 }}>${r.baseMonthlyPremium}/mo</Text>,
    },
    {
      title: 'Coverage Options', width: 140,
      render: (_, r) => <Text style={{ color:'#8b9ab0', fontSize:12 }}>{r.coverageOptions?.length||0} options</Text>,
    },
    {
      title: 'Status', width: 100,
      render: (_, r) => (
        <Tag style={{ background: r.isActive ? '#10b98118' : '#ef444418', color: r.isActive ? '#10b981' : '#ef4444', border:`1px solid ${r.isActive ? '#10b98133' : '#ef444433'}`, fontSize:11 }}>
          {r.isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Actions', width: 160,
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} style={{ background:'#122036', border:'1px solid #1a2d45', color:'#e2e8f0' }}
            onClick={() => openEdit(r)}>Edit</Button>
          <Popconfirm title={`${r.isActive ? 'Deactivate' : 'Activate'} this product?`} onConfirm={() => handleToggle(r)}>
            <Button size="small" danger={r.isActive} icon={<PoweroffOutlined />}
              style={!r.isActive ? { background:'#10b98118', border:'1px solid #10b98133', color:'#10b981' } : {}}>
              {r.isActive ? 'Disable' : 'Enable'}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <Title level={4} style={{ color:'#e2e8f0', margin:0 }}>Insurance Products</Title>
          <Text style={{ color:'#4f6272' }}>{products.length} products configured</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} size="large" style={{ height:42, fontWeight:600 }} onClick={openCreate}>
          Add Product
        </Button>
      </div>

      <Card style={S.card}>
        <Table dataSource={products} columns={columns} rowKey="_id" loading={loading}
          pagination={false} style={{ background:'#0d1a2d' }} />
      </Card>

      {/* Product modal */}
      <Modal
        title={<Text style={{ color:'#e2e8f0', fontWeight:700 }}>{modal.editing ? 'Edit Product' : 'Create Product'}</Text>}
        open={modal.open} onCancel={() => setModal({ open:false, editing:null })}
        onOk={() => form.submit()} confirmLoading={saving}
        okText={modal.editing ? 'Save Changes' : 'Create Product'} width={720}
        styles={{ content:{ background:'#0d1a2d' }, header:{ background:'#0d1a2d', borderBottom:'1px solid #1a2d45' }, footer:{ background:'#0d1a2d', borderTop:'1px solid #1a2d45' } }}
      >
        <Form form={form} onFinish={handleSave} layout="vertical" style={{ marginTop:16 }}>
          <Row gutter={12}>
            <Col span={16}>
              <Form.Item name="name" label="Product Name" rules={[{ required:true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="type" label="Type" rules={[{ required:true }]}>
                <Select>
                  {Object.keys(TYPE_CONFIG).map(t => (
                    <Option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Description" rules={[{ required:true }]}>
            <TextArea rows={3} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="baseMonthlyPremium" label="Base Monthly Premium ($)" rules={[{ required:true }]}>
                <InputNumber style={{ width:'100%' }} prefix="$" min={0} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="features" label="Features (one per line)">
                <TextArea rows={3} placeholder="24/7 Support&#10;Roadside Assistance&#10;..." />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ borderColor:'#1a2d45', margin:'8px 0 16px' }}>
            <Text style={{ color:'#4f6272', fontSize:12 }}>Coverage Options</Text>
          </Divider>

          {coverageOptions.map((opt, i) => (
            <div key={i} style={{ background:'#060e1a', border:'1px solid #1a2d45', borderRadius:10, padding:14, marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <Text style={{ color:'#4f6272', fontSize:12, fontWeight:600 }}>OPTION {i+1}</Text>
                <Button size="small" danger onClick={() => setOpts(prev => prev.filter((_,idx)=>idx!==i))}>Remove</Button>
              </div>
              <Row gutter={[8,8]}>
                <Col span={12}>
                  <Input placeholder="Option name" value={opt.name} onChange={e => updateOpt(i,'name',e.target.value)} />
                </Col>
                <Col span={12}>
                  <Input placeholder="Description" value={opt.description} onChange={e => updateOpt(i,'description',e.target.value)} />
                </Col>
                <Col span={12}>
                  <InputNumber style={{ width:'100%' }} placeholder="Base price/mo" prefix="$" value={opt.basePrice} onChange={v => updateOpt(i,'basePrice',v)} />
                </Col>
                <Col span={12}>
                  <InputNumber style={{ width:'100%' }} placeholder="Max coverage" prefix="$" value={opt.maxCoverage} onChange={v => updateOpt(i,'maxCoverage',v)} />
                </Col>
              </Row>
            </div>
          ))}
          <Button block onClick={() => setOpts(prev => [...prev, { name:'', description:'', basePrice:0, maxCoverage:null }])}
            style={{ borderStyle:'dashed', borderColor:'#1a2d45', color:'#4f6272', background:'#060e1a' }}>
            + Add Coverage Option
          </Button>
        </Form>
      </Modal>
    </div>
  );
}
