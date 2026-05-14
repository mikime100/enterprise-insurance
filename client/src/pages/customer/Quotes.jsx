import { useEffect, useState } from 'react';
import {
  Card, Steps, Select, Form, Input, InputNumber, Button, Typography,
  Tag, Space, Row, Col, Modal, Divider, Alert, Spin, message, Radio, Checkbox,
} from 'antd';
import {
  CarOutlined, HomeOutlined, HeartOutlined, MedicineBoxOutlined,
  GlobalOutlined, ShoppingOutlined, CheckCircleOutlined, ArrowRightOutlined,
  ArrowLeftOutlined, CreditCardOutlined, SafetyOutlined, StarOutlined,
} from '@ant-design/icons';
import api from '../../api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const S = {
  card: { background:'#ffffff', border:'1px solid #e8edf3', borderRadius:12 },
  inner: { background:'#f8f9fc', border:'1px solid #e8edf3', borderRadius:10 },
};

const TT = { contentStyle:{ background:'#f0f4f8', border:'1px solid #e8edf3', borderRadius:8 }, labelStyle:{ color:'#111827' }, itemStyle:{ color:'#6b7280' } };

const PRODUCT_ICONS = {
  auto:      { icon:<CarOutlined />,          color:'#22c55e' },
  home:      { icon:<HomeOutlined />,         color:'#10b981' },
  life:      { icon:<HeartOutlined />,        color:'#8b5cf6' },
  health:    { icon:<MedicineBoxOutlined />,  color:'#ef4444' },
  travel:    { icon:<GlobalOutlined />,       color:'#f59e0b' },
  business:  { icon:<ShoppingOutlined />,     color:'#06b6d4' },
  pet:       { icon:<StarOutlined />,         color:'#ec4899' },
  renters:   { icon:<HomeOutlined />,         color:'#84cc16' },
  disability:{ icon:<SafetyOutlined />,       color:'#a78bfa' },
};

const STATUS_COLORS = {
  pending:'#22c55e', reviewed:'#06b6d4', accepted:'#10b981', rejected:'#ef4444', expired:'#9ca3af',
};

const FREQ_OPTIONS = [
  { val:'monthly',     label:'Monthly',     disc:'',       mult:1.00 },
  { val:'quarterly',   label:'Quarterly',   disc:'5% off', mult:0.95 },
  { val:'semi-annual', label:'Semi-Annual', disc:'8% off', mult:0.92 },
  { val:'annual',      label:'Annual',      disc:'12% off',mult:0.88 },
];

export default function CustomerQuotes() {
  const [products, setProducts]           = useState([]);
  const [quotes, setQuotes]               = useState([]);
  const [loading, setLoading]             = useState(true);
  const [step, setStep]                   = useState(0);
  const [selectedProduct, setProduct]     = useState(null);
  const [selectedOptions, setOptions]     = useState([]);
  const [frequency, setFrequency]         = useState('monthly');
  const [premium, setPremium]             = useState(0);
  const [submitting, setSubmitting]       = useState(false);
  const [payModal, setPayModal]           = useState({ open:false, quoteId:null });
  const [payForm]                         = Form.useForm();
  const [purchasing, setPurchasing]       = useState(false);

  useEffect(() => {
    Promise.all([api.get('/products'), api.get('/quotes')])
      .then(([pr, qr]) => { setProducts(pr.data.products); setQuotes(qr.data.quotes); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedProduct) return;
    const addons = selectedOptions.reduce((s, n) => {
      const o = selectedProduct.coverageOptions.find(x => x.name === n);
      return s + (o?.basePrice || 0);
    }, 0);
    const mult = FREQ_OPTIONS.find(f => f.val === frequency)?.mult || 1;
    setPremium(((selectedProduct.baseMonthlyPremium + addons) * mult).toFixed(2));
  }, [selectedProduct, selectedOptions, frequency]);

  const selectProduct = (p) => { setProduct(p); setOptions([]); setStep(1); };

  const toggleOption = (name) => {
    setOptions(prev => prev.includes(name) ? prev.filter(o => o !== name) : [...prev, name]);
  };

  const handleSubmitQuote = async () => {
    setSubmitting(true);
    try {
      const res = await api.post('/quotes', {
        productId: selectedProduct._id,
        coverageDetails: { selectedOptions, coverageAmount: selectedProduct.coverageOptions[0]?.maxCoverage },
        frequency,
      });
      setQuotes(prev => [res.data.quote, ...prev]);
      message.success('Quote created successfully!');
      setStep(3);
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to create quote');
    } finally { setSubmitting(false); }
  };

  const confirmPurchase = async () => {
    setPurchasing(true);
    try {
      await payForm.validateFields();
      await api.post(`/quotes/${payModal.quoteId}/accept`, { paymentMethod:'credit_card' });
      message.success('Policy activated! Check My Policies.');
      setPayModal({ open:false, quoteId:null });
      const res = await api.get('/quotes');
      setQuotes(res.data.quotes);
    } catch (err) {
      if (err.errorFields) return;
      message.error(err.response?.data?.message || 'Purchase failed');
    } finally { setPurchasing(false); }
  };

  if (loading) return <div style={{ display:'flex', justifyContent:'center', paddingTop:80 }}><Spin size="large" /></div>;

  return (
    <div>
      <Title level={4} style={{ color:'#111827', marginBottom:4 }}>Insurance Quotes</Title>
      <Text style={{ color:'#9ca3af', display:'block', marginBottom:28 }}>
        Compare coverage options and get instant pricing tailored to your needs.
      </Text>

      {/* Step indicator */}
      <div style={{ background:'#ffffff', border:'1px solid #e8edf3', borderRadius:12, padding:'20px 28px', marginBottom:28 }}>
        <Steps current={step} size="small"
          items={['Select Product','Configure Coverage','Review & Confirm','Complete'].map(t => ({ title:<Text style={{ color:'#6b7280', fontSize:12 }}>{t}</Text> }))}
        />
      </div>

      {/* Step 0: Product grid */}
      {step === 0 && (
        <>
          <div style={{ marginBottom:20 }}>
            <Title level={5} style={{ color:'#111827', margin:0 }}>Choose an Insurance Product</Title>
            <Text style={{ color:'#9ca3af', fontSize:13 }}>{products.length} products available</Text>
          </div>
          <Row gutter={[16, 16]}>
            {products.map(p => {
              const cfg = PRODUCT_ICONS[p.type] || { icon:<SafetyOutlined />, color:'#22c55e' };
              return (
                <Col xs={24} sm={12} lg={8} key={p._id}>
                  <Card hoverable onClick={() => selectProduct(p)} className="ei-card-hover"
                    style={{ ...S.card, cursor:'pointer' }} styles={{ body:{ padding:22 } }}>
                    <div style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
                      <div style={{ width:46, height:46, borderRadius:12, flexShrink:0, background:`${cfg.color}18`, border:`1px solid ${cfg.color}33`, display:'flex', alignItems:'center', justifyContent:'center', color:cfg.color, fontSize:20 }}>
                        {cfg.icon}
                      </div>
                      <div style={{ flex:1 }}>
                        <Text style={{ color:'#111827', fontWeight:700, display:'block', fontSize:14 }}>{p.name}</Text>
                        <Text style={{ color:'#9ca3af', fontSize:12, lineHeight:1.5 }}>{p.description?.slice(0,70)}...</Text>
                        <div style={{ marginTop:10, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <Text style={{ color:cfg.color, fontWeight:700, fontSize:16 }}>
                            From ${p.baseMonthlyPremium}<span style={{ color:'#9ca3af', fontSize:11 }}>/mo</span>
                          </Text>
                          <Tag style={{ background:`${cfg.color}18`, color:cfg.color, border:`1px solid ${cfg.color}33`, fontSize:10 }}>
                            {p.type?.toUpperCase()}
                          </Tag>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>
        </>
      )}

      {/* Step 1: Configure */}
      {step === 1 && selectedProduct && (
        <Row gutter={[20, 20]}>
          <Col xs={24} lg={16}>
            <Card style={S.card} styles={{ header:{ borderBottom:'1px solid #e8edf3' } }}
              title={<Text style={{ color:'#111827', fontWeight:700 }}>{selectedProduct.name} — Coverage Options</Text>}>
              <Alert message={selectedProduct.description} type="info" showIcon
                style={{ marginBottom:20, borderRadius:8 }} />

              <Text style={{ color:'#6b7280', fontSize:13, fontWeight:600, display:'block', marginBottom:12 }}>
                ADD-ON COVERAGE
              </Text>
              <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:24 }}>
                {selectedProduct.coverageOptions.map(opt => {
                  const active = selectedOptions.includes(opt.name);
                  return (
                    <div key={opt.name} onClick={() => toggleOption(opt.name)} style={{
                      background: active ? '#eff6ff' : '#f8f9fc',
                      border:`1px solid ${active ? '#22c55e' : '#e8edf3'}`,
                      borderRadius:10, padding:'14px 18px', cursor:'pointer',
                      display:'flex', justifyContent:'space-between', alignItems:'center',
                      transition:'all 0.15s',
                    }}>
                      <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                        <div style={{ marginTop:2, width:18, height:18, borderRadius:4, border:`2px solid ${active ? '#22c55e' : '#e8edf3'}`, background: active ? '#22c55e' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.15s' }}>
                          {active && <CheckCircleOutlined style={{ color:'#fff', fontSize:11 }} />}
                        </div>
                        <div>
                          <Text style={{ color:'#111827', fontWeight:600, fontSize:13 }}>{opt.name}</Text>
                          <div style={{ color:'#9ca3af', fontSize:12, marginTop:2 }}>
                            {opt.description}{opt.maxCoverage && ` · Up to $${opt.maxCoverage.toLocaleString()}`}
                          </div>
                        </div>
                      </div>
                      <Text style={{ color:'#22c55e', fontWeight:700, fontSize:14, whiteSpace:'nowrap', marginLeft:16 }}>
                        +${opt.basePrice}/mo
                      </Text>
                    </div>
                  );
                })}
              </div>

              <Text style={{ color:'#6b7280', fontSize:13, fontWeight:600, display:'block', marginBottom:12 }}>
                PAYMENT FREQUENCY
              </Text>
              <Row gutter={[10, 10]}>
                {FREQ_OPTIONS.map(f => (
                  <Col key={f.val} xs={12} sm={6}>
                    <div onClick={() => setFrequency(f.val)} style={{
                      background: frequency === f.val ? '#eff6ff' : '#f8f9fc',
                      border:`1px solid ${frequency === f.val ? '#22c55e' : '#e8edf3'}`,
                      borderRadius:10, padding:'12px 14px', cursor:'pointer', textAlign:'center', transition:'all 0.15s',
                    }}>
                      <Text style={{ color: frequency === f.val ? '#22c55e' : '#111827', fontWeight:600, display:'block', fontSize:13 }}>{f.label}</Text>
                      {f.disc && <Tag style={{ background:'#10b98118', color:'#10b981', border:'1px solid #10b98133', fontSize:10, marginTop:4 }}>{f.disc}</Tag>}
                    </div>
                  </Col>
                ))}
              </Row>
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <div style={{ position:'sticky', top:80 }}>
              <Card style={S.card} styles={{ header:{ borderBottom:'1px solid #e8edf3' } }}
                title={<Text style={{ color:'#111827', fontWeight:700 }}>Quote Summary</Text>}>
                <div style={{ marginBottom:16 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                    <Text style={{ color:'#9ca3af', fontSize:13 }}>Base premium</Text>
                    <Text style={{ color:'#111827', fontSize:13 }}>${selectedProduct.baseMonthlyPremium}/mo</Text>
                  </div>
                  {selectedOptions.map(name => {
                    const o = selectedProduct.coverageOptions.find(x => x.name === name);
                    return o ? (
                      <div key={name} style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                        <Text style={{ color:'#9ca3af', fontSize:12 }}>+ {name}</Text>
                        <Text style={{ color:'#6b7280', fontSize:12 }}>+${o.basePrice}/mo</Text>
                      </div>
                    ) : null;
                  })}
                  {FREQ_OPTIONS.find(f=>f.val===frequency)?.disc && (
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                      <Text style={{ color:'#10b981', fontSize:12 }}>Frequency discount</Text>
                      <Text style={{ color:'#10b981', fontSize:12 }}>{FREQ_OPTIONS.find(f=>f.val===frequency).disc}</Text>
                    </div>
                  )}
                </div>
                <Divider style={{ borderColor:'#e8edf3', margin:'12px 0' }} />
                <div style={{ textAlign:'center', padding:'12px 0' }}>
                  <Text style={{ color:'#9ca3af', fontSize:12, display:'block', marginBottom:4 }}>
                    {frequency} premium
                  </Text>
                  <Text style={{ color:'#22c55e', fontSize:32, fontWeight:800 }}>${premium}</Text>
                </div>
                <Space direction="vertical" style={{ width:'100%', gap:8 }}>
                  <Button type="primary" block icon={<ArrowRightOutlined />} onClick={() => setStep(2)}>
                    Review Quote
                  </Button>
                  <Button block icon={<ArrowLeftOutlined />} style={{ background:'#f8f9fc', border:'1px solid #e8edf3', color:'#6b7280' }}
                    onClick={() => { setProduct(null); setStep(0); }}>
                    Back to Products
                  </Button>
                </Space>
              </Card>
            </div>
          </Col>
        </Row>
      )}

      {/* Step 2: Review */}
      {step === 2 && selectedProduct && (
        <Row gutter={[20, 20]}>
          <Col xs={24} lg={16}>
            <Card style={S.card} styles={{ header:{ borderBottom:'1px solid #e8edf3' } }}
              title={<Text style={{ color:'#111827', fontWeight:700 }}>Review Your Quote</Text>}>
              <Row gutter={[16, 20]}>
                {[
                  { label:'Product', value:selectedProduct.name },
                  { label:'Type', value:<Tag style={{ background:'#22c55e18', color:'#22c55e', border:'1px solid #22c55e33' }}>{selectedProduct.type?.toUpperCase()}</Tag> },
                  { label:'Payment Frequency', value:<span style={{ textTransform:'capitalize' }}>{frequency}</span> },
                  { label:'Valid Until', value:dayjs().add(30,'days').format('MMMM D, YYYY') },
                ].map(item => (
                  <Col key={item.label} xs={12}>
                    <div style={{ background:'#f8f9fc', borderRadius:10, padding:'14px 16px', border:'1px solid #e8edf3' }}>
                      <Text style={{ color:'#9ca3af', fontSize:11, display:'block', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.06em' }}>{item.label}</Text>
                      <Text style={{ color:'#111827', fontWeight:600, fontSize:14 }}>{item.value}</Text>
                    </div>
                  </Col>
                ))}
                <Col xs={24}>
                  <div style={{ background:'#f8f9fc', borderRadius:10, padding:'14px 16px', border:'1px solid #e8edf3' }}>
                    <Text style={{ color:'#9ca3af', fontSize:11, display:'block', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.06em' }}>Coverage Add-ons</Text>
                    {selectedOptions.length > 0
                      ? <Space wrap>{selectedOptions.map(o => <Tag key={o} style={{ background:'#22c55e18', color:'#22c55e', border:'1px solid #22c55e33' }}><CheckCircleOutlined style={{ marginRight:4 }} />{o}</Tag>)}</Space>
                      : <Text style={{ color:'#9ca3af', fontSize:13 }}>Base coverage only — no add-ons selected</Text>
                    }
                  </div>
                </Col>
              </Row>

              <Divider style={{ borderColor:'#e8edf3', margin:'20px 0' }}>Included Features</Divider>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {selectedProduct.features?.map(f => (
                  <div key={f} style={{ display:'flex', alignItems:'center', gap:6, background:'#f8f9fc', border:'1px solid #e8edf3', borderRadius:8, padding:'6px 12px' }}>
                    <CheckCircleOutlined style={{ color:'#10b981', fontSize:12 }} />
                    <Text style={{ color:'#6b7280', fontSize:12 }}>{f}</Text>
                  </div>
                ))}
              </div>
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <div style={{ position:'sticky', top:80 }}>
              <Card style={S.card} styles={{ header:{ borderBottom:'1px solid #e8edf3' } }}
                title={<Text style={{ color:'#111827', fontWeight:700 }}>Final Price</Text>}>
                <div style={{ textAlign:'center', padding:'20px 0' }}>
                  <Text style={{ color:'#9ca3af', fontSize:13, display:'block', marginBottom:4 }}>{frequency} premium</Text>
                  <Text style={{ color:'#22c55e', fontSize:36, fontWeight:800 }}>${premium}</Text>
                  <Text style={{ color:'#9ca3af', fontSize:12, display:'block', marginTop:8 }}>Quote valid for 30 days</Text>
                </div>
                <Space direction="vertical" style={{ width:'100%', gap:8 }}>
                  <Button type="primary" block loading={submitting} onClick={handleSubmitQuote} icon={<CheckCircleOutlined />}>
                    Save This Quote
                  </Button>
                  <Button block icon={<ArrowLeftOutlined />} style={{ background:'#f8f9fc', border:'1px solid #e8edf3', color:'#6b7280' }}
                    onClick={() => setStep(1)}>
                    Edit Coverage
                  </Button>
                </Space>
              </Card>
            </div>
          </Col>
        </Row>
      )}

      {/* Step 3: Success */}
      {step === 3 && (
        <Card style={{ ...S.card, textAlign:'center', padding:'48px 32px' }}>
          <div style={{ width:80, height:80, borderRadius:'50%', background:'#10b98118', border:'2px solid #10b98133', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
            <CheckCircleOutlined style={{ fontSize:40, color:'#10b981' }} />
          </div>
          <Title level={4} style={{ color:'#111827', marginBottom:8 }}>Quote Saved Successfully!</Title>
          <Text style={{ color:'#9ca3af', display:'block', marginBottom:24, fontSize:14, lineHeight:1.7 }}>
            Your quote is valid for 30 days. Review it below and click Purchase when ready to activate your policy.
          </Text>
          <Button type="primary" size="large" onClick={() => { setStep(0); setProduct(null); setOptions([]); }}>
            Get Another Quote
          </Button>
        </Card>
      )}

      {/* Existing quotes */}
      {quotes.length > 0 && (
        <Card style={{ ...S.card, marginTop:32 }}
          styles={{ header:{ borderBottom:'1px solid #e8edf3' } }}
          title={
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <Text style={{ color:'#111827', fontWeight:700 }}>My Quotes</Text>
              <Tag style={{ background:'#22c55e18', color:'#22c55e', border:'1px solid #22c55e33' }}>{quotes.length} quotes</Tag>
            </div>
          }>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {quotes.map(q => {
              const sc = STATUS_COLORS[q.status] || '#9ca3af';
              return (
                <div key={q._id} style={{
                  background:'#f8f9fc', borderRadius:10, padding:'16px 20px',
                  border:`1px solid ${q.status === 'pending' || q.status === 'reviewed' ? '#e8edf366' : '#e8edf3'}`,
                  display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12,
                }}>
                  <div style={{ display:'flex', gap:14, alignItems:'center' }}>
                    <div style={{ width:40, height:40, borderRadius:10, background:`${PRODUCT_ICONS[q.product?.type]?.color || '#22c55e'}18`, display:'flex', alignItems:'center', justifyContent:'center', color:PRODUCT_ICONS[q.product?.type]?.color || '#22c55e', fontSize:18 }}>
                      {PRODUCT_ICONS[q.product?.type]?.icon || <SafetyOutlined />}
                    </div>
                    <div>
                      <Text style={{ color:'#111827', fontWeight:600, fontSize:14 }}>{q.product?.name}</Text>
                      <div style={{ color:'#9ca3af', fontSize:12, marginTop:2 }}>
                        Valid until {dayjs(q.validUntil).format('MMM D, YYYY')} · {q.frequency}
                      </div>
                    </div>
                  </div>
                  <Space>
                    <Text style={{ color:'#22c55e', fontWeight:700, fontSize:16 }}>${q.calculatedPremium}<span style={{ color:'#9ca3af', fontSize:11 }}>/mo</span></Text>
                    <Tag style={{ background:`${sc}18`, color:sc, border:`1px solid ${sc}33`, fontSize:11 }}>{q.status}</Tag>
                    {(q.status === 'pending' || q.status === 'reviewed') && (
                      <Button type="primary" size="small" icon={<CreditCardOutlined />}
                        onClick={() => { payForm.resetFields(); setPayModal({ open:true, quoteId:q._id }); }}>
                        Purchase
                      </Button>
                    )}
                  </Space>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Payment modal */}
      <Modal
        title={<Text style={{ color:'#111827', fontWeight:700 }}>Complete Purchase</Text>}
        open={payModal.open}
        onCancel={() => setPayModal({ open:false, quoteId:null })}
        onOk={confirmPurchase}
        confirmLoading={purchasing}
        okText="Pay & Activate Policy"
        styles={{ content:{ background:'#ffffff' }, header:{ background:'#ffffff', borderBottom:'1px solid #e8edf3' }, footer:{ background:'#ffffff', borderTop:'1px solid #e8edf3' } }}
      >
        <Alert message="Simulated payment — no real charges will be made." type="info" showIcon
          style={{ marginBottom:20, borderRadius:8 }} />
        <Form form={payForm} layout="vertical" style={{ marginTop:4 }}>
          <Form.Item name="cardNumber" label="Card Number" rules={[{ required:true },{ len:16, message:'Enter 16 digits' }]}>
            <Input prefix={<CreditCardOutlined style={{ color:'#9ca3af' }} />} maxLength={16} placeholder="1234 5678 9012 3456"
              style={{ background:'#f8f9fc', borderColor:'#e8edf3' }} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="expiry" label="Expiry" rules={[{ required:true }]}>
                <Input placeholder="MM/YY" maxLength={5} style={{ background:'#f8f9fc', borderColor:'#e8edf3' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="cvv" label="CVV" rules={[{ required:true }]}>
                <Input.Password maxLength={4} placeholder="•••" style={{ background:'#f8f9fc', borderColor:'#e8edf3' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="name" label="Cardholder Name" rules={[{ required:true }]}>
            <Input placeholder="John Doe" style={{ background:'#f8f9fc', borderColor:'#e8edf3' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
