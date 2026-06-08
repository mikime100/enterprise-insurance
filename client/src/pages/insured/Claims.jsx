import { useEffect, useState } from 'react';
import { Table, Tag, Form, Select, Input, InputNumber, DatePicker, Spin, message, Upload, Timeline } from 'antd';
import {
  PlusOutlined, EyeOutlined, UploadOutlined,
  CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined,
  FilePdfOutlined, FileImageOutlined, FileOutlined,
} from '@ant-design/icons';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';

const NAVY  = '#1e3a5f';
const GREEN = '#22c55e';
const BLUE  = '#1d4ed8';
const AMBER = '#f59e0b';
const RED   = '#ef4444';

const STATUS_CFG = {
  submitted:               { color: BLUE,    bg: '#dbeafe', label: 'Submitted' },
  acknowledged:            { color: '#0891b2', bg: '#cffafe', label: 'Acknowledged' },
  under_review:            { color: BLUE,    bg: '#dbeafe', label: 'Under Review' },
  documentation_requested: { color: AMBER,   bg: '#fef3c7', label: 'Docs Requested' },
  investigation:           { color: '#7c3aed', bg: '#ede9fe', label: 'Investigation' },
  assessment:              { color: '#0369a1', bg: '#e0f2fe', label: 'Assessment' },
  pending_finance_approval:{ color: AMBER,   bg: '#fef3c7', label: 'Finance Approval' },
  approved:                { color: GREEN,   bg: '#dcfce7', label: 'Approved' },
  partially_approved:      { color: '#059669', bg: '#d1fae5', label: 'Partly Approved' },
  denied:                  { color: RED,     bg: '#fee2e2', label: 'Denied' },
  payment_initiated:       { color: '#2563eb', bg: '#dbeafe', label: 'Payment Initiated' },
  settled:                 { color: '#16a34a', bg: '#dcfce7', label: 'Settled' },
  closed:                  { color: '#9ca3af', bg: '#f3f4f6', label: 'Closed' },
};

const CLAIM_TYPES = [
  'inpatient','outpatient','dental','optical','maternity',
  'pharmacy','emergency','auto_accident','property_damage',
  'liability','death','disability','travel','other',
];

const DOC_TYPES = [
  { value: 'receipt',        label: 'Receipt / Invoice' },
  { value: 'medical_report', label: 'Medical Report' },
  { value: 'police_report',  label: 'Police Report' },
  { value: 'photo',          label: 'Photo / Evidence' },
  { value: 'other',          label: 'Other Document' },
];

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || { color: '#9ca3af', bg: '#f3f4f6', label: status };
  return (
    <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
      {cfg.label}
    </span>
  );
}

function DocIcon({ mime }) {
  if (mime?.includes('pdf')) return <FilePdfOutlined style={{ color: RED }} />;
  if (mime?.includes('image')) return <FileImageOutlined style={{ color: BLUE }} />;
  return <FileOutlined style={{ color: '#9ca3af' }} />;
}

export default function InsuredClaims() {
  const [claims, setClaims]         = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [detail, setDetail]         = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [form] = Form.useForm();
  const { user } = useAuth();

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/claims'),
      api.get('/enrollments', { params: { status: 'active' } }),
    ])
      .then(([c, e]) => {
        setClaims(Array.isArray(c.data.claims) ? c.data.claims : []);
        setEnrollments(Array.isArray(e.data.enrollments) ? e.data.enrollments : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openDetail = (c) => {
    setDetail(c);
    api.get(`/claims/${c._id}`).then(r => setDetail(r.data.claim)).catch(() => {});
  };

  const handleCreate = async () => {
    try {
      const vals = await form.validateFields();
      setSubmitting(true);
      await api.post('/claims', {
        ...vals,
        incidentDate:    vals.incidentDate?.toISOString(),
        insuredPersonId: user.linkedEntity?.entityId,
        submissionType:  'insured_reimbursement',
        documents:       uploadedDocs,
      });
      message.success('Claim submitted successfully');
      setCreateOpen(false);
      form.resetFields();
      setUploadedDocs([]);
      load();
    } catch (err) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || 'Failed to submit claim');
    } finally {
      setSubmitting(false);
    }
  };

  const openCount   = claims.filter(c => !['settled', 'closed', 'denied'].includes(c.status)).length;
  const settledAmt  = claims.filter(c => c.status === 'settled').reduce((s, c) => s + (c.settlementAmount || 0), 0);
  const pendingAmt  = claims.filter(c => ['submitted', 'under_review', 'acknowledged', 'assessment'].includes(c.status))
                            .reduce((s, c) => s + (c.claimedAmount || 0), 0);

  const columns = [
    {
      title: 'CLAIM #', key: 'n',
      render: (_, r) => <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#6b7280' }}>{r.claimNumber}</span>,
    },
    {
      title: 'TYPE', key: 't',
      render: (_, r) => <span style={{ fontSize: 13, color: '#374151', textTransform: 'capitalize' }}>{r.claimType?.replace(/_/g, ' ')}</span>,
    },
    {
      title: 'CLAIMED (ETB)', key: 'c', align: 'right',
      render: (_, r) => <span style={{ fontWeight: 600 }}>{r.claimedAmount?.toLocaleString()}</span>,
    },
    {
      title: 'APPROVED (ETB)', key: 'a', align: 'right',
      render: (_, r) => r.approvedAmount
        ? <span style={{ fontWeight: 600, color: GREEN }}>{r.approvedAmount?.toLocaleString()}</span>
        : <span style={{ color: '#9ca3af' }}>—</span>,
    },
    {
      title: 'STATUS', key: 's',
      render: (_, r) => <StatusBadge status={r.status} />,
    },
    {
      title: 'DATE', key: 'd',
      render: (_, r) => <span style={{ color: '#6b7280', fontSize: 13 }}>{new Date(r.createdAt).toLocaleDateString()}</span>,
    },
    {
      title: '', key: 'act',
      render: (_, r) => (
        <button onClick={() => openDetail(r)}
          style={{ background: NAVY, border: 'none', borderRadius: 7, color: '#fff', padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
          <EyeOutlined /> View
        </button>
      ),
    },
  ];

  const customUpload = async ({ file, onSuccess, onError, onProgress }) => {
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await api.post('/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: e => onProgress({ percent: Math.round((e.loaded / e.total) * 100) }),
      });
      onSuccess(res.data);
      setUploadedDocs(prev => [...prev, { ...res.data, docType: 'other' }]);
    } catch (err) {
      onError(err);
      message.error(err?.response?.data?.message || 'Upload failed');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>My Claims</h1>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 13 }}>File reimbursement claims and track their progress</p>
        </div>
        <button
          onClick={() => { form.resetFields(); setUploadedDocs([]); setCreateOpen(true); }}
          style={{ background: NAVY, border: 'none', borderRadius: 10, color: '#fff', padding: '11px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
          <PlusOutlined /> File New Claim
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {[
          { label: 'TOTAL CLAIMS',    value: claims.length,                 color: '#8b5cf6', icon: <FileOutlined /> },
          { label: 'OPEN CLAIMS',     value: openCount,                     color: AMBER,     icon: <ClockCircleOutlined /> },
          { label: 'PENDING (ETB)',   value: pendingAmt.toLocaleString(),   color: BLUE,      icon: <ClockCircleOutlined /> },
          { label: 'SETTLED (ETB)',   value: settledAmt.toLocaleString(),   color: GREEN,     icon: <CheckCircleOutlined /> },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '18px 22px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ width: 38, height: 38, borderRadius: 9, background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, fontSize: 17, marginBottom: 10 }}>{s.icon}</div>
            <div style={{ color: '#6b7280', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{s.label}</div>
            <div style={{ color: '#111827', fontSize: 24, fontWeight: 800, lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Claims table */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid #f3f4f6' }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>Claims History</span>
        </div>
        <style>{`
          .ic-table .ant-table                       { background: transparent !important; }
          .ic-table .ant-table-thead > tr > th       { background: #f9fafb !important; color: #6b7280 !important; border-bottom: 1px solid #e5e7eb !important; font-size: 11px; letter-spacing: .08em; font-weight: 700; padding: 10px 16px !important; }
          .ic-table .ant-table-tbody > tr > td       { border-bottom: 1px solid #f3f4f6 !important; background: transparent !important; padding: 14px 16px !important; }
          .ic-table .ant-table-tbody > tr:hover > td { background: #f9fafb !important; }
          .ic-table .ant-empty-description           { color: #9ca3af; }
        `}</style>
        <div className="ic-table" style={{ padding: '0 4px' }}>
          {loading
            ? <div style={{ padding: 60, textAlign: 'center' }}><Spin /></div>
            : <Table dataSource={claims} columns={columns} rowKey="_id" pagination={{ pageSize: 10, style: { padding: '12px 20px' } }} size="small"
                locale={{ emptyText: <div style={{ padding: '40px 0', color: '#9ca3af' }}>No claims filed yet</div> }} />
          }
        </div>
      </div>

      {/* ── File Claim Modal ── */}
      {createOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setCreateOpen(false); }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 580, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
            <div style={{ padding: '20px 28px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 800, fontSize: 18, color: '#111827' }}>File a Reimbursement Claim</div>
              <button onClick={() => setCreateOpen(false)} style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, color: '#6b7280', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>✕</button>
            </div>

            <div style={{ overflowY: 'auto', padding: '24px 28px', flex: 1 }}>
              <Form form={form} layout="vertical" requiredMark={false}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                  <Form.Item name="enrollmentId" label="Policy" rules={[{ required: true, message: 'Select a policy' }]} style={{ gridColumn: '1 / -1' }}>
                    <Select size="large" placeholder="Select your active policy">
                      {enrollments.map(e => (
                        <Select.Option key={e._id} value={e._id}>
                          {e.enrollmentNumber} — {e.product?.name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item name="claimType" label="Claim Type" rules={[{ required: true, message: 'Select claim type' }]}>
                    <Select size="large" placeholder="Type of claim">
                      {CLAIM_TYPES.map(v => (
                        <Select.Option key={v} value={v}>{v.replace(/_/g, ' ')}</Select.Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item name="incidentDate" label="Date of Incident" rules={[{ required: true, message: 'Select date' }]}>
                    <DatePicker style={{ width: '100%' }} size="large" />
                  </Form.Item>

                  <Form.Item name="claimedAmount" label="Amount Claimed (ETB)" rules={[{ required: true, message: 'Enter amount' }]}>
                    <InputNumber style={{ width: '100%' }} size="large" min={1} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
                  </Form.Item>

                  <Form.Item name="diagnosis" label="Diagnosis (if applicable)">
                    <Input size="large" placeholder="e.g. Acute appendicitis" />
                  </Form.Item>
                </div>

                <Form.Item name="description" label="Description of Incident" rules={[{ required: true, message: 'Describe the incident' }]}>
                  <Input.TextArea rows={3} placeholder="Describe what happened and the treatment received..." />
                </Form.Item>

                {/* Document upload */}
                <Form.Item
                  label="Supporting Documents"
                  extra="Attach receipts, medical reports, or police reports (PDF, JPG, PNG · max 5 MB each)"
                >
                  <Upload
                    customRequest={customUpload}
                    onRemove={file => setUploadedDocs(prev => prev.filter(d => d.filename !== file.response?.filename))}
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    multiple
                    listType="text"
                  >
                    <button type="button" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: 8, color: '#374151', fontSize: 13, cursor: 'pointer', width: '100%', justifyContent: 'center' }}>
                      <UploadOutlined /> Click to attach documents
                    </button>
                  </Upload>
                </Form.Item>
              </Form>
            </div>

            <div style={{ padding: '16px 28px', borderTop: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', gap: 10 }}>
              <button onClick={() => setCreateOpen(false)}
                style={{ flex: 1, padding: '12px 0', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, color: '#6b7280', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleCreate} disabled={submitting}
                style={{ flex: 2, padding: '12px 0', background: submitting ? '#9ca3af' : NAVY, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 15, cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {submitting ? <Spin size="small" /> : <PlusOutlined />}
                {submitting ? 'Submitting...' : 'Submit Claim'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Claim Detail Overlay ── */}
      {detail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setDetail(null); }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 660, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>

            <div style={{ padding: '20px 28px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18, color: '#111827' }}>Claim Details</div>
                <div style={{ color: '#9ca3af', fontSize: 13, fontFamily: 'monospace', marginTop: 2 }}>{detail.claimNumber}</div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <StatusBadge status={detail.status} />
                <button onClick={() => setDetail(null)} style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, color: '#6b7280', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>✕</button>
              </div>
            </div>

            <div style={{ overflowY: 'auto', padding: '24px 28px', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Amounts */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                {[
                  { label: 'Claimed',    value: `ETB ${detail.claimedAmount?.toLocaleString()}`,    color: '#111827' },
                  { label: 'Approved',   value: detail.approvedAmount ? `ETB ${detail.approvedAmount?.toLocaleString()}` : '—', color: GREEN },
                  { label: 'Settlement', value: detail.settlementAmount ? `ETB ${detail.settlementAmount?.toLocaleString()}` : '—', color: '#0369a1' },
                  { label: 'Type',       value: detail.claimType?.replace(/_/g, ' '), color: '#374151' },
                ].map(f => (
                  <div key={f.label} style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ color: '#9ca3af', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{f.label}</div>
                    <div style={{ color: f.color, fontWeight: 700, fontSize: 14, textTransform: 'capitalize' }}>{f.value}</div>
                  </div>
                ))}
              </div>

              {/* Description */}
              {detail.description && (
                <div style={{ background: '#f9fafb', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ color: '#9ca3af', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Description</div>
                  <div style={{ color: '#374151', fontSize: 13, lineHeight: 1.6 }}>{detail.description}</div>
                </div>
              )}

              {/* Attached documents */}
              {detail.documents?.length > 0 && (
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 10 }}>Attached Documents</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {detail.documents.map((doc, i) => (
                      <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 9, textDecoration: 'none', color: '#374151' }}>
                        <DocIcon mime={doc.mimeType} />
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{doc.originalName || doc.name}</span>
                        <span style={{ fontSize: 11, color: '#9ca3af', textTransform: 'capitalize' }}>{doc.type?.replace(/_/g, ' ') || doc.docType}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* External notes from claims officer */}
              {detail.notes?.filter(n => !n.isInternal).length > 0 && (
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 10 }}>Notes from Claims Team</div>
                  {detail.notes.filter(n => !n.isInternal).map((n, i) => (
                    <div key={i} style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 9, padding: '12px 14px', marginBottom: 8 }}>
                      <div style={{ color: '#374151', fontSize: 13 }}>{n.content}</div>
                      <div style={{ color: '#9ca3af', fontSize: 11, marginTop: 4 }}>{new Date(n.createdAt || n.timestamp).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Status timeline */}
              {detail.statusHistory?.length > 0 && (
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 14 }}>Status History</div>
                  <Timeline
                    items={[...detail.statusHistory].reverse().map(h => ({
                      color: h.status === 'settled' ? 'green' : h.status === 'denied' ? 'red' : 'blue',
                      children: (
                        <div>
                          <StatusBadge status={h.status} />
                          <span style={{ color: '#9ca3af', fontSize: 11, marginLeft: 8 }}>
                            {new Date(h.timestamp).toLocaleString()}
                          </span>
                          {h.reason && <div style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>{h.reason}</div>}
                        </div>
                      ),
                    }))}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
