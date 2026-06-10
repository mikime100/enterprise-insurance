import { useEffect, useState } from 'react';
import { Table, Space, Modal, Spin } from 'antd';
import { PlusOutlined, CheckCircleOutlined, EyeOutlined, CloseCircleOutlined, FileImageOutlined } from '@ant-design/icons';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';

const D = {
  bg:     '#f5f7fa',
  card:   '#ffffff',
  card2:  '#f9fafb',
  border: '#e5e7eb',
  text:   '#111827',
  sec:    '#6b7280',
  link:   '#1e3a5f',
  green:  '#22c55e',
  blue:   '#1d4ed8',
  red:    '#ef4444',
  amber:  '#f59e0b',
};

const STATUS_STYLE = {
  active:          { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)'  },
  approved:        { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)'  },
  pending:         { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)' },
  pending_renewal: { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.25)' },
  expired:         { color: '#8b949e', bg: 'rgba(139,148,158,0.1)', border: 'rgba(139,148,158,0.25)' },
  cancelled:       { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)'  },
  suspended:       { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.expired;
  return (
    <span style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

const FILTER_TABS = [
  { key: 'all',            label: 'All' },
  { key: 'proof_review',   label: '🔍 Proof Review' },
  { key: 'active',         label: 'Active' },
  { key: 'pending_renewal',label: 'Renewals' },
  { key: 'expired',        label: 'Expired' },
  { key: 'cancelled',      label: 'Cancelled' },
];

export default function PayerEnrollments() {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [detail, setDetail]           = useState(null);
  const [search, setSearch]           = useState('');
  const [activeTab, setActiveTab]     = useState('all');
  const { user } = useAuth();

  const [reviewNote, setReviewNote]   = useState('');
  const [reviewing, setReviewing]     = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/enrollments')
      .then(r => setEnrollments(Array.isArray(r.data.enrollments) ? r.data.enrollments : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openDetail = (e) => api.get(`/enrollments/${e._id}`).then(r => { setDetail(r.data.enrollment); setReviewNote(''); });
  const activate   = async (e) => { await api.patch(`/enrollments/${e._id}/status`, { status: 'active', notes: 'Activated by payer admin' }); load(); };

  const reviewProof = async (action) => {
    if (!detail) return;
    setReviewing(true);
    try {
      await api.post(`/enrollments/${detail._id}/review-payment-proof`, { action, reviewNote });
      load();
      setDetail(null);
    } catch (err) {
      console.error(err);
    } finally { setReviewing(false); }
  };

  const counts = {
    active:     enrollments.filter(e => e.status === 'active').length,
    renewals:   enrollments.filter(e => e.status === 'pending_renewal').length,
    proofReview:enrollments.filter(e => e.paymentVerification?.status === 'pending' && e.paymentVerification?.receiptUrl).length,
    totalPremium: enrollments.reduce((sum, e) => sum + (e.premium?.amount || 0), 0),
  };

  const filtered = enrollments.filter(e => {
    if (activeTab === 'proof_review') return e.paymentVerification?.status === 'pending' && e.paymentVerification?.receiptUrl;
    if (activeTab !== 'all' && e.status !== activeTab) return false;
    if (search) {
      const s = search.toLowerCase();
      const name = (e.institution?.name || 'Individual').toLowerCase();
      const num  = (e.enrollmentNumber || '').toLowerCase();
      if (!name.includes(s) && !num.includes(s)) return false;
    }
    return true;
  });

  const fmtPremium = (v) => {
    if (!v) return '—';
    if (v >= 1_000_000_000) return `ETB ${(v / 1_000_000_000).toFixed(2)}B`;
    if (v >= 1_000_000)     return `ETB ${(v / 1_000_000).toFixed(2)}M`;
    return `ETB ${v.toLocaleString()}`;
  };

  const columns = [
    {
      title: 'POLICY #', key: 'num',
      render: (_, r) => <span style={{ color: D.sec, fontFamily: 'monospace', fontSize: 13 }}>{r.enrollmentNumber}</span>,
    },
    {
      title: 'INSTITUTION', key: 'inst',
      render: (_, r) => (
        <div>
          <div style={{ color: D.text, fontWeight: 600, fontSize: 14 }}>{r.institution?.name || 'Individual'}</div>
          {r.tier && <div style={{ color: D.sec, fontSize: 11, marginTop: 2 }}>{r.tier.name}</div>}
        </div>
      ),
    },
    {
      title: 'EFFECTIVE', key: 'eff',
      render: (_, r) => <span style={{ color: D.sec, fontSize: 13 }}>{r.startDate ? new Date(r.startDate).toLocaleDateString() : '—'}</span>,
    },
    {
      title: 'RENEWAL', key: 'ren',
      render: (_, r) => <span style={{ color: D.sec, fontSize: 13 }}>{r.endDate ? new Date(r.endDate).toLocaleDateString() : '—'}</span>,
    },
    {
      title: 'ANNUAL PREMIUM', key: 'prem', align: 'right',
      render: (_, r) => (
        <span style={{ color: D.text, fontWeight: 600, fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>
          ETB {(r.premium?.amount || 0).toLocaleString()}
        </span>
      ),
    },
    {
      title: 'STATUS', key: 'status', width: 150,
      render: (_, r) => <StatusBadge status={r.status} />,
    },
    {
      title: '', key: 'actions', width: 120,
      render: (_, r) => (
        <Space size={6}>
          <button onClick={() => openDetail(r)} style={iconBtn}>
            <EyeOutlined />
          </button>
          {r.paymentVerification?.status === 'pending' && r.paymentVerification?.receiptUrl && (
            <button onClick={() => openDetail(r)} style={{ ...iconBtn, color: D.amber, borderColor: D.amber, background: '#fffbeb' }} title="Receipt awaiting review">
              <FileImageOutlined />
            </button>
          )}
          {['payer_admin', 'superadmin'].includes(user?.role) && r.status === 'pending' && !r.paymentVerification?.receiptUrl && (
            <button onClick={() => activate(r)} style={{ ...iconBtn, color: D.green }}>
              <CheckCircleOutlined />
            </button>
          )}
        </Space>
      ),
    },
  ];

  const iconBtn = {
    background: 'rgba(255,255,255,0.06)',
    border: `1px solid ${D.border}`,
    borderRadius: 7,
    color: D.sec,
    padding: '5px 9px',
    cursor: 'pointer',
    fontSize: 13,
    display: 'inline-flex',
    alignItems: 'center',
  };

  return (
    <div style={{ background: D.bg, minHeight: '100%', margin: -24, padding: 28 }}>
      <style>{`
        .pol-table .ant-table                              { background: transparent !important; }
        .pol-table .ant-table-thead > tr > th             { background: #f9fafb !important; color: #6b7280 !important; border-bottom: 1px solid #e5e7eb !important; font-size: 11px; letter-spacing: .08em; font-weight: 700; padding: 10px 16px !important; }
        .pol-table .ant-table-tbody > tr > td             { border-bottom: 1px solid #f3f4f6 !important; background: transparent !important; padding: 14px 16px !important; }
        .pol-table .ant-table-tbody > tr:hover > td       { background: #f9fafb !important; }
        .pol-table .ant-pagination .ant-pagination-item   { background: #fff; border-color: #e5e7eb; }
        .pol-table .ant-pagination .ant-pagination-item a { color: #374151; }
        .pol-table .ant-pagination .ant-pagination-item-active          { background: ${D.blue}; border-color: ${D.blue}; }
        .pol-table .ant-pagination .ant-pagination-item-active a        { color: #fff; }
        .pol-table .ant-pagination .ant-pagination-prev button,
        .pol-table .ant-pagination .ant-pagination-next button          { color: #6b7280; background: #fff; border-color: #e5e7eb; }
        .pol-table .ant-empty-description { color: #6b7280; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ color: D.text, fontWeight: 800, fontSize: 22, margin: 0 }}>Institutional Policies</h1>
          <p style={{ color: D.sec, fontSize: 13, margin: '4px 0 0' }}>Active directory and historical archive of enterprise risk portfolios.</p>
        </div>
        {['payer_admin', 'superadmin'].includes(user?.role) && (
          <button style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 10, color: D.text, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <PlusOutlined /> New Policy Draft
          </button>
        )}
      </div>

      {/* ── 3 stat cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: 16, marginBottom: 24 }}>
        {[
          {
            label: 'ACTIVE VOLUME',
            value: counts.active,
            sub: 'Currently active policies',
            color: D.link,
            icon: '🏢',
          },
          {
            label: 'TOTAL PREMIUM (ETB)',
            value: fmtPremium(counts.totalPremium),
            sub: 'Current fiscal year',
            color: D.text,
            icon: '💰',
          },
          {
            label: 'PROOF REVIEW',
            value: counts.proofReview,
            sub: counts.proofReview > 0 ? 'Receipts awaiting approval' : 'No receipts pending',
            color: counts.proofReview > 0 ? D.amber : D.green,
            icon: '🧾',
            onClick: counts.proofReview > 0 ? () => setActiveTab('proof_review') : undefined,
          },
          {
            label: 'PENDING RENEWALS',
            value: counts.renewals,
            sub: counts.renewals > 0 ? 'Requires audit' : 'All renewals current',
            color: counts.renewals > 0 ? D.amber : D.green,
            icon: '📅',
          },
        ].map(s => (
          <div key={s.label} onClick={s.onClick} style={{ background: D.card, border: `1px solid ${s.onClick ? D.amber : D.border}`, borderRadius: 12, padding: '24px 28px', position: 'relative', overflow: 'hidden', cursor: s.onClick ? 'pointer' : 'default' }}>
            <div style={{ position: 'absolute', right: 20, top: 20, fontSize: 30, opacity: 0.06 }}>{s.icon}</div>
            <div style={{ color: D.sec, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 12 }}>{s.label}</div>
            <div style={{ fontSize: 38, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ color: s.color !== D.text && s.value > 0 ? s.color : D.sec, fontSize: 12, marginTop: 8, fontWeight: s.value > 0 ? 600 : 400 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Table card ── */}
      <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, overflow: 'hidden' }}>

        {/* Search + filter bar */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${D.border}`, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: D.sec, fontSize: 14 }}>🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search Institution or Policy #..."
              style={{ width: '100%', background: D.card2, border: `1px solid ${D.border}`, borderRadius: 8, color: D.text, padding: '8px 12px 8px 36px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 2, background: D.card2, borderRadius: 8, padding: 3, border: `1px solid ${D.border}` }}>
            {FILTER_TABS.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                style={{ background: activeTab === t.key ? D.blue : 'transparent', border: 'none', borderRadius: 6, color: activeTab === t.key ? '#fff' : D.sec, padding: '6px 14px', fontSize: 12, fontWeight: activeTab === t.key ? 700 : 400, cursor: 'pointer', transition: 'all 0.15s' }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="pol-table" style={{ padding: '0 4px' }}>
          {loading
            ? <div style={{ padding: 60, textAlign: 'center' }}><Spin /></div>
            : <Table dataSource={filtered} columns={columns} rowKey="_id" pagination={{ pageSize: 10, style: { padding: '12px 20px' }, showTotal: (total, range) => <span style={{ color: D.sec }}>Showing {range[0]}–{range[1]} of {total} records</span> }} size="small" />
          }
        </div>
      </div>

      {/* ── Detail Modal ── */}
      <Modal
        title={null}
        open={!!detail}
        onCancel={() => setDetail(null)}
        footer={null}
        width={980}
        styles={{ content: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 0 } }}
      >
        {detail && (() => {
          const isInstitutional = !!detail.institution;
          const person          = detail.insuredPersons?.[0];
          const appData         = detail.quote?.applicationData || {};
          const appEntries      = Object.entries(appData).filter(([, v]) => v != null && v !== '');
          const pv              = detail.paymentVerification;
          const hasPendingProof = pv?.receiptUrl && pv?.status === 'pending';
          const canReview       = ['payer_admin', 'superadmin'].includes(user?.role) && detail.status === 'pending';

          const baseFields = [
            { label: 'Product',         value: detail.product?.name || '—' },
            { label: 'Tier',            value: detail.tier?.name || '—' },
            { label: 'Annual Premium',  value: `${(detail.premium?.amount || 0).toLocaleString()} ETB` },
            { label: 'Coverage Period', value: `${new Date(detail.startDate).toLocaleDateString()} – ${new Date(detail.endDate).toLocaleDateString()}` },
          ];
          const extraFields = isInstitutional ? [
            { label: 'Employer Share', value: detail.premium?.employerShare ? `${detail.premium.employerShare.toLocaleString()} ETB` : '—' },
            { label: 'Employee Share', value: detail.premium?.employeeShare ? `${detail.premium.employeeShare.toLocaleString()} ETB` : '—' },
          ] : person ? [
            { label: 'Primary Insured', value: `${person.firstName || ''} ${person.lastName || ''}`.trim() || '—' },
            { label: 'Date of Birth',   value: person.dateOfBirth ? new Date(person.dateOfBirth).toLocaleDateString() : '—' },
            { label: 'Email',           value: person.email || '—' },
            { label: 'National ID',     value: person.nationalId || '—' },
          ] : [];
          const fields = [...baseFields, ...extraFields];

          return (
            <div>
              {/* Header */}
              <div style={{ padding: '18px 24px', borderBottom: `1px solid ${D.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ color: D.text, fontWeight: 800, margin: 0, fontSize: 18 }}>{detail.institution?.name || 'Individual Policy'}</h3>
                  <span style={{ color: D.sec, fontSize: 13 }}>{detail.enrollmentNumber}</span>
                </div>
                <StatusBadge status={detail.status} />
              </div>

              {/* Two-column body */}
              <div style={{ display: 'flex', gap: 0, alignItems: 'flex-start' }}>

                {/* LEFT — policy info */}
                <div style={{ flex: '1 1 0', padding: '20px 20px 20px 24px', borderRight: `1px solid ${D.border}`, minWidth: 0 }}>

                  {/* Policy fields — 3-column grid */}
                  <div style={{ color: D.sec, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 10 }}>POLICY DETAILS</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 18 }}>
                    {fields.map(f => (
                      <div key={f.label} style={{ background: D.card2, borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ color: D.sec, fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', marginBottom: 4 }}>{f.label.toUpperCase()}</div>
                        <div style={{ color: D.text, fontWeight: 600, fontSize: 13 }}>{f.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Application data */}
                  {appEntries.length > 0 && (
                    <>
                      <div style={{ color: D.sec, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 10 }}>
                        APPLICATION DATA{detail.quote?.quoteNumber ? ` — ${detail.quote.quoteNumber}` : ''}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                        {appEntries.map(([key, val]) => (
                          <div key={key} style={{ background: '#f0f6ff', borderRadius: 8, padding: '10px 12px' }}>
                            <div style={{ color: '#1e40af', fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', marginBottom: 4 }}>
                              {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim().toUpperCase()}
                            </div>
                            <div style={{ color: D.text, fontWeight: 600, fontSize: 13 }}>
                              {typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* RIGHT — members + payment action */}
                <div style={{ flex: '0 0 300px', padding: '20px 24px 20px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

                  {/* Insured members */}
                  {detail.insuredPersons?.length > 0 && (
                    <div>
                      <div style={{ color: D.sec, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 10 }}>
                        INSURED MEMBERS ({detail.insuredPersons.length})
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 200, overflowY: 'auto' }}>
                        {detail.insuredPersons.map((p, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: D.card2, borderRadius: 8, padding: '9px 12px' }}>
                            <div style={{ width: 30, height: 30, borderRadius: '50%', background: D.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 12, flexShrink: 0 }}>
                              {p.firstName?.[0]}{p.lastName?.[0]}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ color: D.text, fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.firstName} {p.lastName}</div>
                              <div style={{ color: D.sec, fontSize: 11 }}>{p.dependents?.length || 0} dependent{p.dependents?.length !== 1 ? 's' : ''}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Payment proof / activate */}
                  {canReview && (
                    hasPendingProof ? (
                      <div style={{ border: '1.5px solid #fde68a', borderRadius: 12, overflow: 'hidden' }}>
                        <div style={{ background: '#d97706', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <FileImageOutlined style={{ color: '#fff' }} />
                          <div style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>Payment Receipt</div>
                        </div>
                        <div style={{ padding: 12, background: '#fffbeb', display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <a href={pv.receiptUrl} target="_blank" rel="noreferrer">
                            <img src={pv.receiptUrl} alt="Payment receipt"
                              style={{ width: '100%', maxHeight: 160, objectFit: 'contain', borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'block' }} />
                          </a>
                          {pv.note && (
                            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 7, padding: '8px 10px' }}>
                              <div style={{ color: '#6b7280', fontSize: 10, fontWeight: 700, marginBottom: 3 }}>APPLICANT NOTE</div>
                              <div style={{ color: '#374151', fontSize: 12 }}>{pv.note}</div>
                            </div>
                          )}
                          <div style={{ color: '#6b7280', fontSize: 11 }}>Submitted: {new Date(pv.submittedAt).toLocaleString()}</div>
                          <textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)}
                            placeholder="Review note (required if rejecting)..."
                            rows={2}
                            style={{ width: '100%', padding: '7px 9px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 12, resize: 'vertical', boxSizing: 'border-box', outline: 'none' }} />
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => reviewProof('reject')} disabled={reviewing}
                              style={{ flex: 1, padding: '9px 0', background: '#fff', border: '1.5px solid #ef4444', borderRadius: 8, color: '#ef4444', fontWeight: 700, fontSize: 12, cursor: reviewing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: reviewing ? 0.6 : 1 }}>
                              <CloseCircleOutlined /> Reject
                            </button>
                            <button onClick={() => reviewProof('approve')} disabled={reviewing}
                              style={{ flex: 2, padding: '9px 0', background: D.green, border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 12, cursor: reviewing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: reviewing ? 0.6 : 1 }}>
                              <CheckCircleOutlined /> Approve &amp; Activate
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => { activate(detail); setDetail(null); }}
                        style={{ width: '100%', padding: 13, background: D.green, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                        ✓ Activate Policy
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
