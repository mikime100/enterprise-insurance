import { useEffect, useState } from 'react';
import {
  Card, Tag, Typography, Space, Spin, Empty, Button, Modal,
  Descriptions, Timeline, Row, Col, Divider, Form, Input, message, Progress,
} from 'antd';
import {
  SafetyOutlined, CalendarOutlined, DollarOutlined, CreditCardOutlined,
  CheckCircleOutlined, ClockCircleOutlined, EyeOutlined,
} from '@ant-design/icons';
import api from '../../api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const S = {
  card: { background:'#ffffff', border:'1px solid #e8edf3', borderRadius:12 },
  inner: { background:'#f8f9fc', border:'1px solid #e8edf3', borderRadius:10 },
};

const STATUS_CONFIG = {
  active:          { color:'#10b981', label:'Active' },
  pending:         { color:'#f59e0b', label:'Pending' },
  suspended:       { color:'#f97316', label:'Suspended' },
  cancelled:       { color:'#ef4444', label:'Cancelled' },
  expired:         { color:'#9ca3af', label:'Expired' },
  pending_renewal: { color:'#22c55e', label:'Pending Renewal' },
};

function StatusTag({ status }) {
  const cfg = STATUS_CONFIG[status] || { color:'#9ca3af', label:status };
  return (
    <Tag style={{ background:`${cfg.color}18`, color:cfg.color, border:`1px solid ${cfg.color}33`, fontSize:11, fontWeight:500 }}>
      {cfg.label}
    </Tag>
  );
}

export default function CustomerPolicies() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [detailOpen, setDetail] = useState(false);
  const [payOpen, setPay]       = useState(false);
  const [paying, setPaying]     = useState(false);
  const [payForm]               = Form.useForm();

  useEffect(() => {
    api.get('/policies').then(r => setPolicies(r.data.policies)).finally(() => setLoading(false));
  }, []);

  const openDetail = async (p) => {
    const res = await api.get(`/policies/${p._id}`);
    setSelected(res.data.policy);
    setDetail(true);
  };

  const handlePayment = async () => {
    setPaying(true);
    try {
      await payForm.validateFields();
      await api.post(`/policies/${selected._id}/payment`, { amount:selected.premium.amount, method:'credit_card' });
      message.success('Payment recorded successfully');
      setPay(false);
      payForm.resetFields();
      const updated = await api.get(`/policies/${selected._id}`);
      setSelected(updated.data.policy);
    } catch (err) {
      if (err.errorFields) return;
      message.error('Payment failed');
    } finally { setPaying(false); }
  };

  if (loading) return <div style={{ display:'flex', justifyContent:'center', paddingTop:80 }}><Spin size="large" /></div>;

  const active = policies.filter(p => p.status === 'active');
  const totalCoverage = active.reduce((s, p) => s + (p.coverageDetails?.coverageAmount || 0), 0);

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <Title level={4} style={{ color:'#111827', margin:0 }}>My Policies</Title>
          <Text style={{ color:'#9ca3af' }}>{policies.length} {policies.length===1?'policy':'policies'} in your portfolio</Text>
        </div>
      </div>

      {/* Summary strip */}
      {policies.length > 0 && (
        <Row gutter={[14, 14]} style={{ marginBottom:24 }}>
          {[
            { label:'Total Policies',    value:policies.length,                               color:'#22c55e', icon:<SafetyOutlined /> },
            { label:'Active',            value:active.length,                                 color:'#10b981', icon:<CheckCircleOutlined /> },
            { label:'Total Coverage',    value:`$${(totalCoverage/1000).toFixed(0)}K`,        color:'#8b5cf6', icon:<DollarOutlined /> },
            { label:'Monthly Premiums',  value:`$${active.reduce((s,p)=>s+(p.premium?.amount||0),0)}`, color:'#f59e0b', icon:<CreditCardOutlined /> },
          ].map(s => (
            <Col xs={12} sm={6} key={s.label}>
              <div style={{ background:'#ffffff', border:'1px solid #e8edf3', borderRadius:12, padding:'16px 18px', display:'flex', gap:12, alignItems:'center' }}>
                <div style={{ width:38, height:38, borderRadius:10, background:`${s.color}18`, border:`1px solid ${s.color}33`, display:'flex', alignItems:'center', justifyContent:'center', color:s.color, fontSize:16, flexShrink:0 }}>
                  {s.icon}
                </div>
                <div>
                  <div style={{ color:'#9ca3af', fontSize:11, textTransform:'uppercase', letterSpacing:'0.06em' }}>{s.label}</div>
                  <div style={{ color:'#111827', fontSize:18, fontWeight:800 }}>{s.value}</div>
                </div>
              </div>
            </Col>
          ))}
        </Row>
      )}

      {policies.length === 0 ? (
        <Card style={S.card}>
          <Empty description={<Text style={{ color:'#9ca3af' }}>No policies yet — get a quote to get started</Text>} image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </Card>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {policies.map(p => {
            const daysLeft  = dayjs(p.endDate).diff(dayjs(), 'day');
            const totalDays = dayjs(p.endDate).diff(dayjs(p.startDate), 'day');
            const pct       = Math.max(0, Math.min(100, Math.round((daysLeft / totalDays) * 100)));
            const expiring  = daysLeft > 0 && daysLeft < 60;
            return (
              <Card key={p._id} style={{ ...S.card, borderColor: expiring ? '#f59e0b33' : '#e8edf3' }} styles={{ body:{ padding:22 } }}>
                <Row align="middle" justify="space-between" gutter={[16,16]} wrap>
                  <Col flex="auto">
                    <div style={{ display:'flex', gap:14, alignItems:'center' }}>
                      <div style={{ width:46, height:46, borderRadius:12, background:'#22c55e18', border:'1px solid #22c55e33', display:'flex', alignItems:'center', justifyContent:'center', color:'#22c55e', fontSize:20, flexShrink:0 }}>
                        <SafetyOutlined />
                      </div>
                      <div>
                        <Text style={{ color:'#111827', fontWeight:700, fontSize:15 }}>{p.product?.name}</Text>
                        <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:4, flexWrap:'wrap' }}>
                          <Text style={{ color:'#9ca3af', fontSize:12, fontFamily:'monospace' }}>{p.policyNumber}</Text>
                          <StatusTag status={p.status} />
                        </div>
                      </div>
                    </div>
                  </Col>

                  <Col>
                    <Row gutter={[24, 8]}>
                      <Col style={{ textAlign:'center' }}>
                        <div style={{ color:'#9ca3af', fontSize:11, textTransform:'uppercase', letterSpacing:'0.05em' }}>Premium</div>
                        <Text style={{ color:'#22c55e', fontWeight:700, fontSize:16 }}>
                          ${p.premium?.amount}<span style={{ color:'#9ca3af', fontSize:11 }}>/{p.premium?.frequency?.slice(0,2)}</span>
                        </Text>
                      </Col>
                      <Col style={{ textAlign:'center' }}>
                        <div style={{ color:'#9ca3af', fontSize:11, textTransform:'uppercase', letterSpacing:'0.05em' }}>Coverage</div>
                        <Text style={{ color:'#111827', fontWeight:600 }}>${p.coverageDetails?.coverageAmount?.toLocaleString()}</Text>
                      </Col>
                      <Col style={{ textAlign:'center' }}>
                        <div style={{ color:'#9ca3af', fontSize:11, textTransform:'uppercase', letterSpacing:'0.05em' }}>Expires</div>
                        <Text style={{ color: expiring ? '#f59e0b' : '#111827', fontWeight:600, fontSize:13 }}>
                          {daysLeft > 0 ? `${daysLeft}d left` : 'Expired'}
                        </Text>
                      </Col>
                    </Row>
                  </Col>

                  <Col>
                    <Space>
                      <Button size="small" icon={<EyeOutlined />} style={{ background:'#f0f4f8', border:'1px solid #e8edf3', color:'#111827' }}
                        onClick={() => openDetail(p)}>Details</Button>
                      {p.status === 'active' && (
                        <Button type="primary" size="small" icon={<CreditCardOutlined />}
                          onClick={() => { setSelected(p); setPay(true); }}>Pay</Button>
                      )}
                    </Space>
                  </Col>
                </Row>

                <div style={{ marginTop:16 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <Text style={{ color:'#9ca3af', fontSize:11 }}>Coverage period</Text>
                    <Text style={{ color: expiring ? '#f59e0b' : '#9ca3af', fontSize:11 }}>
                      <ClockCircleOutlined style={{ marginRight:4 }} />
                      {dayjs(p.startDate).format('MMM D, YYYY')} → {dayjs(p.endDate).format('MMM D, YYYY')}
                    </Text>
                  </div>
                  <Progress percent={pct} size={['100%', 5]} showInfo={false}
                    strokeColor={expiring ? '#f59e0b' : '#10b981'} trailColor="#e8edf3" />
                </div>

                {p.coverageDetails?.selectedOptions?.length > 0 && (
                  <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid #e8edf3', display:'flex', gap:6, flexWrap:'wrap' }}>
                    <Text style={{ color:'#9ca3af', fontSize:12 }}>Add-ons:</Text>
                    {p.coverageDetails.selectedOptions.map(o => (
                      <Tag key={o} style={{ background:'#22c55e18', color:'#6b7280', border:'1px solid #e8edf3', fontSize:11 }}>{o}</Tag>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Policy detail modal */}
      <Modal
        title={<Text style={{ color:'#111827', fontWeight:700 }}>{selected?.product?.name} — Policy Details</Text>}
        open={detailOpen} onCancel={() => setDetail(false)} footer={null} width={700}
        styles={{ content:{ background:'#ffffff' }, header:{ background:'#ffffff', borderBottom:'1px solid #e8edf3' } }}
      >
        {selected && (
          <>
            <Descriptions column={2} size="small" labelStyle={{ color:'#9ca3af', width:130 }} contentStyle={{ color:'#111827' }}>
              <Descriptions.Item label="Policy Number" span={2}>
                <Text style={{ fontFamily:'monospace', color:'#22c55e' }}>{selected.policyNumber}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Status"><StatusTag status={selected.status} /></Descriptions.Item>
              <Descriptions.Item label="Agent">{selected.agent ? `${selected.agent.firstName} ${selected.agent.lastName}` : '—'}</Descriptions.Item>
              <Descriptions.Item label="Start Date">{dayjs(selected.startDate).format('MMMM D, YYYY')}</Descriptions.Item>
              <Descriptions.Item label="End Date">{dayjs(selected.endDate).format('MMMM D, YYYY')}</Descriptions.Item>
              <Descriptions.Item label="Premium">${selected.premium?.amount} ({selected.premium?.frequency})</Descriptions.Item>
              <Descriptions.Item label="Coverage">${selected.coverageDetails?.coverageAmount?.toLocaleString()}</Descriptions.Item>
              {selected.coverageDetails?.deductible && (
                <Descriptions.Item label="Deductible">${selected.coverageDetails.deductible.toLocaleString()}</Descriptions.Item>
              )}
            </Descriptions>

            {selected.paymentHistory?.length > 0 && (
              <>
                <Divider style={{ borderColor:'#e8edf3', margin:'16px 0' }}>Payment History</Divider>
                <Timeline items={selected.paymentHistory.slice(-6).reverse().map(ph => ({
                  color: ph.status === 'completed' ? '#10b981' : '#ef4444',
                  children: (
                    <div>
                      <Text style={{ color:'#111827', fontWeight:600 }}>${ph.amount}</Text>
                      <span style={{ color:'#9ca3af', fontSize:12, marginLeft:8 }}>{ph.method?.replace(/_/g,' ')}</span>
                      <div style={{ color:'#9ca3af', fontSize:11 }}>
                        {dayjs(ph.date).format('MMM D, YYYY')} · {ph.transactionId}
                      </div>
                    </div>
                  ),
                }))} />
              </>
            )}
          </>
        )}
      </Modal>

      {/* Payment modal */}
      <Modal
        title={<Text style={{ color:'#111827', fontWeight:700 }}>Pay Premium</Text>}
        open={payOpen} onCancel={() => setPay(false)} onOk={handlePayment}
        confirmLoading={paying} okText="Confirm Payment"
        styles={{ content:{ background:'#ffffff' }, header:{ background:'#ffffff', borderBottom:'1px solid #e8edf3' }, footer:{ background:'#ffffff', borderTop:'1px solid #e8edf3' } }}
      >
        <div style={{ background:'#f8f9fc', border:'1px solid #e8edf3', borderRadius:10, padding:'14px 18px', marginBottom:20 }}>
          <Text style={{ color:'#9ca3af', fontSize:13 }}>Amount due</Text>
          <div style={{ color:'#22c55e', fontSize:24, fontWeight:800, marginTop:2 }}>${selected?.premium?.amount}</div>
        </div>
        <Alert message="Simulated payment — no real charges will be made." type="info" showIcon
          style={{ marginBottom:16, borderRadius:8 }} />
        <Form form={payForm} layout="vertical">
          <Form.Item name="card" label="Card Number" rules={[{ required:true, len:16, message:'Enter 16 digits' }]}>
            <Input prefix={<CreditCardOutlined style={{ color:'#9ca3af' }} />} maxLength={16} placeholder="1234 5678 9012 3456"
              style={{ background:'#f8f9fc', borderColor:'#e8edf3' }} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="exp" label="Expiry" rules={[{ required:true }]}>
                <Input placeholder="MM/YY" maxLength={5} style={{ background:'#f8f9fc', borderColor:'#e8edf3' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="cvv" label="CVV" rules={[{ required:true }]}>
                <Input.Password maxLength={4} placeholder="•••" style={{ background:'#f8f9fc', borderColor:'#e8edf3' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
