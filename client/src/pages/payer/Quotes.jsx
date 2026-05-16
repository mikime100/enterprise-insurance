import { useEffect, useState } from 'react';
import { Row, Col, Table, Tag, Button, Space, Card, Typography, Modal, Form, Input, Select, InputNumber, Spin, Descriptions, Divider, Alert } from 'antd';
import { EyeOutlined, CheckOutlined, CloseOutlined, DownloadOutlined } from '@ant-design/icons';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text } = Typography;
const { TextArea } = Input;

const STATUS_COLOR = { draft: 'default', submitted: 'blue', under_review: 'processing', approved: 'success', rejected: 'red', expired: 'warning', accepted: 'cyan' };

const STATUS_BOXES = [
  { key: undefined,        label: 'Total',       bg: '#f3f0ff', text: '#7c3aed' },
  { key: 'submitted',      label: 'Pending',     bg: '#fefce8', text: '#ca8a04' },
  { key: 'under_review',   label: 'In Progress', bg: '#eff6ff', text: '#1d4ed8' },
  { key: 'approved',       label: 'Approved',    bg: '#f0fdf4', text: '#16a34a' },
  { key: 'rejected',       label: 'Rejected',    bg: '#fef2f2', text: '#dc2626' },
];

export default function PayerQuotes() {
  const [quotes, setQuotes]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail]   = useState(null);
  const [uwModal, setUwModal] = useState({ open: false, quote: null });
  const [uwForm]              = Form.useForm();
  const [filterStatus, setFilterStatus] = useState(undefined);
  const { user }              = useAuth();

  const load = () => {
    setLoading(true);
    api.get('/quotes').then(r => setQuotes(Array.isArray(r.data.quotes) ? r.data.quotes : [])).catch(err => console.error('Quotes load failed:', err)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openDetail = (q) => api.get(`/quotes/${q._id}`).then(r => setDetail(r.data.quote));

  const takeOwnership = async (q) => {
    await api.patch(`/quotes/${q._id}/underwrite`, { note: 'Underwriter assigned and review started.' });
    load(); openDetail(q);
  };

  const handleApprove = async (q, approved) => {
    const vals = await uwForm.validateFields();
    await api.patch(`/quotes/${q._id}/status`, { status: approved ? 'approved' : 'rejected', finalPremium: vals.finalPremium, note: vals.note });
    setUwModal({ open: false, quote: null }); setDetail(null); load();
  };

  const counts = {
    total:       quotes.length,
    submitted:   quotes.filter(q => q.status === 'submitted').length,
    under_review:quotes.filter(q => q.status === 'under_review').length,
    approved:    quotes.filter(q => q.status === 'approved').length,
    rejected:    quotes.filter(q => q.status === 'rejected').length,
  };

  const filtered = filterStatus ? quotes.filter(q => q.status === filterStatus) : quotes;

  const columns = [
    { title: 'Quote #', dataIndex: 'quoteNumber', key: 'num', render: v => <Text code style={{ fontSize: 12 }}>{v}</Text> },
    { title: 'Client', key: 'client', render: (_, r) => r.institution?.name || `${r.insuredPerson?.firstName ?? ''} ${r.insuredPerson?.lastName ?? ''}` },
    { title: 'Product', key: 'product', render: (_, r) => r.product?.name },
    { title: 'Members', dataIndex: 'memberCount', key: 'members' },
    { title: 'Underwriter', key: 'uw', render: (_, r) => r.assignedUnderwriter ? `${r.assignedUnderwriter.firstName} ${r.assignedUnderwriter.lastName}` : <Text type="secondary">Unassigned</Text> },
    { title: 'Status', dataIndex: 'status', key: 'status', render: v => <Tag color={STATUS_COLOR[v]}>{v?.replace(/_/g, ' ')}</Tag> },
    { title: 'Valid Until', dataIndex: 'validUntil', key: 'valid', render: v => v ? new Date(v).toLocaleDateString() : '—' },
    { title: 'Actions', key: 'actions', render: (_, r) => (
      <Space>
        <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(r)}>View</Button>
        {['underwriter','payer_admin','superadmin'].includes(user?.role) && r.status === 'submitted' && (
          <Button size="small" style={{ background: '#1e3a5f', borderColor: '#1e3a5f', color: '#fff' }} onClick={() => takeOwnership(r)}>Take</Button>
        )}
        {['underwriter','payer_admin','superadmin'].includes(user?.role) && r.status === 'under_review' && (
          <Button size="small" style={{ background: '#22c55e', borderColor: '#22c55e', color: '#fff' }}
            onClick={() => { uwForm.resetFields(); setUwModal({ open: true, quote: r }); }}>Decide</Button>
        )}
      </Space>
    )},
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#111827' }}>Underwriting Applications</Title>
          <Text style={{ color: '#6b7280' }}>Review and process incoming insurance applications.</Text>
        </div>
        <Button icon={<DownloadOutlined />} style={{ borderRadius: 8, height: 38 }}>Export</Button>
      </div>

      <Row gutter={[16, 16]}>
        {/* Status boxes + table */}
        <Col xs={24} xl={17}>
          {/* Status summary boxes */}
          <Row gutter={10} style={{ marginBottom: 16 }}>
            {STATUS_BOXES.map(s => (
              <Col key={s.label} flex={1}>
                <div
                  onClick={() => setFilterStatus(s.key)}
                  style={{
                    background: s.bg, borderRadius: 10, padding: '14px 12px', textAlign: 'center',
                    cursor: 'pointer', border: filterStatus === s.key ? `2px solid ${s.text}` : '2px solid transparent',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontSize: 22, fontWeight: 700, color: s.text }}>
                    {s.key === undefined ? counts.total : counts[s.key] ?? 0}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{s.label}</div>
                </div>
              </Col>
            ))}
          </Row>

          {/* Table */}
          <Card style={{ borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            {loading ? <Spin /> : <Table dataSource={filtered} columns={columns} rowKey="_id" pagination={{ pageSize: 10 }} size="small" />}
          </Card>
        </Col>

        {/* Queue performance panel */}
        <Col xs={24} xl={7}>
          <Card title={<span style={{ fontWeight: 700 }}>Queue Performance</span>}
            style={{ borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 13 }}>Avg. Turnaround Time</Text>
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>2.4 Days</div>
              </div>
              {[
                { label: 'SLA Compliance', value: 94, color: '#22c55e' },
                { label: 'Motor Products', value: 45, color: '#3b82f6' },
                { label: 'Health Products', value: 35, color: '#8b5cf6' },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <Text style={{ fontSize: 13, color: '#6b7280' }}>{item.label}</Text>
                    <Text style={{ fontSize: 13, fontWeight: 600, color: item.color }}>{item.value}%</Text>
                  </div>
                  <div style={{ height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${item.value}%`, background: item.color, borderRadius: 3 }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Detail Modal */}
      <Modal title="Quote Details" open={!!detail} onCancel={() => setDetail(null)} footer={null} width={720}>
        {detail && (
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Quote #">{detail.quoteNumber}</Descriptions.Item>
              <Descriptions.Item label="Status"><Tag color={STATUS_COLOR[detail.status]}>{detail.status}</Tag></Descriptions.Item>
              <Descriptions.Item label="Client">{detail.institution?.name || `${detail.insuredPerson?.firstName} ${detail.insuredPerson?.lastName}`}</Descriptions.Item>
              <Descriptions.Item label="Product">{detail.product?.name}</Descriptions.Item>
              <Descriptions.Item label="Members">{detail.memberCount}</Descriptions.Item>
              <Descriptions.Item label="Final Premium">{detail.finalPremium ? `${detail.finalPremium.toLocaleString()} ETB` : '—'}</Descriptions.Item>
              <Descriptions.Item label="Risk Score">{detail.riskFactors?.riskScore || '—'} / 10</Descriptions.Item>
              <Descriptions.Item label="Underwriter">{detail.assignedUnderwriter ? `${detail.assignedUnderwriter.firstName} ${detail.assignedUnderwriter.lastName}` : 'Unassigned'}</Descriptions.Item>
            </Descriptions>
            {detail.scenarios?.length > 0 && (<><Divider>Scenarios</Divider>{detail.scenarios.map((s, i) => (<Card key={i} size="small" title={s.name} extra={<Text strong>{s.annualPremium?.toLocaleString()} ETB</Text>}><Text style={{ fontSize: 12 }}>{s.notes}</Text></Card>))}</>)}
            {detail.notes?.length > 0 && (<><Divider>Notes</Divider>{detail.notes.map((n, i) => (<Alert key={i} message={n.content} description={`${n.author?.firstName} ${n.author?.lastName} · ${new Date(n.timestamp).toLocaleString()}`} type="info" showIcon={false} style={{ padding: '8px 12px', marginBottom: 6 }} />))}</>)}
          </Space>
        )}
      </Modal>

      {/* Decision Modal */}
      <Modal title={`Underwriting Decision — ${uwModal.quote?.quoteNumber}`}
        open={uwModal.open} onCancel={() => setUwModal({ open: false, quote: null })}
        footer={[
          <Button key="r" danger onClick={() => handleApprove(uwModal.quote, false)} icon={<CloseOutlined />}>Reject</Button>,
          <Button key="a" style={{ background: '#1e3a5f', borderColor: '#1e3a5f', color: '#fff' }} onClick={() => handleApprove(uwModal.quote, true)} icon={<CheckOutlined />}>Approve</Button>,
        ]}>
        <Form form={uwForm} layout="vertical">
          <Form.Item name="finalPremium" label="Final Annual Premium (ETB)" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="note" label="Underwriting Note">
            <TextArea rows={3} placeholder="Reasoning, conditions, or notes..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
