import { useEffect, useState } from 'react';
import { Row, Col, Table, Tag, Button, Space, Card, Typography, Modal, Form, Select, InputNumber, Input, Descriptions, Divider, Spin, Timeline, Alert, Badge } from 'antd';
import { EyeOutlined, ArrowRightOutlined, DollarOutlined, DownloadOutlined, WarningOutlined } from '@ant-design/icons';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text } = Typography;
const { TextArea } = Input;

const VALID_NEXT = {
  submitted:               ['acknowledged'],
  acknowledged:            ['under_review'],
  under_review:            ['documentation_requested', 'investigation', 'assessment'],
  documentation_requested: ['under_review'],
  investigation:           ['assessment'],
  assessment:              ['pending_finance_approval', 'denied'],
};

const STATUS_COLOR = {
  submitted: 'blue', acknowledged: 'cyan', under_review: 'processing',
  documentation_requested: 'orange', investigation: 'gold', assessment: 'purple',
  pending_finance_approval: 'volcano', approved: 'green', partially_approved: 'lime',
  denied: 'red', payment_initiated: 'geekblue', settled: 'success', closed: 'default',
};
const PRIORITY_COLOR = { low: 'default', medium: 'blue', high: 'orange', urgent: 'red' };

const STATUS_TABS = [
  { key: undefined,      label: 'All',           bg: '#eff6ff', text: '#1d4ed8', border: '#1d4ed8' },
  { key: 'submitted',    label: 'Submitted',     bg: '#fefce8', text: '#ca8a04', border: '#ca8a04' },
  { key: 'investigation',label: 'Investigation', bg: '#eff6ff', text: '#2563eb', border: '#2563eb' },
  { key: 'approved',     label: 'Approved',      bg: '#f0fdf4', text: '#16a34a', border: '#16a34a' },
  { key: 'denied',       label: 'Rejected',      bg: '#fef2f2', text: '#dc2626', border: '#dc2626' },
];

export default function PayerClaims() {
  const [claims, setClaims]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [detail, setDetail]           = useState(null);
  const [statusModal, setStatusModal] = useState({ open: false, claim: null });
  const [financeModal, setFinanceModal] = useState({ open: false, claim: null });
  const [statusForm]   = Form.useForm();
  const [financeForm]  = Form.useForm();
  const [filterStatus, setFilterStatus] = useState(undefined);
  const { user } = useAuth();

  const isClaimsRole = ['claims_officer','payer_admin','superadmin'].includes(user?.role);
  const isFinance    = ['finance_officer','payer_admin','superadmin'].includes(user?.role);

  const [loadError, setLoadError] = useState('');

  const load = () => {
    setLoading(true);
    setLoadError('');
    api.get('/claims')
      .then(r => setClaims(Array.isArray(r.data?.claims) ? r.data.claims : []))
      .catch(err => setLoadError(err.response?.data?.message || err.message || 'Failed to load claims'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openDetail = (c) => api.get(`/claims/${c._id}`).then(r => setDetail(r.data.claim));

  const handleStatus = async () => {
    const vals = await statusForm.validateFields();
    await api.patch(`/claims/${statusModal.claim._id}/status`, vals);
    setStatusModal({ open: false, claim: null }); setDetail(null); load();
  };

  const counts = {
    total:       claims.length,
    submitted:   claims.filter(c => c.status === 'submitted').length,
    investigation:claims.filter(c => c.status === 'investigation').length,
    approved:    claims.filter(c => ['approved','partially_approved'].includes(c.status)).length,
    denied:      claims.filter(c => c.status === 'denied').length,
  };
  const urgent = claims.filter(c => c.priority === 'urgent' && !['settled','closed','denied'].includes(c.status));
  const pendingFinance = claims.filter(c => c.status === 'pending_finance_approval');

  const filtered = filterStatus ? claims.filter(c => c.status === filterStatus) : claims;

  const columns = [
    { title: 'Claim #', dataIndex: 'claimNumber', key: 'num', render: v => <Text code style={{ fontSize: 12 }}>{v}</Text> },
    { title: 'Policyholder', key: 'insured', render: (_, r) => `${r.insuredPerson?.firstName || ''} ${r.insuredPerson?.lastName || ''}` },
    { title: 'Type', key: 'type', dataIndex: 'claimType', render: v => <Tag>{v?.replace(/_/g,' ')}</Tag> },
    { title: 'Amount (ETB)', dataIndex: 'claimedAmount', key: 'amt', render: v => v?.toLocaleString() },
    { title: 'Status', dataIndex: 'status', key: 'status', render: v => <Tag color={STATUS_COLOR[v]}>{v?.replace(/_/g,' ')}</Tag> },
    { title: 'Officer', key: 'officer', render: (_, r) => r.assignedOfficer?.firstName ? `${r.assignedOfficer.firstName} ${r.assignedOfficer.lastName?.[0] ?? ''}.` : <Text type="secondary">—</Text> },
    { title: 'Actions', key: 'actions', render: (_, r) => (
      <Space>
        <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(r)} />
        {isClaimsRole && !['closed','settled','denied'].includes(r.status) && r.status !== 'pending_finance_approval' && (
          <Button size="small" style={{ background: '#1e3a5f', borderColor: '#1e3a5f', color: '#fff' }} icon={<ArrowRightOutlined />}
            onClick={() => { statusForm.resetFields(); setStatusModal({ open: true, claim: r }); }} />
        )}
        {isFinance && r.status === 'pending_finance_approval' && (
          <Button size="small" style={{ background: '#22c55e', borderColor: '#22c55e', color: '#fff' }} icon={<DollarOutlined />}
            onClick={() => { financeForm.resetFields(); setFinanceModal({ open: true, claim: r }); }}>Approve</Button>
        )}
      </Space>
    )},
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#111827' }}>Claims Management</Title>
          <Text style={{ color: '#6b7280' }}>Process and track all insurance claims.</Text>
        </div>
        <Button icon={<DownloadOutlined />} style={{ borderRadius: 8, height: 38 }}>Export</Button>
      </div>

      {loadError && <Alert message={loadError} type="error" showIcon closable onClose={() => setLoadError('')} />}

      <Row gutter={[16, 16]}>
        {/* Left: status tabs + table */}
        <Col xs={24} xl={17}>
          {/* Status tabs */}
          <Row gutter={10} style={{ marginBottom: 16 }}>
            {STATUS_TABS.map(s => (
              <Col key={s.label} flex={1}>
                <div
                  onClick={() => setFilterStatus(s.key)}
                  style={{
                    background: filterStatus === s.key ? s.bg : '#ffffff',
                    border: filterStatus === s.key ? `2px solid ${s.border}` : '2px solid #e5e7eb',
                    borderRadius: 10, padding: '14px 10px', textAlign: 'center',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontSize: 22, fontWeight: 700, color: filterStatus === s.key ? s.text : '#111827' }}>
                    {s.key === undefined ? counts.total : counts[s.key] ?? 0}
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{s.label}</div>
                </div>
              </Col>
            ))}
          </Row>

          <Card style={{ borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            {loading ? <Spin /> : <Table dataSource={filtered} columns={columns} rowKey="_id" pagination={{ pageSize: 10 }} size="small" />}
          </Card>
        </Col>

        {/* Right: SLA panel */}
        <Col xs={24} xl={7}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Card title={<span style={{ fontWeight: 700 }}>SLA Dashboard</span>}
              style={{ borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              {[
                { label: 'Resolved within 24h', value: 78, color: '#22c55e' },
                { label: 'Resolved within 3d',  value: 91, color: '#3b82f6' },
                { label: 'Resolved within 7d',  value: 96, color: '#1e3a5f' },
              ].map(item => (
                <div key={item.label} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <Text style={{ fontSize: 13, color: '#6b7280' }}>{item.label}</Text>
                    <Text style={{ fontSize: 13, fontWeight: 600, color: item.color }}>{item.value}%</Text>
                  </div>
                  <div style={{ height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${item.value}%`, background: item.color, borderRadius: 3 }} />
                  </div>
                </div>
              ))}
            </Card>

            {urgent.length > 0 && (
              <div style={{ background: '#fef2f2', border: '2px solid #fca5a5', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <WarningOutlined style={{ color: '#dc2626', fontSize: 16 }} />
                  <Text style={{ fontWeight: 700, color: '#dc2626' }}>{urgent.length} Claims Overdue</Text>
                </div>
                <Text style={{ fontSize: 12, color: '#6b7280' }}>SLA breached — immediate action needed</Text>
              </div>
            )}

            {pendingFinance.length > 0 && isFinance && (
              <div style={{ background: '#fffbeb', border: '2px solid #fcd34d', borderRadius: 10, padding: '14px 16px' }}>
                <Text style={{ fontWeight: 700, color: '#d97706' }}>{pendingFinance.length} Awaiting Finance Approval</Text>
                <div style={{ marginTop: 4 }}>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>Pending payment authorisation</Text>
                </div>
              </div>
            )}
          </div>
        </Col>
      </Row>

      {/* Detail Modal */}
      <Modal title="Claim Details" open={!!detail} onCancel={() => setDetail(null)} footer={null} width={820}>
        {detail && (
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Claim #">{detail.claimNumber}</Descriptions.Item>
              <Descriptions.Item label="Status"><Tag color={STATUS_COLOR[detail.status]}>{detail.status?.replace(/_/g,' ')}</Tag></Descriptions.Item>
              <Descriptions.Item label="Insured">{detail.insuredPerson?.firstName} {detail.insuredPerson?.lastName}</Descriptions.Item>
              <Descriptions.Item label="Enrollment">{detail.enrollment?.enrollmentNumber}</Descriptions.Item>
              <Descriptions.Item label="Type"><Tag>{detail.claimType?.replace(/_/g,' ')}</Tag></Descriptions.Item>
              <Descriptions.Item label="Priority"><Tag color={PRIORITY_COLOR[detail.priority]}>{detail.priority}</Tag></Descriptions.Item>
              {detail.provider && <Descriptions.Item label="Provider" span={2}>{detail.provider.name}</Descriptions.Item>}
              <Descriptions.Item label="Claimed (ETB)">{detail.claimedAmount?.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="Approved (ETB)">{detail.approvedAmount?.toLocaleString() || '—'}</Descriptions.Item>
              <Descriptions.Item label="Description" span={2}>{detail.description}</Descriptions.Item>
            </Descriptions>
            {detail.services?.length > 0 && (<><Divider>Services</Divider><Table dataSource={detail.services} rowKey={(r,i)=>i} size="small" pagination={false} columns={[{title:'Service',dataIndex:'name',key:'n'},{title:'Qty',dataIndex:'quantity',key:'q'},{title:'Unit (ETB)',dataIndex:'unitPrice',key:'up',render:v=>v?.toLocaleString()},{title:'Total (ETB)',dataIndex:'totalAmount',key:'t',render:v=>v?.toLocaleString()}]} /></>)}
            <Divider>Status History</Divider>
            <Timeline items={detail.statusHistory?.map(h => ({ color: 'blue', children: (<div><Tag color={STATUS_COLOR[h.status]}>{h.status?.replace(/_/g,' ')}</Tag><Text type="secondary" style={{fontSize:12}}> · {h.changedBy?.firstName} {h.changedBy?.lastName} · {new Date(h.timestamp).toLocaleString()}</Text>{h.reason&&<div style={{fontSize:12,color:'#6b7280',marginTop:2}}>{h.reason}</div>}</div>) }))} />
          </Space>
        )}
      </Modal>

      {/* Status Update Modal */}
      <Modal title="Update Claim Status" open={statusModal.open} onOk={handleStatus} onCancel={() => setStatusModal({ open: false, claim: null })}
        okButtonProps={{ style: { background: '#1e3a5f', borderColor: '#1e3a5f' } }}>
        <Form form={statusForm} layout="vertical">
          <Form.Item name="status" label="New Status" rules={[{ required: true }]}>
            <Select options={VALID_NEXT[statusModal.claim?.status]?.map(s => ({ label: s.replace(/_/g,' '), value: s })) || []} placeholder="Select next status" />
          </Form.Item>
          <Form.Item name="approvedAmount" label="Approved Amount (ETB)"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
          <Form.Item name="reason" label="Reason / Note"><TextArea rows={3} /></Form.Item>
          <Form.Item name="estimatedResolutionDate" label="Estimated Resolution Date"><Input type="date" /></Form.Item>
        </Form>
      </Modal>

      {/* Finance Approval Modal */}
      <Modal title="Finance Approval" open={financeModal.open} onCancel={() => setFinanceModal({ open: false, claim: null })}
        footer={[
          <Button key="r" danger onClick={async () => { const v=await financeForm.validateFields(); await api.patch(`/claims/${financeModal.claim._id}/finance-approve`,{...v,approved:false}); setFinanceModal({open:false,claim:null}); setDetail(null); load(); }}>Reject</Button>,
          <Button key="a" style={{ background: '#1e3a5f', borderColor: '#1e3a5f', color: '#fff' }} onClick={async () => { const v=await financeForm.validateFields(); await api.patch(`/claims/${financeModal.claim._id}/finance-approve`,{...v,approved:true}); setFinanceModal({open:false,claim:null}); setDetail(null); load(); }}>Approve Payment</Button>,
        ]}>
        <Form form={financeForm} layout="vertical">
          <Form.Item name="settlementAmount" label="Settlement Amount (ETB)" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
          <Form.Item name="notes" label="Finance Notes"><TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
