import { useEffect, useState } from 'react';
import {
  Card, Table, Typography, Tag, Space, Button, Select, Modal,
  Descriptions, Timeline, Divider, Form, Input, InputNumber, message,
  Drawer, Alert, Row, Col, Avatar,
} from 'antd';
import { EyeOutlined, SwapOutlined, MessageOutlined, FilterOutlined } from '@ant-design/icons';
import api from '../../api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const S = { card: { background:'#ffffff', border:'1px solid #e8edf3', borderRadius:12 } };

const STATUS_COLORS = {
  submitted:'#22c55e', acknowledged:'#06b6d4', under_review:'#f59e0b',
  documentation_requested:'#8b5cf6', investigation:'#6366f1', assessment:'#eab308',
  approved:'#10b981', partially_approved:'#84cc16', denied:'#ef4444',
  settled:'#10b981', closed:'#9ca3af',
};
const PRIORITY_CONFIG = {
  urgent:{ color:'#ef4444', bg:'#ef444418' },
  high:  { color:'#f97316', bg:'#f9731618' },
  medium:{ color:'#22c55e', bg:'#22c55e18' },
  low:   { color:'#9ca3af', bg:'#4f627218' },
};

const VALID_TRANSITIONS = {
  submitted:               ['acknowledged'],
  acknowledged:            ['under_review'],
  under_review:            ['documentation_requested','investigation','assessment'],
  documentation_requested: ['under_review'],
  investigation:           ['assessment'],
  assessment:              ['approved','partially_approved','denied'],
  approved:                ['settled'],
  partially_approved:      ['settled'],
  denied:                  ['closed'],
  settled:                 ['closed'],
  closed:                  [],
};

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || '#9ca3af';
  return (
    <Tag style={{ background:`${c}18`, color:c, border:`1px solid ${c}33`, fontSize:11, fontWeight:500 }}>
      {status?.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}
    </Tag>
  );
}

function PriorityBadge({ priority }) {
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;
  return <Tag style={{ background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.color}33`, fontSize:11 }}>{priority}</Tag>;
}

export default function AgentClaims() {
  const [claims, setClaims]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [statusFilter, setStatus]   = useState('');
  const [priorityFilter, setPrio]   = useState('');
  const [selected, setSelected]     = useState(null);
  const [drawerOpen, setDrawer]     = useState(false);
  const [statusModal, setStatModal] = useState(false);
  const [noteModal, setNoteModal]   = useState(false);
  const [updating, setUpdating]     = useState(false);
  const [statusForm] = Form.useForm();
  const [noteForm]   = Form.useForm();

  // Watch status field for conditional fields
  const watchedStatus = Form.useWatch('status', statusForm);

  const fetchClaims = () => {
    const p = new URLSearchParams();
    if (statusFilter)   p.set('status', statusFilter);
    if (priorityFilter) p.set('priority', priorityFilter);
    setLoading(true);
    api.get(`/claims?${p}`).then(r => setClaims(r.data.claims)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchClaims(); }, [statusFilter, priorityFilter]);

  const openDetail = async (claim) => {
    const res = await api.get(`/claims/${claim._id}`);
    setSelected(res.data.claim);
    setDrawer(true);
  };

  const handleStatusUpdate = async (values) => {
    setUpdating(true);
    try {
      const res = await api.patch(`/claims/${selected._id}/status`, values);
      setSelected(res.data.claim);
      setClaims(prev => prev.map(c => c._id === selected._id ? res.data.claim : c));
      message.success('Status updated');
      setStatModal(false);
      statusForm.resetFields();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to update');
    } finally { setUpdating(false); }
  };

  const handleAddNote = async (values) => {
    setUpdating(true);
    try {
      await api.post(`/claims/${selected._id}/notes`, values);
      message.success('Note added');
      const res = await api.get(`/claims/${selected._id}`);
      setSelected(res.data.claim);
      setNoteModal(false);
      noteForm.resetFields();
    } catch { message.error('Failed to add note'); }
    finally { setUpdating(false); }
  };

  const handlePriorityUpdate = async (priority) => {
    try {
      await api.patch(`/claims/${selected._id}/priority`, { priority });
      setSelected(p => ({ ...p, priority }));
      setClaims(prev => prev.map(c => c._id === selected._id ? { ...c, priority } : c));
      message.success('Priority updated');
    } catch { message.error('Failed to update priority'); }
  };

  const nextStatuses = selected ? (VALID_TRANSITIONS[selected.status] || []) : [];

  const columns = [
    {
      title: 'Claim', width: 160,
      render: (_, r) => (
        <div>
          <Text style={{ color:'#1d4ed8', fontFamily:'monospace', fontSize:11 }}>{r.claimNumber}</Text>
          <div style={{ color:'#9ca3af', fontSize:11 }}>{dayjs(r.createdAt).format('MMM D, YYYY')}</div>
        </div>
      ),
    },
    {
      title: 'Customer',
      render: (_, r) => (
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Avatar size={30} style={{ background:'#e8edf3', color:'#6b7280', fontSize:11, fontWeight:700, flexShrink:0 }}>
            {r.customer?.firstName?.[0]}{r.customer?.lastName?.[0]}
          </Avatar>
          <div>
            <Text style={{ color:'#111827', fontSize:13 }}>{r.customer?.firstName} {r.customer?.lastName}</Text>
            <div style={{ color:'#9ca3af', fontSize:11 }}>{r.policy?.policyNumber}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Type',
      render: (_, r) => <Text style={{ color:'#6b7280', fontSize:12 }}>{r.type?.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}</Text>,
    },
    {
      title: 'Amount',
      render: (_, r) => <Text style={{ color:'#f59e0b', fontWeight:700 }}>${r.claimedAmount?.toLocaleString()}</Text>,
    },
    { title: 'Status',   render: (_, r) => <StatusBadge status={r.status} /> },
    { title: 'Priority', render: (_, r) => <PriorityBadge priority={r.priority} /> },
    {
      title: 'Actions', width: 100,
      render: (_, r) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(r)}
          style={{ background:'#f0f4f8', border:'1px solid #e8edf3', color:'#111827' }}>
          Manage
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Title level={4} style={{ color:'#111827', marginBottom:20 }}>Claims Management</Title>

      <Card style={S.card}>
        <Space style={{ marginBottom:16 }} wrap>
          <Select placeholder="All statuses" allowClear value={statusFilter||undefined}
            onChange={v=>setStatus(v||'')} style={{ width:190 }}
            options={Object.keys(VALID_TRANSITIONS).map(s=>({ value:s, label:s.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase()) }))}
          />
          <Select placeholder="All priorities" allowClear value={priorityFilter||undefined}
            onChange={v=>setPrio(v||'')} style={{ width:150 }}
            options={['low','medium','high','urgent'].map(p=>({ value:p, label:p.charAt(0).toUpperCase()+p.slice(1) }))}
          />
        </Space>

        <Table
          dataSource={claims} columns={columns} rowKey="_id" loading={loading}
          pagination={{ pageSize:12, showTotal:t=>`${t} claims` }}
          style={{ background:'#ffffff' }}
          rowStyle={(r) => ({ background: ['submitted','documentation_requested'].includes(r.status) ? '#1a200a' : undefined })}
        />
      </Card>

      {/* Detail Drawer */}
      <Drawer
        title={<Text style={{ color:'#111827', fontWeight:700 }}>Claim — {selected?.claimNumber}</Text>}
        open={drawerOpen} onClose={() => setDrawer(false)} width={560}
        styles={{ content:{ background:'#ffffff' }, header:{ background:'#ffffff', borderBottom:'1px solid #e8edf3' }, body:{ background:'#ffffff' } }}
        extra={
          <Space>
            {nextStatuses.length > 0 && (
              <Button type="primary" icon={<SwapOutlined />} size="small"
                onClick={() => { statusForm.resetFields(); statusForm.setFieldValue('status', nextStatuses[0]); setStatModal(true); }}>
                Update Status
              </Button>
            )}
            <Button icon={<MessageOutlined />} size="small"
              style={{ background:'#f0f4f8', border:'1px solid #e8edf3', color:'#111827' }}
              onClick={() => { noteForm.resetFields(); setNoteModal(true); }}>
              Add Note
            </Button>
          </Space>
        }
      >
        {selected && (
          <>
            <Descriptions column={1} size="small" labelStyle={{ color:'#9ca3af', width:140 }} contentStyle={{ color:'#111827' }}>
              <Descriptions.Item label="Customer">{selected.customer?.firstName} {selected.customer?.lastName}</Descriptions.Item>
              <Descriptions.Item label="Email">{selected.customer?.email}</Descriptions.Item>
              <Descriptions.Item label="Policy">{selected.policy?.policyNumber}</Descriptions.Item>
              <Descriptions.Item label="Claim Type">{selected.type?.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}</Descriptions.Item>
              <Descriptions.Item label="Incident Date">{dayjs(selected.incidentDate).format('MMM D, YYYY')}</Descriptions.Item>
              <Descriptions.Item label="Claimed">${selected.claimedAmount?.toLocaleString()}</Descriptions.Item>
              {selected.approvedAmount != null && <Descriptions.Item label="Approved">${selected.approvedAmount?.toLocaleString()}</Descriptions.Item>}
              {selected.settlementAmount != null && <Descriptions.Item label="Settlement">${selected.settlementAmount?.toLocaleString()}</Descriptions.Item>}
              <Descriptions.Item label="Status"><StatusBadge status={selected.status} /></Descriptions.Item>
              <Descriptions.Item label="Priority">
                <Select value={selected.priority} onChange={handlePriorityUpdate} size="small" style={{ width:130 }}>
                  {['low','medium','high','urgent'].map(p=><Option key={p} value={p}>{p}</Option>)}
                </Select>
              </Descriptions.Item>
            </Descriptions>

            <Divider style={{ borderColor:'#e8edf3', margin:'16px 0' }}>Description</Divider>
            <div style={{ background:'#f8f9fc', borderRadius:8, padding:14, border:'1px solid #e8edf3' }}>
              <Text style={{ color:'#6b7280', fontSize:13, lineHeight:1.6 }}>{selected.description}</Text>
            </div>

            {selected.resolution && (
              <Alert message={selected.resolution} type="success" style={{ marginTop:12, borderRadius:8 }} />
            )}

            <Divider style={{ borderColor:'#e8edf3', margin:'16px 0' }}>Status Timeline</Divider>
            <Timeline items={[...(selected.statusHistory||[])].reverse().map(h => ({
              color: STATUS_COLORS[h.status]||'#9ca3af',
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

            {selected.notes?.length > 0 && (
              <>
                <Divider style={{ borderColor:'#e8edf3', margin:'16px 0' }}>Notes</Divider>
                {selected.notes.map((n,i) => (
                  <div key={i} style={{
                    background: n.isInternal ? '#2a1060' : '#f8f9fc',
                    border:`1px solid ${n.isInternal ? '#6d28d933' : '#e8edf3'}`,
                    borderRadius:8, padding:'10px 14px', marginBottom:8,
                  }}>
                    {n.isInternal && <Tag style={{ fontSize:10, marginBottom:6, background:'#6d28d918', color:'#8b5cf6', border:'1px solid #8b5cf633' }}>Internal Note</Tag>}
                    <Text style={{ color:'#111827', fontSize:13, display:'block' }}>{n.content}</Text>
                    <Text style={{ color:'#c7d3e3', fontSize:11, marginTop:4 }}>
                      {n.author?.firstName} {n.author?.lastName} · {dayjs(n.createdAt).format('MMM D, YYYY')}
                    </Text>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </Drawer>

      {/* Status update modal */}
      <Modal
        title={<Text style={{ color:'#111827' }}>Update Claim Status</Text>}
        open={statusModal} onCancel={() => setStatModal(false)}
        onOk={() => statusForm.submit()} confirmLoading={updating} okText="Update Status"
        styles={{ content:{ background:'#ffffff' }, header:{ background:'#ffffff', borderBottom:'1px solid #e8edf3' }, footer:{ background:'#ffffff', borderTop:'1px solid #e8edf3' } }}
      >
        <Form form={statusForm} onFinish={handleStatusUpdate} layout="vertical" style={{ marginTop:16 }}>
          <Form.Item name="status" label="New Status" rules={[{ required:true }]}>
            <Select>
              {nextStatuses.map(s => (
                <Option key={s} value={s}>{s.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="reason" label="Reason / Comments">
            <TextArea rows={3} placeholder="Explain this status change..." />
          </Form.Item>

          {/* Conditional fields based on watched status */}
          {['approved','partially_approved'].includes(watchedStatus) && (
            <Form.Item name="approvedAmount" label="Approved Amount ($)" rules={[{ required:true, message:'Required for approval' }]}>
              <InputNumber style={{ width:'100%' }} prefix="$" min={0} placeholder="0.00" />
            </Form.Item>
          )}
          {watchedStatus === 'settled' && (
            <Form.Item name="settlementAmount" label="Settlement Amount ($)" rules={[{ required:true, message:'Required for settlement' }]}>
              <InputNumber style={{ width:'100%' }} prefix="$" min={0} placeholder="0.00" />
            </Form.Item>
          )}
          {watchedStatus === 'denied' && (
            <Form.Item name="resolution" label="Denial Reason" rules={[{ required:true }]}>
              <TextArea rows={2} placeholder="Explain why this claim is denied..." />
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* Note modal */}
      <Modal
        title={<Text style={{ color:'#111827' }}>Add Note to Claim</Text>}
        open={noteModal} onCancel={() => setNoteModal(false)}
        onOk={() => noteForm.submit()} confirmLoading={updating} okText="Add Note"
        styles={{ content:{ background:'#ffffff' }, header:{ background:'#ffffff', borderBottom:'1px solid #e8edf3' }, footer:{ background:'#ffffff', borderTop:'1px solid #e8edf3' } }}
      >
        <Form form={noteForm} onFinish={handleAddNote} layout="vertical" style={{ marginTop:16 }}>
          <Form.Item name="content" label="Note Content" rules={[{ required:true, min:5 }]}>
            <TextArea rows={4} placeholder="Add a note..." />
          </Form.Item>
          <Form.Item name="isInternal" label="Visibility" initialValue={false}>
            <Select>
              <Option value={false}>Visible to customer</Option>
              <Option value={true}>Internal only (agents &amp; admin)</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
