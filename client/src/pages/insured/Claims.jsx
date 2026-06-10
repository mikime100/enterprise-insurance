import { useEffect, useState } from 'react';
import { Table, Form, Select, Input, InputNumber, DatePicker, Spin, message, Upload, Timeline } from 'antd';
import {
  PlusOutlined, EyeOutlined, UploadOutlined,
  CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined,
  FilePdfOutlined, FileImageOutlined, FileOutlined, SendOutlined, DeleteOutlined,
  WarningOutlined, SyncOutlined,
} from '@ant-design/icons';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';

const NAVY  = '#1e3a5f';
const GREEN = '#22c55e';
const BLUE  = '#1d4ed8';
const AMBER = '#f59e0b';
const RED   = '#ef4444';

const STATUS_CFG = {
  submitted:               { color: BLUE,     bg: '#dbeafe', label: 'Submitted' },
  acknowledged:            { color: '#0891b2', bg: '#cffafe', label: 'Acknowledged' },
  under_review:            { color: BLUE,     bg: '#dbeafe', label: 'Under Review' },
  documentation_requested: { color: AMBER,    bg: '#fef3c7', label: 'Docs Requested' },
  investigation:           { color: '#7c3aed', bg: '#ede9fe', label: 'Investigation' },
  assessment:              { color: '#0369a1', bg: '#e0f2fe', label: 'Assessment' },
  pending_finance_approval:{ color: AMBER,    bg: '#fef3c7', label: 'Finance Approval' },
  approved:                { color: GREEN,    bg: '#dcfce7', label: 'Approved' },
  partially_approved:      { color: '#059669', bg: '#d1fae5', label: 'Partly Approved' },
  denied:                  { color: RED,      bg: '#fee2e2', label: 'Denied' },
  payment_initiated:       { color: '#2563eb', bg: '#dbeafe', label: 'Payment Initiated' },
  settled:                 { color: '#16a34a', bg: '#dcfce7', label: 'Settled' },
  closed:                  { color: '#9ca3af', bg: '#f3f4f6', label: 'Closed' },
};

const CLAIM_TYPE_LABELS = {
  inpatient: 'Inpatient', outpatient: 'Outpatient', dental: 'Dental',
  optical: 'Optical', maternity: 'Maternity', pharmacy: 'Pharmacy',
  emergency: 'Emergency', auto_accident: 'Auto Accident',
  property_damage: 'Property Damage', liability: 'Liability',
  death: 'Death / Life', disability: 'Disability', travel: 'Travel', other: 'Other',
};

const CLAIM_TYPES_BY_PRODUCT = {
  auto:       ['auto_accident', 'property_damage', 'liability', 'other'],
  home:       ['property_damage', 'liability', 'other'],
  renters:    ['property_damage', 'liability', 'other'],
  business:   ['property_damage', 'liability', 'auto_accident', 'other'],
  life:       ['death', 'disability', 'other'],
  disability: ['disability', 'other'],
  health:     ['inpatient','outpatient','dental','optical','maternity','pharmacy','emergency','death','disability','other'],
  travel:     ['travel','emergency','inpatient','outpatient','other'],
  pet:        ['inpatient','outpatient','emergency','pharmacy','other'],
};

const ALL_CLAIM_TYPES = Object.keys(CLAIM_TYPE_LABELS);

const DOC_TYPES = [
  { value: 'receipt',        label: 'Receipt / Invoice' },
  { value: 'medical_report', label: 'Medical Report' },
  { value: 'police_report',  label: 'Police Report' },
  { value: 'photo',          label: 'Photo / Evidence' },
  { value: 'invoice',        label: 'Repair / Service Invoice' },
  { value: 'other',          label: 'Other Document' },
];

const THIRD_PARTY_TYPES = ['auto_accident', 'property_damage', 'liability'];

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || { color: '#9ca3af', bg: '#f3f4f6', label: status };
  return (
    <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
      {cfg.label}
    </span>
  );
}

function DocRow({ doc, onRemove, onChangeType }) {
  const mime = doc.mimeType || '';
  const icon = mime.includes('pdf')   ? <FilePdfOutlined style={{ color: RED, fontSize: 16 }} />
             : mime.includes('image') ? <FileImageOutlined style={{ color: BLUE, fontSize: 16 }} />
             :                          <FileOutlined style={{ color: '#9ca3af', fontSize: 16 }} />;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 9 }}>
      {icon}
      <span style={{ flex: 1, fontSize: 13, color: '#374151', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {doc.originalName || doc.filename}
      </span>
      <select
        value={doc.docType || 'other'}
        onChange={e => onChangeType(doc.filename, e.target.value)}
        style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 12, background: '#fff', flexShrink: 0 }}
      >
        {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
      <button onClick={() => onRemove(doc.filename)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '2px 4px', flexShrink: 0 }}>
        <DeleteOutlined />
      </button>
    </div>
  );
}

export default function InsuredClaims() {
  const [claims, setClaims]           = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [detail, setDetail]           = useState(null);
  const [createOpen, setCreateOpen]   = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [claimTypeValue, setClaimTypeValue] = useState('');
  const [selectedProductType, setSelectedProductType] = useState('');
  const [form] = Form.useForm();
  const { user } = useAuth();

  // Documentation response
  const [responseDocsOpen, setResponseDocsOpen]     = useState(false);
  const [responseDocs, setResponseDocs]             = useState([]);
  const [submittingResponse, setSubmittingResponse] = useState(false);

  // Appeal
  const [appealOpen, setAppealOpen]         = useState(false);
  const [appealText, setAppealText]         = useState('');
  const [submittingAppeal, setSubmittingAppeal] = useState(false);

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

  // ── Create claim ──────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    try {
      const vals = await form.validateFields();
      setSubmitting(true);
      const documents = uploadedDocs.map(d => ({
        name: d.originalName || d.filename,
        type: d.docType || 'other',
        url:  d.url,
      }));
      await api.post('/claims', {
        ...vals,
        incidentDate:    vals.incidentDate?.toISOString(),
        insuredPersonId: user.linkedEntity?.entityId,
        submissionType:  'insured_reimbursement',
        documents,
      });
      message.success('Claim submitted successfully');
      setCreateOpen(false);
      form.resetFields();
      setUploadedDocs([]);
      setClaimTypeValue('');
      load();
    } catch (err) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || 'Failed to submit claim');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Upload helpers ────────────────────────────────────────────────────────────
  const customUpload = (setter) => async ({ file, onSuccess, onError, onProgress }) => {
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await api.post('/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: e => onProgress({ percent: Math.round((e.loaded / e.total) * 100) }),
      });
      onSuccess(res.data);
      setter(prev => [...prev, { ...res.data, docType: 'other' }]);
    } catch (err) {
      onError(err);
      message.error(err?.response?.data?.message || 'Upload failed');
    }
  };

  const changeDocType = (setter) => (filename, docType) => {
    setter(prev => prev.map(d => d.filename === filename ? { ...d, docType } : d));
  };

  const removeDoc = (setter) => (filename) => {
    setter(prev => prev.filter(d => d.filename !== filename));
  };

  // ── Submit additional documents (documentation_requested response) ─────────
  const submitResponseDocs = async () => {
    if (!responseDocs.length || !detail) return;
    setSubmittingResponse(true);
    try {
      const documents = responseDocs.map(d => ({
        name: d.originalName || d.filename,
        type: d.docType || 'other',
        url:  d.url,
      }));
      await api.post(`/claims/${detail._id}/add-documents`, { documents });
      message.success('Documents submitted — your claim is back under review.', 5);
      setResponseDocsOpen(false);
      setResponseDocs([]);
      const r = await api.get(`/claims/${detail._id}`);
      setDetail(r.data.claim);
      load();
    } catch (err) {
      message.error(err?.response?.data?.message || 'Failed to submit documents');
    } finally {
      setSubmittingResponse(false);
    }
  };

  // ── Appeal ────────────────────────────────────────────────────────────────────
  const submitAppeal = async () => {
    if (!appealText.trim() || !detail) return;
    setSubmittingAppeal(true);
    try {
      await api.post(`/claims/${detail._id}/appeal`, { appealNote: appealText });
      message.success('Your appeal has been submitted. We will review it within 3 business days.', 6);
      setAppealOpen(false);
      setAppealText('');
      const r = await api.get(`/claims/${detail._id}`);
      setDetail(r.data.claim);
    } catch (err) {
      message.error(err?.response?.data?.message || 'Failed to submit appeal');
    } finally {
      setSubmittingAppeal(false);
    }
  };

  // ── Stats ─────────────────────────────────────────────────────────────────────
  const openCount  = claims.filter(c => !['settled', 'closed', 'denied'].includes(c.status)).length;
  const settledAmt = claims.filter(c => c.status === 'settled').reduce((s, c) => s + (c.settlementAmount || 0), 0);
  const pendingAmt = claims
    .filter(c => ['submitted', 'under_review', 'acknowledged', 'assessment', 'investigation'].includes(c.status))
    .reduce((s, c) => s + (c.claimedAmount || 0), 0);

  const columns = [
    { title: 'CLAIM #', key: 'n',
      render: (_, r) => <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#6b7280' }}>{r.claimNumber}</span> },
    { title: 'TYPE', key: 't',
      render: (_, r) => <span style={{ fontSize: 13, color: '#374151', textTransform: 'capitalize' }}>{r.claimType?.replace(/_/g, ' ')}</span> },
    { title: 'CLAIMED (ETB)', key: 'c', align: 'right',
      render: (_, r) => <span style={{ fontWeight: 600 }}>{r.claimedAmount?.toLocaleString()}</span> },
    { title: 'APPROVED (ETB)', key: 'a', align: 'right',
      render: (_, r) => r.approvedAmount
        ? <span style={{ fontWeight: 600, color: GREEN }}>{r.approvedAmount?.toLocaleString()}</span>
        : <span style={{ color: '#9ca3af' }}>—</span> },
    { title: 'STATUS', key: 's',
      render: (_, r) => <StatusBadge status={r.status} /> },
    { title: 'DATE', key: 'd',
      render: (_, r) => <span style={{ color: '#6b7280', fontSize: 13 }}>{new Date(r.createdAt).toLocaleDateString()}</span> },
    { title: '', key: 'act',
      render: (_, r) => (
        <button onClick={() => openDetail(r)}
          style={{ background: NAVY, border: 'none', borderRadius: 7, color: '#fff', padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
          <EyeOutlined /> View
        </button>
      ) },
  ];

  // ── Upload zone shared component ─────────────────────────────────────────────
  const UploadZone = ({ setter }) => (
    <Upload
      customRequest={customUpload(setter)}
      showUploadList={false}
      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
      multiple
    >
      <button type="button" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: 8, color: '#374151', fontSize: 13, cursor: 'pointer', width: '100%', justifyContent: 'center' }}>
        <UploadOutlined /> Click to attach documents
      </button>
    </Upload>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>My Claims</h1>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 13 }}>File reimbursement claims and track their progress</p>
        </div>
        <button
          onClick={() => { form.resetFields(); setUploadedDocs([]); setClaimTypeValue(''); setCreateOpen(true); }}
          style={{ background: NAVY, border: 'none', borderRadius: 10, color: '#fff', padding: '11px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
          <PlusOutlined /> File New Claim
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {[
          { label: 'TOTAL CLAIMS',  value: claims.length,               color: '#8b5cf6', icon: <FileOutlined /> },
          { label: 'OPEN CLAIMS',   value: openCount,                   color: AMBER,     icon: <ClockCircleOutlined /> },
          { label: 'PENDING (ETB)', value: pendingAmt.toLocaleString(), color: BLUE,      icon: <SyncOutlined /> },
          { label: 'SETTLED (ETB)', value: settledAmt.toLocaleString(), color: GREEN,     icon: <CheckCircleOutlined /> },
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
            : <Table dataSource={claims} columns={columns} rowKey="_id"
                pagination={{ pageSize: 10, style: { padding: '12px 20px' } }} size="small"
                locale={{ emptyText: <div style={{ padding: '40px 0', color: '#9ca3af' }}>No claims filed yet</div> }} />
          }
        </div>
      </div>

      {/* ── File Claim Modal ─────────────────────────────────────────────────── */}
      {createOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setCreateOpen(false); }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 680, maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>

            <div style={{ padding: '20px 28px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 800, fontSize: 18, color: '#111827' }}>File a Reimbursement Claim</div>
              <button onClick={() => setCreateOpen(false)} style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, color: '#6b7280', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>✕</button>
            </div>

            <div style={{ overflowY: 'auto', padding: '24px 28px', flex: 1 }}>
              <Form form={form} layout="vertical" requiredMark={false} scrollToFirstError>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>

                  <Form.Item name="enrollmentId" label="Policy" rules={[{ required: true, message: 'Select a policy' }]} style={{ gridColumn: '1 / -1' }}>
                    <Select size="large" placeholder="Select your active policy"
                      onChange={v => {
                        const enr = enrollments.find(e => e._id === v);
                        setSelectedProductType(enr?.product?.productType || '');
                        form.setFieldValue('claimType', undefined);
                        setClaimTypeValue('');
                      }}>
                      {enrollments.map(e => (
                        <Select.Option key={e._id} value={e._id}>
                          {e.enrollmentNumber} — {e.product?.name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item name="claimType" label="Claim Type" rules={[{ required: true, message: 'Select claim type' }]}>
                    <Select size="large" placeholder="Type of claim"
                      onChange={v => setClaimTypeValue(v)}>
                      {(CLAIM_TYPES_BY_PRODUCT[selectedProductType] || ALL_CLAIM_TYPES).map(v => (
                        <Select.Option key={v} value={v}>{CLAIM_TYPE_LABELS[v]}</Select.Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item name="incidentDate" label="Date of Incident" rules={[{ required: true, message: 'Select date' }]}>
                    <DatePicker style={{ width: '100%' }} size="large" />
                  </Form.Item>

                  <Form.Item name="claimedAmount" label="Amount Claimed (ETB)" rules={[{ required: true, message: 'Enter amount' }]}>
                    <InputNumber style={{ width: '100%' }} size="large" min={1} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
                  </Form.Item>

                  <Form.Item name="policeReportRef" label="Police / Authority Report Reference">
                    <Input size="large" placeholder="e.g. POL-2024-00123 (if applicable)" />
                  </Form.Item>

                  <Form.Item name="incidentLocation" label="Incident Location">
                    <Input size="large" placeholder="e.g. Bole Road, Addis Ababa" />
                  </Form.Item>

                  <Form.Item name="diagnosis" label="Diagnosis (if applicable)">
                    <Input size="large" placeholder="e.g. Acute appendicitis" />
                  </Form.Item>
                </div>

                <Form.Item name="description" label="Description of Incident" rules={[{ required: true, message: 'Describe the incident' }]}>
                  <Input.TextArea rows={3} placeholder="Describe what happened and the treatment / service received..." />
                </Form.Item>

                {/* Third-party section */}
                {THIRD_PARTY_TYPES.includes(claimTypeValue) && (
                  <div style={{ background: '#f0f6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '16px 18px', marginBottom: 20 }}>
                    <div style={{ fontWeight: 700, color: '#1e40af', fontSize: 13, marginBottom: 12 }}>Third Party Details (optional)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                      <Form.Item name={['thirdParty', 'name']} label="Third Party Name" style={{ marginBottom: 12 }}>
                        <Input placeholder="Full name" />
                      </Form.Item>
                      <Form.Item name={['thirdParty', 'contact']} label="Contact" style={{ marginBottom: 12 }}>
                        <Input placeholder="Phone or email" />
                      </Form.Item>
                      <Form.Item name={['thirdParty', 'vehicle']} label="Vehicle / Property Info" style={{ marginBottom: 12 }}>
                        <Input placeholder="Licence plate, vehicle description…" />
                      </Form.Item>
                      <Form.Item name={['thirdParty', 'insurerName']} label="Their Insurer (if known)" style={{ marginBottom: 0 }}>
                        <Input placeholder="Name of their insurance company" />
                      </Form.Item>
                    </div>
                  </div>
                )}

                {/* Document upload */}
                <Form.Item
                  label="Supporting Documents"
                  extra="Attach receipts, medical reports, police reports, or photos. Select the document type for each file."
                >
                  <UploadZone setter={setUploadedDocs} />
                  {uploadedDocs.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                      {uploadedDocs.map(doc => (
                        <DocRow
                          key={doc.filename}
                          doc={doc}
                          onChangeType={changeDocType(setUploadedDocs)}
                          onRemove={removeDoc(setUploadedDocs)}
                        />
                      ))}
                    </div>
                  )}
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

      {/* ── Claim Detail Overlay ─────────────────────────────────────────────── */}
      {detail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setDetail(null); }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 680, maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>

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
                  { label: 'Approved',   value: detail.approvedAmount  ? `ETB ${detail.approvedAmount?.toLocaleString()}`  : '—', color: GREEN },
                  { label: 'Settlement', value: detail.settlementAmount ? `ETB ${detail.settlementAmount?.toLocaleString()}` : '—', color: '#0369a1' },
                  { label: 'Type',       value: detail.claimType?.replace(/_/g, ' '), color: '#374151' },
                ].map(f => (
                  <div key={f.label} style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ color: '#9ca3af', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{f.label}</div>
                    <div style={{ color: f.color, fontWeight: 700, fontSize: 14, textTransform: 'capitalize' }}>{f.value}</div>
                  </div>
                ))}
              </div>

              {/* Incident info */}
              {(detail.incidentLocation || detail.policeReportRef) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {detail.incidentLocation && (
                    <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ color: '#9ca3af', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Location</div>
                      <div style={{ color: '#374151', fontWeight: 600, fontSize: 13 }}>{detail.incidentLocation}</div>
                    </div>
                  )}
                  {detail.policeReportRef && (
                    <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ color: '#9ca3af', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Police Report Ref</div>
                      <div style={{ color: '#374151', fontWeight: 600, fontSize: 13 }}>{detail.policeReportRef}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Description */}
              {detail.description && (
                <div style={{ background: '#f9fafb', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ color: '#9ca3af', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Description</div>
                  <div style={{ color: '#374151', fontSize: 13, lineHeight: 1.6 }}>{detail.description}</div>
                </div>
              )}

              {/* ── documentation_requested banner ──────────────────────────── */}
              {detail.status === 'documentation_requested' && (
                <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 12, padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <WarningOutlined style={{ color: AMBER, fontSize: 18 }} />
                    <div style={{ fontWeight: 800, color: '#92400e', fontSize: 15 }}>Additional Documents Required</div>
                  </div>
                  {detail.documentationRequested?.length > 0 && (
                    <ul style={{ margin: '0 0 14px', paddingLeft: 20 }}>
                      {detail.documentationRequested.map((d, i) => (
                        <li key={i} style={{ color: '#78350f', fontSize: 14, marginBottom: 4 }}>{d}</li>
                      ))}
                    </ul>
                  )}
                  <div style={{ color: '#78350f', fontSize: 13, marginBottom: 14 }}>
                    Please upload the requested documents. Your claim will automatically return to review once submitted.
                  </div>
                  <button
                    onClick={() => { setResponseDocs([]); setResponseDocsOpen(true); }}
                    style={{ padding: '10px 20px', background: AMBER, border: 'none', borderRadius: 9, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
                    <UploadOutlined /> Upload Required Documents
                  </button>
                </div>
              )}

              {/* ── appeal section ──────────────────────────────────────────── */}
              {detail.status === 'denied' && !['submitted', 'reviewed'].includes(detail.appealStatus) && (
                <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 12, padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <CloseCircleOutlined style={{ color: RED, fontSize: 18 }} />
                    <div style={{ fontWeight: 800, color: '#991b1b', fontSize: 15 }}>Claim Denied</div>
                  </div>
                  {detail.resolution && (
                    <div style={{ color: '#7f1d1d', fontSize: 13, marginBottom: 14 }}>Reason: {detail.resolution}</div>
                  )}
                  <div style={{ color: '#991b1b', fontSize: 13, marginBottom: 14 }}>
                    If you believe this decision was incorrect, you may submit a formal appeal with supporting justification.
                  </div>
                  <button
                    onClick={() => { setAppealText(''); setAppealOpen(true); }}
                    style={{ padding: '10px 20px', background: '#fff', border: '1.5px solid #ef4444', borderRadius: 9, color: RED, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                    Submit Appeal
                  </button>
                </div>
              )}

              {detail.appealStatus === 'submitted' && (
                <div style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <CheckCircleOutlined style={{ color: BLUE, fontSize: 16, marginTop: 2 }} />
                  <div>
                    <div style={{ fontWeight: 700, color: '#1e40af', fontSize: 13 }}>Appeal Submitted</div>
                    <div style={{ color: '#1e40af', fontSize: 13, marginTop: 3 }}>{detail.appealNote}</div>
                    <div style={{ color: '#3b82f6', fontSize: 12, marginTop: 4 }}>We will review your appeal within 3 business days.</div>
                  </div>
                </div>
              )}

              {/* Attached documents */}
              {detail.documents?.length > 0 && (
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 10 }}>Attached Documents</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {detail.documents.map((doc, i) => {
                      const mime = doc.mimeType || '';
                      const icon = mime.includes('pdf')   ? <FilePdfOutlined style={{ color: RED }} />
                                 : mime.includes('image') ? <FileImageOutlined style={{ color: BLUE }} />
                                 :                          <FileOutlined style={{ color: '#9ca3af' }} />;
                      return (
                        <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer"
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 9, textDecoration: 'none', color: '#374151' }}>
                          {icon}
                          <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{doc.originalName || doc.name}</span>
                          <span style={{ fontSize: 11, color: '#9ca3af', textTransform: 'capitalize' }}>{doc.type?.replace(/_/g, ' ') || 'other'}</span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* External notes from claims team */}
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

      {/* ── Documentation Response Modal ─────────────────────────────────────── */}
      {responseDocsOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520, boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
            <div style={{ background: AMBER, padding: '18px 24px', borderRadius: '16px 16px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>Upload Required Documents</div>
                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 }}>{detail?.claimNumber}</div>
              </div>
              <button onClick={() => setResponseDocsOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {detail?.documentationRequested?.length > 0 && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 9, padding: '10px 14px' }}>
                  <div style={{ fontWeight: 700, color: '#92400e', fontSize: 13, marginBottom: 6 }}>Documents needed:</div>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {detail.documentationRequested.map((d, i) => (
                      <li key={i} style={{ color: '#78350f', fontSize: 13 }}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}
              <UploadZone setter={setResponseDocs} />
              {responseDocs.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {responseDocs.map(doc => (
                    <DocRow
                      key={doc.filename}
                      doc={doc}
                      onChangeType={changeDocType(setResponseDocs)}
                      onRemove={removeDoc(setResponseDocs)}
                    />
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setResponseDocsOpen(false)}
                  style={{ flex: 1, padding: '11px 0', border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff', color: '#374151', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                  Cancel
                </button>
                <button onClick={submitResponseDocs} disabled={!responseDocs.length || submittingResponse}
                  style={{ flex: 2, padding: '11px 0', border: 'none', borderRadius: 10, background: !responseDocs.length || submittingResponse ? '#e5e7eb' : AMBER, color: !responseDocs.length || submittingResponse ? '#9ca3af' : '#fff', fontWeight: 700, cursor: !responseDocs.length || submittingResponse ? 'not-allowed' : 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {submittingResponse ? <Spin size="small" /> : <SendOutlined />}
                  {submittingResponse ? 'Submitting…' : 'Submit Documents'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Appeal Modal ─────────────────────────────────────────────────────── */}
      {appealOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480, boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
            <div style={{ background: NAVY, padding: '18px 24px', borderRadius: '16px 16px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>Submit an Appeal</div>
              <button onClick={() => setAppealOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 9, padding: '10px 14px', fontSize: 13, color: '#0369a1' }}>
                Clearly explain why you believe the denial was incorrect and include any relevant evidence or context. Our team will review and respond within 3 business days.
              </div>
              <div>
                <div style={{ fontWeight: 600, color: '#374151', fontSize: 13, marginBottom: 8 }}>Appeal Reason *</div>
                <textarea
                  value={appealText}
                  onChange={e => setAppealText(e.target.value)}
                  placeholder="Describe why you are appealing this decision and provide any additional supporting information..."
                  rows={5}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 13, resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setAppealOpen(false)}
                  style={{ flex: 1, padding: '11px 0', border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff', color: '#374151', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                  Cancel
                </button>
                <button onClick={submitAppeal} disabled={!appealText.trim() || submittingAppeal}
                  style={{ flex: 2, padding: '11px 0', border: 'none', borderRadius: 10, background: !appealText.trim() || submittingAppeal ? '#e5e7eb' : NAVY, color: !appealText.trim() || submittingAppeal ? '#9ca3af' : '#fff', fontWeight: 700, cursor: !appealText.trim() || submittingAppeal ? 'not-allowed' : 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {submittingAppeal ? <Spin size="small" /> : <SendOutlined />}
                  {submittingAppeal ? 'Submitting…' : 'Submit Appeal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
