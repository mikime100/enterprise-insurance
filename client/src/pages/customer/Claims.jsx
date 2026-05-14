import { useEffect, useState } from 'react';
import {
  Card, Tag, Typography, Space, Spin, Empty, Button, Modal,
  Form, Input, InputNumber, Select, DatePicker, Descriptions,
  Timeline, Divider, Alert, message, Row, Col,
} from 'antd';
import {
  AlertOutlined, PlusOutlined, EyeOutlined, ClockCircleOutlined,
  CheckCircleOutlined, FileTextOutlined,
} from '@ant-design/icons';
import api from '../../api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const S = { card:{ background:'#ffffff', border:'1px solid #e8edf3', borderRadius:12 } };

const STATUS_COLORS = {
  submitted:'#22c55e', acknowledged:'#06b6d4', under_review:'#f59e0b',
  documentation_requested:'#8b5cf6', investigation:'#6366f1', assessment:'#eab308',
  approved:'#10b981', partially_approved:'#84cc16', denied:'#ef4444',
  settled:'#10b981', closed:'#9ca3af',
};
const PRIORITY_COLORS = { low:'#9ca3af', medium:'#22c55e', high:'#f97316', urgent:'#ef4444' };

const CLAIM_TYPES = {
  auto:       ['accident','theft','property_damage','liability','other'],
  home:       ['property_damage','natural_disaster','theft','liability','other'],
  life:       ['death','other'],
  health:     ['medical','disability','other'],
  travel:     ['travel','accident','medical','other'],
  pet:        ['medical','accident','other'],
  business:   ['liability','property_damage','theft','other'],
  renters:    ['theft','property_damage','other'],
  disability: ['disability','medical','other'],
};

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || '#9ca3af';
  return (
    <Tag style={{ background:`${c}18`, color:c, border:`1px solid ${c}33`, fontSize:11, fontWeight:500 }}>
      {status?.replace(/_/g,' ').replace(/\b\w/g, l=>l.toUpperCase())}
    </Tag>
  );
}

function PriorityBadge({ priority }) {
  const c = PRIORITY_COLORS[priority] || '#9ca3af';
  return <Tag style={{ background:`${c}18`, color:c, border:`1px solid ${c}33`, fontSize:11 }}>{priority}</Tag>;
}

export default function CustomerClaims() {
  const [claims, setClaims]           = useState([]);
  const [policies, setPolicies]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [newModal, setNewModal]       = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [selected, setSelected]       = useState(null);
  const [submitting, setSubmitting]   = useState(false);
  const [form]                        = Form.useForm();
  const [availTypes, setAvailTypes]   = useState([]);

  useEffect(() => {
    Promise.all([api.get('/claims'), api.get('/policies')])
      .then(([cr, pr]) => {
        setClaims(cr.data.claims);
        setPolicies(pr.data.policies.filter(p => p.status === 'active'));
      }).finally(() => setLoading(false));
  }, []);

  const onPolicyChange = (id) => {
    const policy = policies.find(p => p._id === id);
    setAvailTypes(CLAIM_TYPES[policy?.product?.type] || ['accident','other']);
    form.setFieldValue('type', undefined);
  };

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      const res = await api.post('/claims', { ...values, incidentDate: values.incidentDate.toISOString() });
      setClaims(prev => [res.data.claim, ...prev]);
      message.success('Claim submitted successfully!');
      setNewModal(false);
      form.resetFields();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to submit claim');
    } finally { setSubmitting(false); }
  };

  const openDetail = async (c) => {
    const res = await api.get(`/claims/${c._id}`);
    setSelected(res.data.claim);
    setDetailModal(true);
  };

  if (loading) return <div style={{ display:'flex', justifyContent:'center', paddingTop:80 }}><Spin size="large" /></div>;

  const open   = claims.filter(c => !['settled','closed','denied'].includes(c.status));
  const closed = claims.filter(c =>  ['settled','closed','denied'].includes(c.status));

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <Title level={4} style={{ color:'#111827', margin:0 }}>My Claims</Title>
          <Text style={{ color:'#9ca3af' }}>{claims.length} total · {open.length} open · {closed.length} resolved</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} size="large"
          onClick={() => { form.resetFields(); setNewModal(true); }}
          disabled={policies.length === 0}
          style={{ height:42, fontWeight:600 }}>
          File a Claim
        </Button>
      </div>

      {policies.length === 0 && (
        <Alert message="You need an active policy to file a claim." type="warning" showIcon
          style={{ marginBottom:20, borderRadius:10, background:'#2a1a00', border:'1px solid #f59e0b33' }} />
      )}

      {claims.length === 0 ? (
        <Card style={S.card} styles={{ body:{ padding:48, textAlign:'center' } }}>
          <FileTextOutlined style={{ fontSize:48, color:'#e8edf3', display:'block', marginBottom:16 }} />
          <Text style={{ color:'#9ca3af', display:'block', fontSize:15, marginBottom:20 }}>No claims filed yet</Text>
          <Button type="primary" icon={<PlusOutlined />} disabled={policies.length===0}
            onClick={() => { form.resetFields(); setNewModal(true); }}>
            File Your First Claim
          </Button>
        </Card>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {claims.map(c => {
            const sc = STATUS_COLORS[c.status] || '#9ca3af';
            const pc = PRIORITY_COLORS[c.priority] || '#9ca3af';
            return (
              <Card key={c._id} style={{ ...S.card, borderColor: ['submitted','under_review','documentation_requested'].includes(c.status) ? `${sc}33` : '#e8edf3' }}
                styles={{ body:{ padding:18 } }}>
                <Row align="middle" justify="space-between" gutter={[12,12]} wrap>
                  <Col flex="auto">
                    <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                      <div style={{ width:42, height:42, borderRadius:10, flexShrink:0, background:`${sc}18`, border:`1px solid ${sc}33`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <AlertOutlined style={{ color:sc, fontSize:18 }} />
                      </div>
                      <div>
                        <Text style={{ color:'#111827', fontWeight:700, fontSize:14 }}>
                          {c.type?.replace(/_/g,' ').replace(/\b\w/g, l=>l.toUpperCase())}
                        </Text>
                        <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:4, flexWrap:'wrap' }}>
                          <Text style={{ color:'#9ca3af', fontSize:11, fontFamily:'monospace' }}>{c.claimNumber}</Text>
                          <Text style={{ color:'#9ca3af', fontSize:11 }}>·</Text>
                          <Text style={{ color:'#9ca3af', fontSize:11 }}>
                            <ClockCircleOutlined style={{ marginRight:3 }} />
                            Incident: {dayjs(c.incidentDate).format('MMM D, YYYY')}
                          </Text>
                        </div>
                      </div>
                    </div>
                  </Col>

                  <Col>
                    <Space size={16} wrap>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ color:'#9ca3af', fontSize:11 }}>Claimed</div>
                        <Text style={{ color:'#f59e0b', fontWeight:700, fontSize:15 }}>${c.claimedAmount?.toLocaleString()}</Text>
                      </div>
                      {c.approvedAmount != null && (
                        <div style={{ textAlign:'right' }}>
                          <div style={{ color:'#9ca3af', fontSize:11 }}>Approved</div>
                          <Text style={{ color:'#10b981', fontWeight:700, fontSize:15 }}>${c.approvedAmount?.toLocaleString()}</Text>
                        </div>
                      )}
                      <Space direction="vertical" size={4} style={{ alignItems:'flex-end' }}>
                        <Space size={4}>
                          <StatusBadge status={c.status} />
                          <PriorityBadge priority={c.priority} />
                        </Space>
                        <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(c)}
                          style={{ background:'#f0f4f8', border:'1px solid #e8edf3', color:'#111827' }}>
                          View Details
                        </Button>
                      </Space>
                    </Space>
                  </Col>
                </Row>
              </Card>
            );
          })}
        </div>
      )}

      {/* File claim modal */}
      <Modal
        title={<Text style={{ color:'#111827', fontWeight:700 }}>File a New Claim</Text>}
        open={newModal} onCancel={() => setNewModal(false)}
        onOk={() => form.submit()} confirmLoading={submitting} okText="Submit Claim" width={560}
        styles={{ content:{ background:'#ffffff' }, header:{ background:'#ffffff', borderBottom:'1px solid #e8edf3' }, footer:{ background:'#ffffff', borderTop:'1px solid #e8edf3' } }}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical" style={{ marginTop:16 }}>
          <Form.Item name="policyId" label="Policy" rules={[{ required:true, message:'Select a policy' }]}>
            <Select placeholder="Select active policy" onChange={onPolicyChange}>
              {policies.map(p => (
                <Option key={p._id} value={p._id}>{p.policyNumber} — {p.product?.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="type" label="Claim Type" rules={[{ required:true, message:'Select claim type' }]}>
            <Select placeholder="Select claim type">
              {availTypes.map(t => (
                <Option key={t} value={t}>{t.replace(/_/g,' ').replace(/\b\w/g, l=>l.toUpperCase())}</Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={12}>
            <Col span={14}>
              <Form.Item name="incidentDate" label="Incident Date" rules={[{ required:true }]}>
                <DatePicker style={{ width:'100%' }} disabledDate={d => d && d > dayjs()} />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="priority" label="Priority" initialValue="medium">
                <Select>
                  {['low','medium','high','urgent'].map(p => (
                    <Option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="claimedAmount" label="Claimed Amount ($)" rules={[{ required:true },{ type:'number', min:1 }]}>
            <InputNumber style={{ width:'100%' }} prefix="$" min={1} placeholder="0.00" />
          </Form.Item>

          <Form.Item name="description" label="Incident Description" rules={[{ required:true },{ min:20, message:'Please provide at least 20 characters' }]}>
            <TextArea rows={4} placeholder="Describe what happened, when, location, and any relevant details..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Claim detail modal */}
      <Modal
        title={<Text style={{ color:'#111827', fontWeight:700 }}>Claim — {selected?.claimNumber}</Text>}
        open={detailModal} onCancel={() => setDetailModal(false)} footer={null} width={680}
        styles={{ content:{ background:'#ffffff' }, header:{ background:'#ffffff', borderBottom:'1px solid #e8edf3' } }}
      >
        {selected && (
          <>
            <Descriptions column={2} size="small" labelStyle={{ color:'#9ca3af', width:130 }} contentStyle={{ color:'#111827' }}>
              <Descriptions.Item label="Status"><StatusBadge status={selected.status} /></Descriptions.Item>
              <Descriptions.Item label="Priority"><PriorityBadge priority={selected.priority} /></Descriptions.Item>
              <Descriptions.Item label="Type">{selected.type?.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}</Descriptions.Item>
              <Descriptions.Item label="Incident Date">{dayjs(selected.incidentDate).format('MMM D, YYYY')}</Descriptions.Item>
              <Descriptions.Item label="Claimed Amount">${selected.claimedAmount?.toLocaleString()}</Descriptions.Item>
              {selected.approvedAmount != null && <Descriptions.Item label="Approved">${selected.approvedAmount?.toLocaleString()}</Descriptions.Item>}
              {selected.settlementAmount != null && <Descriptions.Item label="Settlement">${selected.settlementAmount?.toLocaleString()}</Descriptions.Item>}
            </Descriptions>

            <Divider style={{ borderColor:'#e8edf3', margin:'16px 0' }}>Description</Divider>
            <div style={{ background:'#f8f9fc', borderRadius:8, padding:14, border:'1px solid #e8edf3', marginBottom:4 }}>
              <Text style={{ color:'#6b7280', fontSize:13, lineHeight:1.6 }}>{selected.description}</Text>
            </div>

            {selected.resolution && (
              <Alert message={selected.resolution} type="success" showIcon style={{ marginTop:12, borderRadius:8 }} />
            )}

            <Divider style={{ borderColor:'#e8edf3', margin:'16px 0' }}>Status Timeline</Divider>
            <Timeline items={[...(selected.statusHistory||[])].reverse().map(h => ({
              color: STATUS_COLORS[h.status] || '#9ca3af',
              children: (
                <div>
                  <Text style={{ color:'#111827', fontWeight:600, fontSize:13 }}>
                    {h.status?.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}
                  </Text>
                  {h.reason && <div style={{ color:'#9ca3af', fontSize:12, marginTop:2 }}>{h.reason}</div>}
                  <div style={{ color:'#c7d3e3', fontSize:11, marginTop:2 }}>{dayjs(h.timestamp).format('MMM D, YYYY h:mm A')}</div>
                </div>
              ),
            }))} />

            {selected.notes?.filter(n => !n.isInternal).length > 0 && (
              <>
                <Divider style={{ borderColor:'#e8edf3', margin:'16px 0' }}>Agent Notes</Divider>
                {selected.notes.filter(n => !n.isInternal).map((note, i) => (
                  <div key={i} style={{ background:'#f8f9fc', borderRadius:8, padding:'10px 14px', marginBottom:8, border:'1px solid #e8edf3' }}>
                    <Text style={{ color:'#111827', fontSize:13 }}>{note.content}</Text>
                    <div style={{ color:'#9ca3af', fontSize:11, marginTop:4 }}>
                      {note.author?.firstName} {note.author?.lastName} · {dayjs(note.createdAt).format('MMM D, YYYY')}
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
