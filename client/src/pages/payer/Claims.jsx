import { useEffect, useState } from 'react';
import { Row, Col, Table, Tag, Button, Space, Card, Typography, Modal, Form, Select,
         InputNumber, Input, Descriptions, Divider, Spin, Timeline, Alert, Tabs, Checkbox, DatePicker } from 'antd';
import { EyeOutlined, ArrowRightOutlined, DollarOutlined, DownloadOutlined, WarningOutlined,
         PaperClipOutlined, MessageOutlined, HistoryOutlined, InfoCircleOutlined,
         FilePdfOutlined, FileImageOutlined, FileOutlined, SendOutlined,
         SafetyOutlined, CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
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

const DOC_ICON = {
  photo:          <FileImageOutlined style={{ color: '#3b82f6', fontSize: 18 }} />,
  receipt:        <FileOutlined style={{ color: '#22c55e', fontSize: 18 }} />,
  police_report:  <FileOutlined style={{ color: '#f59e0b', fontSize: 18 }} />,
  medical_report: <FilePdfOutlined style={{ color: '#ef4444', fontSize: 18 }} />,
  invoice:        <FileOutlined style={{ color: '#8b5cf6', fontSize: 18 }} />,
  other:          <FileOutlined style={{ color: '#9ca3af', fontSize: 18 }} />,
};

const STATUS_TABS = [
  { key: undefined,       label: 'All',          bg: '#eff6ff', text: '#1d4ed8', border: '#1d4ed8' },
  { key: 'submitted',     label: 'Submitted',    bg: '#fefce8', text: '#ca8a04', border: '#ca8a04' },
  { key: 'under_review',  label: 'In Review',    bg: '#eff6ff', text: '#2563eb', border: '#2563eb' },
  { key: 'investigation', label: 'Investigation',bg: '#f5f3ff', text: '#7c3aed', border: '#7c3aed' },
  { key: 'approved',      label: 'Approved',     bg: '#f0fdf4', text: '#16a34a', border: '#16a34a' },
  { key: 'denied',        label: 'Rejected',     bg: '#fef2f2', text: '#dc2626', border: '#dc2626' },
];

const DOC_REQUEST_PRESETS = [
  'Police report', 'Hospital invoice', 'Medical certificate', 'Doctor\'s letter',
  'Repair estimate', 'Photos of damage', 'Witness statement', 'Death certificate',
  'Lab / test results', 'Discharge summary', 'Vehicle registration', 'Driver\'s licence',
];

function calcSLA(claims) {
  const resolved = claims.filter(c => ['settled', 'closed'].includes(c.status));
  if (!resolved.length) return null;
  let h24 = 0, d3 = 0, d7 = 0;
  resolved.forEach(c => {
    const h = (new Date(c.updatedAt) - new Date(c.createdAt)) / 3_600_000;
    if (h <= 24)  h24++;
    if (h <= 72)  d3++;
    if (h <= 168) d7++;
  });
  const pct = n => Math.round((n / resolved.length) * 100);
  return [
    { label: 'Resolved within 24 h', value: pct(h24), color: '#22c55e' },
    { label: 'Resolved within 3 days', value: pct(d3),  color: '#3b82f6' },
    { label: 'Resolved within 7 days', value: pct(d7),  color: '#1e3a5f' },
  ];
}

export default function PayerClaims() {
  const [claims, setClaims]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [detail, setDetail]             = useState(null);
  const [statusModal, setStatusModal]   = useState({ open: false, claim: null });
  const [financeModal, setFinanceModal] = useState({ open: false, claim: null });
  const [statusForm]  = Form.useForm();
  const [financeForm] = Form.useForm();
  const [filterStatus, setFilterStatus] = useState(undefined);
  const [loadError, setLoadError]       = useState('');

  // notes
  const [noteContent, setNoteContent]   = useState('');
  const [noteInternal, setNoteInternal] = useState(false);
  const [addingNote, setAddingNote]     = useState(false);

  // status modal extras
  const [watchedStatus, setWatchedStatus]       = useState('');
  const [docRequestItems, setDocRequestItems]   = useState([]);

  const { user } = useAuth();
  const isClaimsRole = ['claims_officer', 'payer_admin', 'superadmin'].includes(user?.role);
  const isFinance    = ['finance_officer', 'payer_admin', 'superadmin'].includes(user?.role);

  const load = () => {
    setLoading(true);
    setLoadError('');
    api.get('/claims')
      .then(r => setClaims(Array.isArray(r.data?.claims) ? r.data.claims : []))
      .catch(err => setLoadError(err.response?.data?.message || err.message || 'Failed to load claims'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openDetail = (c) => {
    setNoteContent('');
    setNoteInternal(false);
    api.get(`/claims/${c._id}`).then(r => setDetail(r.data.claim));
  };

  const handleStatus = async () => {
    const vals = await statusForm.validateFields();
    const payload = { ...vals };
    if (vals.status === 'documentation_requested' && docRequestItems.length) {
      payload.documentationRequested = docRequestItems;
    }
    await api.patch(`/claims/${statusModal.claim._id}/status`, payload);
    setStatusModal({ open: false, claim: null });
    setDocRequestItems([]);
    setWatchedStatus('');
    setDetail(null);
    load();
  };

  const addNote = async () => {
    if (!noteContent.trim() || !detail) return;
    setAddingNote(true);
    try {
      await api.post(`/claims/${detail._id}/notes`, { content: noteContent, isInternal: noteInternal });
      setNoteContent('');
      const r = await api.get(`/claims/${detail._id}`);
      setDetail(r.data.claim);
    } catch (err) { console.error(err); }
    finally { setAddingNote(false); }
  };

  const counts = {
    total:        claims.length,
    submitted:    claims.filter(c => c.status === 'submitted').length,
    under_review: claims.filter(c => ['under_review', 'documentation_requested'].includes(c.status)).length,
    investigation:claims.filter(c => c.status === 'investigation').length,
    approved:     claims.filter(c => ['approved', 'partially_approved'].includes(c.status)).length,
    denied:       claims.filter(c => c.status === 'denied').length,
  };
  const urgent         = claims.filter(c => c.priority === 'urgent' && !['settled', 'closed', 'denied'].includes(c.status));
  const pendingFinance = claims.filter(c => c.status === 'pending_finance_approval');
  const slaStats       = calcSLA(claims);
  const filtered       = filterStatus ? claims.filter(c =>
    filterStatus === 'approved'
      ? ['approved', 'partially_approved'].includes(c.status)
      : filterStatus === 'under_review'
        ? ['under_review', 'documentation_requested'].includes(c.status)
        : c.status === filterStatus
  ) : claims;

  const columns = [
    { title: 'Claim #', dataIndex: 'claimNumber', key: 'num',
      render: v => <Text code style={{ fontSize: 12 }}>{v}</Text> },
    { title: 'Policyholder', key: 'insured',
      render: (_, r) => `${r.insuredPerson?.firstName || ''} ${r.insuredPerson?.lastName || ''}` },
    { title: 'Type', key: 'type', dataIndex: 'claimType',
      render: v => <Tag>{v?.replace(/_/g, ' ')}</Tag> },
    { title: 'Amount (ETB)', dataIndex: 'claimedAmount', key: 'amt',
      render: v => v?.toLocaleString() },
    { title: 'Status', dataIndex: 'status', key: 'status',
      render: v => <Tag color={STATUS_COLOR[v]}>{v?.replace(/_/g, ' ')}</Tag> },
    { title: 'Priority', dataIndex: 'priority', key: 'pri',
      render: v => <Tag color={PRIORITY_COLOR[v]}>{v}</Tag> },
    { title: 'Docs', key: 'docs',
      render: (_, r) => r.documents?.length > 0
        ? <Tag icon={<PaperClipOutlined />} color="blue">{r.documents.length}</Tag>
        : <Text type="secondary">—</Text> },
    { title: '', key: 'actions', render: (_, r) => (
      <Space>
        <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(r)} />
        {isClaimsRole && !['closed', 'settled', 'denied'].includes(r.status) && r.status !== 'pending_finance_approval' && (
          <Button size="small" style={{ background: '#1e3a5f', borderColor: '#1e3a5f', color: '#fff' }}
            icon={<ArrowRightOutlined />}
            onClick={() => { statusForm.resetFields(); setDocRequestItems([]); setWatchedStatus(''); setStatusModal({ open: true, claim: r }); }} />
        )}
        {isFinance && r.status === 'pending_finance_approval' && (
          <Button size="small" style={{ background: '#22c55e', borderColor: '#22c55e', color: '#fff' }}
            icon={<DollarOutlined />}
            onClick={() => { financeForm.resetFields(); setFinanceModal({ open: true, claim: r }); }}>
            Approve
          </Button>
        )}
      </Space>
    )},
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#111827' }}>Claims Management</Title>
          <Text style={{ color: '#6b7280' }}>Process and track all insurance claims.</Text>
        </div>
        <Button icon={<DownloadOutlined />} style={{ borderRadius: 8, height: 38 }}>Export</Button>
      </div>

      {loadError && <Alert message={loadError} type="error" showIcon closable onClose={() => setLoadError('')} />}

      <Row gutter={[16, 16]}>
        {/* Left — filter tabs + table */}
        <Col xs={24} xl={17}>
          <Row gutter={8} style={{ marginBottom: 16 }}>
            {STATUS_TABS.map(s => (
              <Col key={String(s.key)} flex={1}>
                <div onClick={() => setFilterStatus(s.key)} style={{
                  background: filterStatus === s.key ? s.bg : '#fff',
                  border: filterStatus === s.key ? `2px solid ${s.border}` : '2px solid #e5e7eb',
                  borderRadius: 10, padding: '12px 8px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s',
                }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: filterStatus === s.key ? s.text : '#111827' }}>
                    {s.key === undefined ? counts.total
                      : s.key === 'approved' ? counts.approved
                      : s.key === 'under_review' ? counts.under_review
                      : counts[s.key] ?? 0}
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{s.label}</div>
                </div>
              </Col>
            ))}
          </Row>

          <Card style={{ borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            {loading ? <Spin /> : (
              <Table dataSource={filtered} columns={columns} rowKey="_id"
                pagination={{ pageSize: 10 }} size="small" />
            )}
          </Card>
        </Col>

        {/* Right — SLA + alerts */}
        <Col xs={24} xl={7}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Card title={<span style={{ fontWeight: 700 }}>SLA Performance</span>}
              style={{ borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              {slaStats ? slaStats.map(item => (
                <div key={item.label} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <Text style={{ fontSize: 13, color: '#6b7280' }}>{item.label}</Text>
                    <Text style={{ fontSize: 13, fontWeight: 700, color: item.color }}>{item.value}%</Text>
                  </div>
                  <div style={{ height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${item.value}%`, background: item.color, borderRadius: 3 }} />
                  </div>
                </div>
              )) : (
                <Text type="secondary" style={{ fontSize: 13 }}>
                  SLA data will appear once claims are resolved.
                </Text>
              )}
              <div style={{ marginTop: 8, color: '#9ca3af', fontSize: 11 }}>
                Based on {claims.filter(c => ['settled','closed'].includes(c.status)).length} resolved claims
              </div>
            </Card>

            {pendingFinance.length > 0 && isFinance && (
              <div style={{ background: '#fffbeb', border: '2px solid #fcd34d', borderRadius: 10, padding: '14px 16px' }}>
                <Text style={{ fontWeight: 700, color: '#d97706' }}>
                  {pendingFinance.length} Awaiting Finance Approval
                </Text>
                <div style={{ marginTop: 4 }}>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>Pending payment authorisation</Text>
                </div>
              </div>
            )}

            {urgent.length > 0 && (
              <div style={{ background: '#fef2f2', border: '2px solid #fca5a5', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <WarningOutlined style={{ color: '#dc2626', fontSize: 16 }} />
                  <Text style={{ fontWeight: 700, color: '#dc2626' }}>
                    {urgent.length} Urgent Claim{urgent.length > 1 ? 's' : ''}
                  </Text>
                </div>
                <Text style={{ fontSize: 12, color: '#6b7280' }}>SLA at risk — immediate action needed</Text>
              </div>
            )}
          </div>
        </Col>
      </Row>

      {/* ── Detail Modal ── */}
      <Modal
        title={detail ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Text code style={{ fontSize: 13 }}>{detail.claimNumber}</Text>
            <Tag color={STATUS_COLOR[detail.status]}>{detail.status?.replace(/_/g, ' ')}</Tag>
            <Tag color={PRIORITY_COLOR[detail.priority]}>{detail.priority}</Tag>
            {detail.appealStatus === 'submitted' && <Tag color="gold">Appeal Pending</Tag>}
          </div>
        ) : null}
        open={!!detail}
        onCancel={() => setDetail(null)}
        footer={null}
        width={980}
      >
        {detail && (
          <Tabs defaultActiveKey="overview" size="small" items={[
            {
              key: 'overview',
              label: 'Overview',
              icon: <InfoCircleOutlined />,
              children: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <Descriptions bordered column={2} size="small">
                    <Descriptions.Item label="Insured">
                      {detail.insuredPerson?.firstName} {detail.insuredPerson?.lastName}
                    </Descriptions.Item>
                    <Descriptions.Item label="Enrollment">
                      {detail.enrollment?.enrollmentNumber}
                    </Descriptions.Item>
                    <Descriptions.Item label="Claim Type">
                      <Tag>{detail.claimType?.replace(/_/g, ' ')}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Incident Date">
                      {detail.incidentDate ? new Date(detail.incidentDate).toLocaleDateString() : '—'}
                    </Descriptions.Item>
                    {detail.incidentLocation && (
                      <Descriptions.Item label="Location" span={2}>{detail.incidentLocation}</Descriptions.Item>
                    )}
                    {detail.policeReportRef && (
                      <Descriptions.Item label="Police Report Ref">{detail.policeReportRef}</Descriptions.Item>
                    )}
                    {detail.provider && (
                      <Descriptions.Item label="Provider">{detail.provider.name}</Descriptions.Item>
                    )}
                    <Descriptions.Item label="Claimed (ETB)" span={detail.approvedAmount ? 1 : 2}>
                      <strong>{detail.claimedAmount?.toLocaleString()}</strong>
                    </Descriptions.Item>
                    {detail.approvedAmount != null && (
                      <Descriptions.Item label="Approved (ETB)">
                        <strong style={{ color: '#16a34a' }}>{detail.approvedAmount?.toLocaleString()}</strong>
                      </Descriptions.Item>
                    )}
                    {detail.diagnosis && (
                      <Descriptions.Item label="Diagnosis" span={2}>{detail.diagnosis}</Descriptions.Item>
                    )}
                    <Descriptions.Item label="Description" span={2}>{detail.description}</Descriptions.Item>
                  </Descriptions>

                  {/* Third-party details */}
                  {detail.thirdParty?.name && (
                    <div style={{ background: '#f0f6ff', border: '1px solid #bfdbfe', borderRadius: 9, padding: '12px 16px' }}>
                      <div style={{ fontWeight: 700, color: '#1e40af', marginBottom: 8, fontSize: 13 }}>Third Party Details</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                        {[
                          ['Name',    detail.thirdParty.name],
                          ['Contact', detail.thirdParty.contact],
                          ['Vehicle', detail.thirdParty.vehicle],
                          ['Insurer', detail.thirdParty.insurerName],
                        ].filter(([, v]) => v).map(([k, v]) => (
                          <div key={k}>
                            <span style={{ color: '#6b7280', fontSize: 12 }}>{k}: </span>
                            <span style={{ fontWeight: 600, fontSize: 13 }}>{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Documentation requested */}
                  {detail.documentationRequested?.length > 0 && (
                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 9, padding: '12px 16px' }}>
                      <div style={{ fontWeight: 700, color: '#92400e', marginBottom: 8, fontSize: 13 }}>
                        Documents Requested from Insured
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {detail.documentationRequested.map((d, i) => (
                          <li key={i} style={{ color: '#78350f', fontSize: 13, marginBottom: 3 }}>{d}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Appeal notice */}
                  {detail.appealStatus === 'submitted' && (
                    <div style={{ background: '#eff6ff', border: '1.5px solid #93c5fd', borderRadius: 9, padding: '12px 16px' }}>
                      <div style={{ fontWeight: 700, color: '#1e40af', marginBottom: 6, fontSize: 13 }}>
                        ⚖️ Appeal Submitted by Insured
                      </div>
                      <div style={{ color: '#1e40af', fontSize: 13 }}>{detail.appealNote}</div>
                    </div>
                  )}

                  {/* Services table */}
                  {detail.services?.length > 0 && (
                    <>
                      <Divider style={{ margin: '4px 0' }}>Services / Procedures</Divider>
                      <Table dataSource={detail.services} rowKey={(_, i) => i} size="small" pagination={false}
                        columns={[
                          { title: 'Service', dataIndex: 'name', key: 'n' },
                          { title: 'Qty', dataIndex: 'quantity', key: 'q', width: 60 },
                          { title: 'Unit (ETB)', dataIndex: 'unitPrice', key: 'u', render: v => v?.toLocaleString() },
                          { title: 'Total (ETB)', dataIndex: 'totalAmount', key: 't', render: v => v?.toLocaleString() },
                        ]}
                      />
                    </>
                  )}
                </div>
              ),
            },
            {
              key: 'documents',
              label: `Documents (${detail.documents?.length || 0})`,
              icon: <PaperClipOutlined />,
              children: detail.documents?.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af' }}>
                  <FileOutlined style={{ fontSize: 36, display: 'block', marginBottom: 10 }} />
                  No documents attached to this claim
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {detail.documents.map((doc, i) => (
                    <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, textDecoration: 'none', color: '#111827', transition: 'background 0.12s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#f0f6ff'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#f9fafb'; }}
                    >
                      {DOC_ICON[doc.type] || DOC_ICON.other}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {doc.originalName || doc.name || 'Document'}
                        </div>
                        <div style={{ color: '#9ca3af', fontSize: 12, textTransform: 'capitalize' }}>
                          {doc.type?.replace(/_/g, ' ') || 'other'}
                        </div>
                      </div>
                      <span style={{ color: '#3b82f6', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>Open ↗</span>
                    </a>
                  ))}
                </div>
              ),
            },
            {
              key: 'notes',
              label: `Notes (${detail.notes?.length || 0})`,
              icon: <MessageOutlined />,
              children: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {isClaimsRole && (
                    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
                      <div style={{ fontWeight: 600, color: '#374151', marginBottom: 8, fontSize: 13 }}>Add Note</div>
                      <TextArea
                        value={noteContent}
                        onChange={e => setNoteContent(e.target.value)}
                        placeholder="Write a note for internal records or to the insured..."
                        rows={3}
                        style={{ marginBottom: 10 }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Checkbox checked={noteInternal} onChange={e => setNoteInternal(e.target.checked)}>
                          <span style={{ fontSize: 13, color: '#6b7280' }}>Internal only (hidden from insured)</span>
                        </Checkbox>
                        <Button type="primary" size="small" icon={<SendOutlined />}
                          loading={addingNote} disabled={!noteContent.trim()} onClick={addNote}
                          style={{ background: '#1e3a5f', borderColor: '#1e3a5f' }}>
                          Add Note
                        </Button>
                      </div>
                    </div>
                  )}

                  {detail.notes?.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: '#9ca3af', fontSize: 13 }}>
                      No notes yet
                    </div>
                  ) : (
                    [...detail.notes].reverse().map((n, i) => (
                      <div key={i} style={{
                        background: n.isInternal ? '#fef9c3' : '#f0f9ff',
                        border: `1px solid ${n.isInternal ? '#fde68a' : '#bae6fd'}`,
                        borderRadius: 9, padding: '12px 14px',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 4 }}>
                          <span style={{ fontWeight: 600, color: '#374151', fontSize: 13 }}>
                            {n.author?.firstName} {n.author?.lastName}
                            {n.isInternal && <Tag color="gold" style={{ marginLeft: 8, fontSize: 10 }}>Internal</Tag>}
                          </span>
                          <span style={{ color: '#9ca3af', fontSize: 12 }}>
                            {new Date(n.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div style={{ color: '#374151', fontSize: 13, lineHeight: 1.6 }}>{n.content}</div>
                      </div>
                    ))
                  )}
                </div>
              ),
            },
            {
              key: 'policy',
              label: 'Policy Check',
              icon: <SafetyOutlined />,
              children: (() => {
                const enr = detail.enrollment;
                const incident  = detail.incidentDate ? new Date(detail.incidentDate) : null;
                const start     = enr?.startDate ? new Date(enr.startDate) : null;
                const end       = enr?.endDate   ? new Date(enr.endDate)   : null;
                const isActive  = enr?.status === 'active';
                const inPeriod  = incident && start && end ? (incident >= start && incident <= end) : null;
                const hasPmtOk  = enr?.paymentHistory?.some(p => p.status === 'completed')
                                  || enr?.paymentVerification?.status === 'approved';
                const tierCovs  = enr?.tier?.coverages || [];
                // Find smallest non-zero deductible from tier coverages
                const deductible = tierCovs.reduce((best, tc) => {
                  const d = tc.coverage?.deductible || 0;
                  return d > 0 && d < best ? d : best;
                }, Infinity);
                const ded = deductible === Infinity ? 0 : deductible;
                const suggested = Math.max(0, (detail.claimedAmount || 0) - ded);

                const Check = ({ ok, label, sub }) => (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', background: ok ? '#f0fdf4' : ok === false ? '#fef2f2' : '#f9fafb', border: `1px solid ${ok ? '#86efac' : ok === false ? '#fca5a5' : '#e5e7eb'}`, borderRadius: 9 }}>
                    <span style={{ fontSize: 18, lineHeight: 1, marginTop: 1 }}>
                      {ok === true  ? <CheckCircleOutlined style={{ color: '#16a34a' }} />
                       : ok === false ? <CloseCircleOutlined style={{ color: '#ef4444' }} />
                       : <ExclamationCircleOutlined style={{ color: '#f59e0b' }} />}
                    </span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>{label}</div>
                      {sub && <div style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>{sub}</div>}
                    </div>
                  </div>
                );

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Header */}
                    <div style={{ background: '#1e3a5f', borderRadius: 10, padding: '14px 18px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 16 }}>{enr?.enrollmentNumber || '—'}</div>
                        <div style={{ color: '#93c5fd', fontSize: 13 }}>{enr?.product?.name} {enr?.tier ? `· ${enr.tier.name} Tier` : ''}</div>
                      </div>
                      <Tag color={isActive ? 'success' : 'error'} style={{ fontSize: 13, padding: '3px 12px' }}>
                        {enr?.status?.toUpperCase() || '—'}
                      </Tag>
                    </div>

                    {/* Verification checks */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <Check ok={isActive}
                        label="Policy Status"
                        sub={isActive ? 'Policy is active' : `Status: ${enr?.status || 'unknown'}`} />
                      <Check ok={inPeriod === null ? null : inPeriod}
                        label="Incident Within Coverage Period"
                        sub={start && end
                          ? `${start.toLocaleDateString()} → ${end.toLocaleDateString()}${incident ? ` · Incident: ${incident.toLocaleDateString()}` : ''}`
                          : 'Coverage dates unavailable'} />
                      <Check ok={hasPmtOk}
                        label="Premium Paid"
                        sub={hasPmtOk
                          ? `ETB ${enr?.premium?.amount?.toLocaleString()} / ${enr?.premium?.frequency}`
                          : 'No confirmed payment on record'} />
                      <Check ok={enr?.tier ? true : null}
                        label="Tier / Plan"
                        sub={enr?.tier
                          ? `${enr.tier.name} · ETB ${enr.tier.annualPremium?.toLocaleString()} p.a.`
                          : 'No tier linked to this enrollment'} />
                    </div>

                    {/* Deductible calculator */}
                    <div style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 10, padding: '16px 18px' }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#1e40af', marginBottom: 12 }}>Deductible & Suggested Payable</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
                        {[
                          { label: 'Claimed',     value: `ETB ${(detail.claimedAmount || 0).toLocaleString()}`, color: '#111827' },
                          { label: 'Deductible',  value: ded > 0 ? `ETB ${ded.toLocaleString()}` : 'None',       color: '#dc2626' },
                          { label: 'Suggested',   value: `ETB ${suggested.toLocaleString()}`,                    color: '#16a34a' },
                        ].map(f => (
                          <div key={f.label} style={{ background: '#fff', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
                            <div style={{ color: '#9ca3af', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{f.label}</div>
                            <div style={{ color: f.color, fontWeight: 800, fontSize: 15 }}>{f.value}</div>
                          </div>
                        ))}
                      </div>
                      <Button
                        type="primary"
                        size="small"
                        icon={<DollarOutlined />}
                        onClick={() => {
                          statusForm.resetFields();
                          statusForm.setFieldsValue({ approvedAmount: suggested });
                          setStatusModal({ open: true, claim: detail });
                        }}
                        style={{ background: '#1e40af', borderColor: '#1e40af' }}
                      >
                        Use Suggested Amount in Status Update
                      </Button>
                    </div>

                    {/* Tier coverages table */}
                    {tierCovs.length > 0 && (
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 8 }}>Coverages in this Tier</div>
                        <Table
                          dataSource={tierCovs}
                          rowKey={(_, i) => i}
                          size="small"
                          pagination={false}
                          columns={[
                            { title: 'Coverage', key: 'n', render: (_, r) => r.coverage?.name || '—' },
                            { title: 'Annual Limit (ETB)', key: 'l', align: 'right',
                              render: (_, r) => {
                                const lim = r.customLimit || r.coverage?.limits?.annual;
                                return lim ? <span style={{ color: '#16a34a', fontWeight: 700 }}>{lim.toLocaleString()}</span> : '—';
                              }},
                            { title: 'Deductible (ETB)', key: 'd', align: 'right',
                              render: (_, r) => r.coverage?.deductible > 0
                                ? <span style={{ color: '#dc2626', fontWeight: 600 }}>{r.coverage.deductible.toLocaleString()}</span>
                                : <span style={{ color: '#9ca3af' }}>None</span> },
                            { title: 'Co-pay', key: 'c', align: 'right',
                              render: (_, r) => r.coverage?.copaymentPct > 0 ? `${r.coverage.copaymentPct}%` : '0%' },
                          ]}
                        />
                      </div>
                    )}

                    {/* Subrogation notice */}
                    {detail.thirdParty?.name && ['approved','partially_approved','settled','closed'].includes(detail.status) && (
                      <div style={{ background: '#fefce8', border: '1.5px solid #fde047', borderRadius: 10, padding: '14px 18px' }}>
                        <div style={{ fontWeight: 700, color: '#854d0e', fontSize: 13, marginBottom: 6 }}>
                          ⚖️ Subrogation / Recovery Candidate
                        </div>
                        <div style={{ color: '#713f12', fontSize: 13, marginBottom: 8 }}>
                          A third party is identified. Consider pursuing cost recovery from their insurer
                          {detail.thirdParty.insurerName ? ` (${detail.thirdParty.insurerName})` : ''}.
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 6 }}>
                          {[
                            ['Third Party', detail.thirdParty.name],
                            ['Contact',     detail.thirdParty.contact],
                            ['Vehicle',     detail.thirdParty.vehicle],
                            ['Their Insurer', detail.thirdParty.insurerName],
                          ].filter(([,v]) => v).map(([k,v]) => (
                            <div key={k}><span style={{ color: '#92400e', fontSize: 12 }}>{k}: </span><strong style={{ fontSize: 13 }}>{v}</strong></div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })(),
            },
            {
              key: 'timeline',
              label: 'Timeline',
              icon: <HistoryOutlined />,
              children: (
                <Timeline items={detail.statusHistory?.map(h => ({
                  color: ['settled', 'approved', 'partially_approved'].includes(h.status) ? 'green'
                    : h.status === 'denied' ? 'red' : 'blue',
                  children: (
                    <div>
                      <Tag color={STATUS_COLOR[h.status]}>{h.status?.replace(/_/g, ' ')}</Tag>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {' · '}{h.changedBy?.firstName} {h.changedBy?.lastName}{' · '}
                        {new Date(h.timestamp).toLocaleString()}
                      </Text>
                      {h.reason && (
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>{h.reason}</div>
                      )}
                    </div>
                  ),
                }))} />
              ),
            },
          ]} />
        )}
      </Modal>

      {/* ── Status Update Modal ── */}
      <Modal
        title="Update Claim Status"
        open={statusModal.open}
        onOk={handleStatus}
        onCancel={() => { setStatusModal({ open: false, claim: null }); setDocRequestItems([]); setWatchedStatus(''); }}
        okButtonProps={{ style: { background: '#1e3a5f', borderColor: '#1e3a5f' } }}
      >
        <Form form={statusForm} layout="vertical">
          <Form.Item name="status" label="New Status" rules={[{ required: true }]}>
            <Select
              options={VALID_NEXT[statusModal.claim?.status]?.map(s => ({ label: s.replace(/_/g, ' '), value: s })) || []}
              placeholder="Select next status"
              onChange={v => setWatchedStatus(v)}
            />
          </Form.Item>

          {watchedStatus === 'documentation_requested' && (
            <Form.Item
              label="Documents Required from Insured"
              extra="Select presets or type custom items and press Enter"
            >
              <Select
                mode="tags"
                placeholder="e.g. Police report, Hospital invoice…"
                value={docRequestItems}
                onChange={setDocRequestItems}
                options={DOC_REQUEST_PRESETS.map(d => ({ label: d, value: d }))}
              />
            </Form.Item>
          )}

          <Form.Item name="approvedAmount" label="Approved Amount (ETB)">
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="reason" label="Reason / Note">
            <TextArea rows={3} placeholder="Provide context for this status change..." />
          </Form.Item>
          <Form.Item name="estimatedResolutionDate" label="Estimated Resolution Date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Finance Approval Modal ── */}
      <Modal
        title="Finance Approval"
        open={financeModal.open}
        onCancel={() => setFinanceModal({ open: false, claim: null })}
        footer={[
          <Button key="r" danger onClick={async () => {
            const v = await financeForm.validateFields();
            await api.patch(`/claims/${financeModal.claim._id}/finance-approve`, { ...v, approved: false });
            setFinanceModal({ open: false, claim: null }); setDetail(null); load();
          }}>Reject</Button>,
          <Button key="a" style={{ background: '#1e3a5f', borderColor: '#1e3a5f', color: '#fff' }}
            onClick={async () => {
              const v = await financeForm.validateFields();
              await api.patch(`/claims/${financeModal.claim._id}/finance-approve`, { ...v, approved: true });
              setFinanceModal({ open: false, claim: null }); setDetail(null); load();
            }}>
            Approve Payment
          </Button>,
        ]}
      >
        <Form form={financeForm} layout="vertical">
          <Form.Item name="settlementAmount" label="Settlement Amount (ETB)" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="notes" label="Finance Notes">
            <TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
