import { useEffect, useState } from 'react';
import { Table, Modal, Form, Select, InputNumber, Spin, message, Upload } from 'antd';
import {
  FileTextOutlined, PlusOutlined, CheckCircleOutlined, ClockCircleOutlined,
  ExclamationCircleOutlined, CheckOutlined, CloseCircleOutlined,
  UploadOutlined, FilePdfOutlined, FileImageOutlined, DeleteOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';

const NAVY  = '#1e3a5f';
const GREEN = '#22c55e';
const BLUE  = '#1d4ed8';
const AMBER = '#f59e0b';
const RED   = '#ef4444';

const STATUS_CONFIG = {
  draft:        { color: '#9ca3af', bg: '#f3f4f6', label: 'Draft' },
  submitted:    { color: AMBER,     bg: '#fef3c7', label: 'Submitted' },
  under_review: { color: BLUE,      bg: '#dbeafe', label: 'Under Review' },
  approved:     { color: '#059669', bg: '#d1fae5', label: 'Offer Ready' },
  rejected:     { color: RED,       bg: '#fee2e2', label: 'Rejected' },
  expired:      { color: '#9ca3af', bg: '#f3f4f6', label: 'Expired' },
  accepted:     { color: '#0369a1', bg: '#e0f2fe', label: 'Accepted' },
};

const RISK_OPTS = [
  { value: 'none',     label: 'None — No prior claims' },
  { value: 'low',      label: 'Low — Minor claims (under 5)' },
  { value: 'moderate', label: 'Moderate — Regular claims history' },
  { value: 'high',     label: 'High — Frequent or large claims' },
];

export default function InsuredQuotes() {
  const [quotes, setQuotes]         = useState([]);
  const [products, setProducts]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [detail, setDetail]         = useState(null);
  const [reqOpen, setReqOpen]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [accepting, setAccepting]   = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { user } = useAuth();

  const load = () => {
    setLoading(true);
    Promise.all([api.get('/quotes'), api.get('/products?withTiers=true')])
      .then(([q, p]) => {
        setQuotes(Array.isArray(q.data.quotes) ? q.data.quotes : []);
        setProducts(p.data.products || p.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openDetail = async (q) => {
    setDetail(q);
    try {
      const r = await api.get(`/quotes/${q._id}`);
      setDetail(r.data.quote);
    } catch (_) {}
  };

  const handleRequest = async () => {
    try {
      const vals = await form.validateFields();
      setSubmitting(true);
      const product = products.find(p => p._id === vals.productId);
      const payerId = product?.payer?._id || product?.payer;
      if (!payerId) {
        message.error('Selected product has no insurer assigned. Please contact support.');
        return;
      }
      await api.post('/quotes', {
        product:       vals.productId,
        payer:         payerId,
        insuredPerson: user?.linkedEntity?.entityId,
        memberCount:   1,
        riskFactors: {
          averageAge:    vals.averageAge,
          claimsHistory: vals.claimsHistory,
        },
        documents: uploadedDocs,
      });
      message.success('Application submitted. An underwriter will review it and come back with an offer within 1–3 business days.');
      setReqOpen(false);
      form.resetFields();
      setUploadedDocs([]);
      load();
    } catch (err) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccept = async (quote) => {
    setAccepting(true);
    try {
      const { data } = await api.post(`/quotes/${quote._id}/accept`);
      const enrollment = data.enrollment;
      const chapa = await api.post('/chapa/initialize', { enrollmentId: enrollment._id });
      const url = chapa.data.checkout_url || chapa.data.data?.checkout_url;
      if (url) {
        window.location.href = url;
      } else {
        message.success('Enrollment confirmed!');
        navigate('/insured/coverage');
      }
    } catch (err) {
      message.error(err?.response?.data?.message || 'Failed to accept offer. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  const pendingCount  = quotes.filter(q => ['submitted', 'under_review'].includes(q.status)).length;
  const approvedCount = quotes.filter(q => q.status === 'approved').length;
  const acceptedCount = quotes.filter(q => q.status === 'accepted').length;

  const btnSm = (bg, color = '#fff') => ({
    background: bg, border: 'none', borderRadius: 7,
    color, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
  });

  const columns = [
    {
      title: 'QUOTE #', key: 'num',
      render: (_, r) => <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#6b7280' }}>{r.quoteNumber}</span>,
    },
    {
      title: 'PRODUCT', key: 'prod',
      render: (_, r) => <span style={{ fontWeight: 600, color: '#111827' }}>{r.product?.name || '—'}</span>,
    },
    {
      title: 'STATUS', key: 'status',
      render: (_, r) => {
        const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.draft;
        return (
          <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
            {cfg.label}
          </span>
        );
      },
    },
    {
      title: 'PREMIUM (ETB)', key: 'premium', align: 'right',
      render: (_, r) => {
        const amt = r.finalPremium || r.scenarios?.[0]?.annualPremium;
        return amt
          ? <span style={{ fontWeight: 700, color: NAVY }}>{amt.toLocaleString()}</span>
          : <span style={{ color: '#9ca3af' }}>Pending</span>;
      },
    },
    {
      title: 'VALID UNTIL', key: 'valid',
      render: (_, r) => r.validUntil
        ? <span style={{ color: '#6b7280', fontSize: 13 }}>{new Date(r.validUntil).toLocaleDateString()}</span>
        : <span style={{ color: '#9ca3af' }}>—</span>,
    },
    {
      title: '', key: 'actions',
      render: (_, r) => (
        <div style={{ display: 'flex', gap: 6 }}>
          {r.status === 'approved'
            ? <button onClick={() => openDetail(r)} style={btnSm(GREEN)}>View Offer →</button>
            : <button onClick={() => openDetail(r)} style={btnSm(NAVY)}>View</button>
          }
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>My Applications</h1>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 13 }}>Request a personalised quote and track your applications through underwriting</p>
        </div>
        <button onClick={() => setReqOpen(true)}
          style={{ background: NAVY, border: 'none', borderRadius: 10, color: '#fff', padding: '11px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
          <PlusOutlined /> Request a Quote
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {[
          { label: 'PENDING REVIEW',    value: pendingCount,  color: AMBER,   icon: <ClockCircleOutlined />,  sub: 'Awaiting underwriter decision' },
          { label: 'APPROVED OFFERS',   value: approvedCount, color: '#059669', icon: <CheckCircleOutlined />, sub: approvedCount > 0 ? 'Ready to accept & pay' : 'No pending offers' },
          { label: 'ACCEPTED POLICIES', value: acceptedCount, color: BLUE,    icon: <FileTextOutlined />,     sub: 'Converted to active policy' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '20px 22px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, fontSize: 18, marginBottom: 12 }}>{s.icon}</div>
            <div style={{ color: '#6b7280', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{s.label}</div>
            <div style={{ color: '#111827', fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{s.value}</div>
            <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 6 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Approved offer banner ── */}
      {approvedCount > 0 && (
        <div style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)', borderRadius: 14, padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircleOutlined style={{ color: '#6ee7b7', fontSize: 20 }} />
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>You have an approved offer waiting!</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Review your personalised premium, then accept to activate your coverage.</div>
            </div>
          </div>
          <button
            onClick={() => { const aq = quotes.find(q => q.status === 'approved'); if (aq) openDetail(aq); }}
            style={{ background: GREEN, border: 'none', borderRadius: 9, color: '#fff', padding: '11px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            View & Accept Offer →
          </button>
        </div>
      )}

      {/* ── Empty state — how it works ── */}
      {!loading && quotes.length === 0 && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '32px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#111827', marginBottom: 24, textAlign: 'center' }}>How the Quote Process Works</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 28 }}>
            {[
              { step: '1', label: 'Apply',           desc: 'Select a coverage type and answer a few basic questions', color: BLUE },
              { step: '2', label: 'Underwriting',    desc: 'Our team assesses your profile and prepares a personalised offer', color: AMBER },
              { step: '3', label: 'Review Offer',    desc: 'See your approved premium and available tier options', color: '#059669' },
              { step: '4', label: 'Accept & Pay',    desc: 'Pay via Chapa to immediately activate your coverage', color: NAVY },
            ].map(s => (
              <div key={s.step} style={{ textAlign: 'center', padding: '12px 8px' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${s.color}15`, border: `2px solid ${s.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, fontWeight: 800, fontSize: 18, margin: '0 auto 12px' }}>{s.step}</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>{s.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center' }}>
            <button onClick={() => setReqOpen(true)}
              style={{ background: NAVY, border: 'none', borderRadius: 10, color: '#fff', padding: '12px 28px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
              Submit Your First Application
            </button>
          </div>
        </div>
      )}

      {/* ── Quote history table ── */}
      {(loading || quotes.length > 0) && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '16px 22px', borderBottom: '1px solid #f3f4f6' }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>Application History</span>
          </div>
          <style>{`
            .iq-table .ant-table                       { background: transparent !important; }
            .iq-table .ant-table-thead > tr > th       { background: #f9fafb !important; color: #6b7280 !important; border-bottom: 1px solid #e5e7eb !important; font-size: 11px; letter-spacing: .08em; font-weight: 700; padding: 10px 16px !important; }
            .iq-table .ant-table-tbody > tr > td       { border-bottom: 1px solid #f3f4f6 !important; background: transparent !important; padding: 14px 16px !important; }
            .iq-table .ant-table-tbody > tr:hover > td { background: #f9fafb !important; }
            .iq-table .ant-empty-description           { color: #9ca3af; }
          `}</style>
          <div className="iq-table" style={{ padding: '0 4px' }}>
            {loading
              ? <div style={{ padding: 60, textAlign: 'center' }}><Spin /></div>
              : <Table dataSource={quotes} columns={columns} rowKey="_id" pagination={{ pageSize: 8, style: { padding: '12px 20px' } }} size="small" />
            }
          </div>
        </div>
      )}

      {/* ── Quote Detail Overlay ── */}
      {detail && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setDetail(null); }}
        >
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 660, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>

            {/* Detail header */}
            <div style={{ padding: '20px 28px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18, color: '#111827' }}>Application Details</div>
                <div style={{ color: '#9ca3af', fontSize: 13, marginTop: 2, fontFamily: 'monospace' }}>{detail.quoteNumber}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {(() => {
                  const cfg = STATUS_CONFIG[detail.status] || STATUS_CONFIG.draft;
                  return <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>{cfg.label}</span>;
                })()}
                <button onClick={() => setDetail(null)} style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, color: '#6b7280', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>✕</button>
              </div>
            </div>

            {/* Detail body */}
            <div style={{ overflowY: 'auto', padding: '24px 28px', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Info grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Product',     value: detail.product?.name || '—' },
                  { label: 'Risk Score',  value: detail.riskFactors?.riskScore ? `${detail.riskFactors.riskScore} / 10` : 'Pending assessment' },
                  { label: 'Submitted',   value: detail.createdAt ? new Date(detail.createdAt).toLocaleDateString() : '—' },
                  { label: 'Valid Until', value: detail.validUntil ? new Date(detail.validUntil).toLocaleDateString() : '—' },
                ].map(f => (
                  <div key={f.label} style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ color: '#9ca3af', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{f.label}</div>
                    <div style={{ color: '#111827', fontWeight: 700, fontSize: 14 }}>{f.value}</div>
                  </div>
                ))}
              </div>

              {/* Under review */}
              {['submitted', 'under_review'].includes(detail.status) && (
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '16px 20px', display: 'flex', gap: 14 }}>
                  <ClockCircleOutlined style={{ color: BLUE, fontSize: 20, marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#1e40af' }}>Application Under Review</div>
                    <div style={{ fontSize: 13, color: '#3b82f6', marginTop: 4 }}>
                      {detail.status === 'submitted'
                        ? 'Your application has been received and is waiting to be assigned to an underwriter.'
                        : 'An underwriter is currently assessing your risk profile. You will be notified once a decision is made.'}
                    </div>
                  </div>
                </div>
              )}

              {/* Rejected */}
              {detail.status === 'rejected' && (
                <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 12, padding: '16px 20px', display: 'flex', gap: 14 }}>
                  <CloseCircleOutlined style={{ color: RED, fontSize: 20, marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#991b1b' }}>Application Not Approved</div>
                    <div style={{ fontSize: 13, color: '#b91c1c', marginTop: 4 }}>
                      This application was not approved. You may submit a new application for a different product or with updated information.
                    </div>
                  </div>
                </div>
              )}

              {/* Underwriter notes */}
              {detail.notes?.length > 0 && (
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 10 }}>Notes</div>
                  {detail.notes.map((n, i) => (
                    <div key={i} style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 9, padding: '12px 14px', marginBottom: 8 }}>
                      <div style={{ color: '#374151', fontSize: 13 }}>{n.content}</div>
                      {n.timestamp && (
                        <div style={{ color: '#9ca3af', fontSize: 11, marginTop: 4 }}>
                          {n.author ? `${n.author.firstName} ${n.author.lastName} · ` : ''}{new Date(n.timestamp).toLocaleString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* ── APPROVED OFFER ── */}
              {detail.status === 'approved' && (
                <>
                  <div style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)', borderRadius: 14, padding: '24px 28px', color: '#fff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                      <CheckCircleOutlined style={{ fontSize: 20, color: '#6ee7b7' }} />
                      <div style={{ fontWeight: 800, fontSize: 17 }}>Your Personalised Offer is Ready</div>
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Final Annual Premium</div>
                    <div style={{ fontSize: 38, fontWeight: 900, lineHeight: 1, marginBottom: 6 }}>
                      ETB {(detail.finalPremium || detail.scenarios?.[0]?.annualPremium || 0).toLocaleString()}
                    </div>
                    {detail.finalPremium && (
                      <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13 }}>
                        ≈ ETB {Math.round(detail.finalPremium / 12).toLocaleString()} / month
                      </div>
                    )}
                  </div>

                  {detail.scenarios?.length > 0 && (
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 10 }}>Coverage Options Included</div>
                      {detail.scenarios.map((s, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: i === 0 ? '#f0fdf4' : '#f9fafb', border: `1px solid ${i === 0 ? '#bbf7d0' : '#e5e7eb'}`, borderRadius: 10, marginBottom: 8 }}>
                          <div>
                            <div style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>{s.name || s.tier?.name || `Option ${i + 1}`}</div>
                            {s.notes && <div style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>{s.notes}</div>}
                          </div>
                          <div style={{ fontWeight: 800, fontSize: 16, color: i === 0 ? '#16a34a' : NAVY }}>
                            ETB {s.annualPremium?.toLocaleString()}/yr
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {detail.validUntil && (
                    <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 9, padding: '10px 14px', fontSize: 12, color: '#92400e', display: 'flex', gap: 8, alignItems: 'center' }}>
                      <ExclamationCircleOutlined />
                      <span>Offer valid until <strong>{new Date(detail.validUntil).toLocaleDateString()}</strong>. Accept before expiry to lock in this premium.</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer — accept button only on approved */}
            {detail.status === 'approved' && (
              <div style={{ padding: '16px 28px', borderTop: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', gap: 10 }}>
                <button onClick={() => setDetail(null)}
                  style={{ flex: 1, padding: '12px 0', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, color: '#6b7280', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                  Decide Later
                </button>
                <button
                  onClick={() => handleAccept(detail)}
                  disabled={accepting}
                  style={{ flex: 2, padding: '12px 0', background: accepting ? '#9ca3af' : GREEN, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 15, cursor: accepting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {accepting ? <Spin size="small" /> : <CheckOutlined />}
                  {accepting ? 'Processing...' : 'Accept Offer & Pay with Chapa'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Request a Quote Modal ── */}
      <Modal
        title={<span style={{ fontWeight: 700, fontSize: 16 }}>Request a Quote</span>}
        open={reqOpen}
        onCancel={() => { setReqOpen(false); form.resetFields(); }}
        onOk={handleRequest}
        okText="Submit Application"
        confirmLoading={submitting}
        okButtonProps={{ style: { background: NAVY, borderColor: NAVY } }}
        width={520}
        destroyOnClose
      >
        <p style={{ color: '#6b7280', fontSize: 13, margin: '0 0 20px' }}>
          An underwriter will review your application and come back with a personalised premium offer within 1–3 business days.
        </p>
        <Form form={form} layout="vertical" requiredMark={false}>
          <Form.Item name="productId" label="Coverage Type" rules={[{ required: true, message: 'Please select a coverage type' }]}>
            <Select placeholder="Select the type of coverage you need" size="large" loading={products.length === 0}>
              {products.map(p => (
                <Select.Option key={p._id} value={p._id}>
                  {p.name} ({p.productType?.toUpperCase()})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="averageAge" label="Your Age">
            <InputNumber min={18} max={80} style={{ width: '100%' }} size="large" placeholder="e.g. 34" />
          </Form.Item>
          <Form.Item name="claimsHistory" label="Previous Claims History" rules={[{ required: true, message: 'Please select your claims history' }]}>
            <Select size="large" placeholder="Select...">
              {RISK_OPTS.map(o => <Select.Option key={o.value} value={o.value}>{o.label}</Select.Option>)}
            </Select>
          </Form.Item>

          <Form.Item label="Supporting Documents" style={{ marginBottom: 0 }}
            extra="Optional — attach medical reports, ID copy, or any relevant documents (PDF, JPG, PNG · max 5 MB each)">
            <Upload
              customRequest={async ({ file, onSuccess, onError, onProgress }) => {
                const fd = new FormData();
                fd.append('file', file);
                try {
                  const res = await api.post('/upload', fd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    onUploadProgress: e => onProgress({ percent: Math.round((e.loaded / e.total) * 100) }),
                  });
                  onSuccess(res.data);
                  setUploadedDocs(prev => [...prev, res.data]);
                } catch (err) {
                  onError(err);
                  message.error(err?.response?.data?.message || 'Upload failed');
                }
              }}
              onRemove={file => {
                setUploadedDocs(prev => prev.filter(d => d.filename !== file.response?.filename));
              }}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              multiple
              listType="text"
            >
              <button type="button" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: 8, color: '#374151', fontSize: 13, cursor: 'pointer', width: '100%', justifyContent: 'center' }}>
                <UploadOutlined /> Click to attach files
              </button>
            </Upload>
          </Form.Item>
        </Form>
        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 9, padding: '10px 14px', fontSize: 12, color: '#0c4a6e', marginTop: 16 }}>
          Your information is used only for risk assessment and is kept strictly confidential.
        </div>
      </Modal>
    </div>
  );
}
