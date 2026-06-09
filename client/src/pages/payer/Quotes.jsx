import { useEffect, useState } from 'react';
import { Spin } from 'antd';
import {
  CheckOutlined, CloseOutlined, WarningOutlined, CheckCircleOutlined,
  BankOutlined, DownloadOutlined, EyeOutlined, LoadingOutlined,
  FileTextOutlined, FileImageOutlined, FilePdfOutlined, FileOutlined,
} from '@ant-design/icons';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';

const D = {
  bg: '#f5f7fa', card: '#ffffff', card2: '#f9fafb',
  border: '#e5e7eb', text: '#111827', sec: '#6b7280',
  link: '#1e3a5f', green: '#22c55e', blue: '#1d4ed8',
  red: '#ef4444', amber: '#f59e0b', navy: '#1e3a5f',
};

const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Derive the server origin (e.g. http://localhost:5000) so relative upload
// URLs like '/uploads/file.pdf' resolve to the backend, not the Vite dev server.
const SERVER_ORIGIN = (() => {
  try { return new URL(API_BASE).origin; } catch { return ''; }
})();

const STATUS_DOT = {
  draft: '#8b949e', submitted: '#f59e0b', under_review: '#3b82f6',
  approved: '#22c55e', rejected: '#ef4444', expired: '#6b7280',
};

const RISK_LABEL = s => s >= 7 ? ['HIGH', D.red] : s >= 4 ? ['MED', D.amber] : ['LOW', D.green];

// Derive a viewable URL from whatever doc object the server returns.
// Upload route returns url: '/uploads/filename' — prepend server origin.
function docUrl(doc) {
  if (!doc) return '#';
  const raw = doc.url || doc.path || '';
  if (!raw) return '#';
  if (raw.startsWith('http')) return raw;
  return SERVER_ORIGIN + (raw.startsWith('/') ? raw : '/' + raw);
}

function fileIcon(mimeType, name = '') {
  if (mimeType?.includes('pdf') || name?.endsWith('.pdf')) return <FilePdfOutlined style={{ color: '#ef4444' }} />;
  if (mimeType?.includes('image')) return <FileImageOutlined style={{ color: '#0891b2' }} />;
  if (mimeType?.includes('word') || name?.endsWith('.doc') || name?.endsWith('.docx')) return <FileTextOutlined style={{ color: '#2563eb' }} />;
  return <FileOutlined style={{ color: '#6b7280' }} />;
}

function RiskBar({ score = 5 }) {
  const [label, color] = RISK_LABEL(score);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 70, height: 5, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${(score / 10) * 100}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: '0.05em' }}>{label}</span>
    </div>
  );
}

// ── Application data renderer ────────────────────────────────────────────────

const APP_FIELD_LABELS = {
  purpose: 'Purpose of Coverage', dateOfBirth: 'Date of Birth', gender: 'Gender',
  occupation: 'Occupation', incomeRange: 'Income Range', maritalStatus: 'Marital Status',
  dependentCount: 'Dependents to Cover', phone: 'Phone',
  // health
  height: 'Height (cm)', weight: 'Weight (kg)', smoker: 'Smoking Status',
  alcoholUse: 'Alcohol Use', familyHistory: 'Family History', surgicalHistory: 'Surgical History',
  chronicConditions: 'Pre-existing Conditions', currentMedications: 'Current Medications',
  // auto
  vehicleMake: 'Vehicle Make', vehicleModel: 'Model', vehicleYear: 'Year',
  engineCC: 'Engine (CC)', transmission: 'Transmission', plateOrVIN: 'Plate / VIN',
  vehicleUsage: 'Vehicle Usage', yearsLicensed: 'Years Licensed',
  atFaultAccidents: 'At-fault Accidents (3 yrs)', currentMileage: 'Current Mileage',
  // life
  desiredSumInsured: 'Desired Sum Insured (ETB)', beneficiaryName: 'Beneficiary',
  beneficiaryRelation: 'Beneficiary Relation', occupationRisk: 'Occupation Risk',
  annualIncome: 'Annual Income (ETB)', highRiskActivities: 'High-risk Activities',
  // home
  propertyType: 'Property Type', constructionYear: 'Year Built', floorAreaSqm: 'Floor Area (m²)',
  propertyCity: 'City / Location', ownershipType: 'Ownership', previousIncidents: 'Prior Incidents',
  securityFeatures: 'Security Features',
  // travel
  destination: 'Destination', departureDate: 'Departure', returnDate: 'Return',
  tripPurpose: 'Trip Purpose', estimatedTripCost: 'Estimated Cost (ETB)', hasMedicalCondition: 'Medical Conditions',
  // business
  businessType: 'Business Type', yearsInOperation: 'Years in Operation', numEmployees: 'Employees',
  annualRevenueBand: 'Annual Revenue', premisesType: 'Premises', previousBusinessClaims: 'Prior Claims',
  // risk
  claimsHistory: 'Claims History', yearsInsured: 'Years Insured', additionalNotes: 'Applicant Notes',
};

const SKIP_KEYS = ['productId', 'productType'];

function AppDataSection({ data }) {
  if (!data || typeof data !== 'object') return null;

  const entries = Object.entries(data).filter(([k, v]) => {
    if (SKIP_KEYS.includes(k)) return false;
    if (v === '' || v === null || v === undefined || v === false) return false;
    if (Array.isArray(v) && v.length === 0) return false;
    return true;
  });

  if (entries.length === 0) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
      {entries.map(([key, val]) => {
        const label = APP_FIELD_LABELS[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
        const display = Array.isArray(val) ? val.join(', ') : String(val);
        if (!display || display === 'false') return null;
        return (
          <div key={key} style={{ gridColumn: key === 'additionalNotes' || key === 'chronicConditions' ? 'span 2' : 'span 1' }}>
            <div style={{ color: D.sec, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
            <div style={{ color: D.text, fontSize: 13, fontWeight: 500, lineHeight: 1.4 }}>{display}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── Reject confirmation overlay ──────────────────────────────────────────────

function RejectOverlay({ quote, onClose, onConfirmed }) {
  const [reason, setReason]   = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await api.patch(`/quotes/${quote._id}/status`, {
        status: 'rejected',
        finalPremium: 0,
        note: reason || 'Application not approved.',
      });
      onConfirmed();
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(3px)' }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 460, boxShadow: '0 24px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
        <div style={{ background: '#fef2f2', padding: '18px 22px', borderBottom: '1px solid #fecaca', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 800, color: '#991b1b', fontSize: 16 }}>Reject Application</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 16, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#991b1b' }}>
            This will permanently reject <strong>{quote?.quoteNumber}</strong> and notify the applicant. This action cannot be undone.
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Reason for Rejection <span style={{ color: D.red }}>*</span></div>
            <select
              value={reason} onChange={e => setReason(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 9, fontSize: 13, background: '#fff', marginBottom: 8 }}>
              <option value="">Select a reason…</option>
              <option>High risk score — does not meet underwriting criteria</option>
              <option>Incomplete or missing documentation</option>
              <option>Pre-existing condition exclusion applies</option>
              <option>Applicant exceeds maximum eligible age</option>
              <option>Application information inconsistent or unverifiable</option>
              <option>Product not available in applicant's region</option>
              <option>Other — see underwriter note</option>
            </select>
            <textarea
              value={reason.startsWith('Other') ? reason.replace('Other — see underwriter note', '') : ''}
              onChange={e => setReason('Other: ' + e.target.value)}
              placeholder="Additional details (optional)…"
              rows={3}
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 9, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>
        </div>
        <div style={{ padding: '14px 22px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px 0', border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff', color: '#374151', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={submit} disabled={!reason || loading} style={{
            flex: 2, padding: '11px 0', border: 'none', borderRadius: 10,
            background: reason && !loading ? D.red : '#e5e7eb',
            color: reason ? '#fff' : '#9ca3af', fontWeight: 700, fontSize: 14,
            cursor: reason && !loading ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {loading ? <LoadingOutlined /> : <CloseOutlined />}
            {loading ? 'Rejecting…' : 'Confirm Rejection'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PayerQuotes() {
  const [quotes, setQuotes]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [detail, setDetail]             = useState(null);
  const [rationale, setRationale]       = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [rejectOpen, setRejectOpen]     = useState(false);
  const [sendingOffer, setSendingOffer] = useState(false);

  // Offer builder form state
  const [offer, setOffer] = useState({
    tierId: '', premium: '', validUntil: '', conditions: '', noteToClient: '',
  });
  const setO = (k, v) => setOffer(o => ({ ...o, [k]: v }));

  const { user } = useAuth();

  const load = () => {
    setLoading(true);
    api.get('/quotes')
      .then(r => setQuotes(Array.isArray(r.data.quotes) ? r.data.quotes : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openDetail = async (q) => {
    setRationale('');
    setDetail({ ...q });
    // Pre-fill offer builder from existing data
    const defaultValidUntil = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    setOffer({
      tierId: q.riskFactors?.selectedTierId || '',
      premium: q.finalPremium || q.scenarios?.[0]?.annualPremium || '',
      validUntil: q.validUntil ? new Date(q.validUntil).toISOString().split('T')[0] : defaultValidUntil,
      conditions: '',
      noteToClient: '',
    });
    try {
      const r = await api.get(`/quotes/${q._id}`);
      const full = r.data.quote;
      setDetail(full);
      setOffer(prev => ({
        ...prev,
        premium: full.finalPremium || full.scenarios?.[0]?.annualPremium || prev.premium,
        tierId:  full.riskFactors?.selectedTierId || prev.tierId,
        validUntil: full.validUntil ? new Date(full.validUntil).toISOString().split('T')[0] : prev.validUntil,
      }));
    } catch (_) {}
  };

  const takeOwnership = async (q) => {
    await api.patch(`/quotes/${q._id}/underwrite`, { note: 'Underwriter assigned and review started.' });
    load();
    openDetail(q);
  };

  const sendOffer = async () => {
    if (!offer.premium || parseFloat(offer.premium) <= 0) {
      alert('Please enter the final annual premium before sending the offer.');
      return;
    }
    setSendingOffer(true);
    try {
      await api.patch(`/quotes/${detail._id}/status`, {
        status: 'approved',
        finalPremium: parseFloat(offer.premium),
        note: offer.noteToClient
          ? `${offer.noteToClient}${offer.conditions ? '\n\nConditions: ' + offer.conditions : ''}`
          : (offer.conditions ? 'Conditions: ' + offer.conditions : rationale || 'Application approved.'),
        validUntil: offer.validUntil || undefined,
        selectedTierId: offer.tierId || undefined,
      });
      setDetail(null);
      load();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || 'Failed to send offer. Please try again.');
    } finally { setSendingOffer(false); }
  };

  const handleRejected = () => {
    setRejectOpen(false);
    setDetail(null);
    load();
  };

  const counts = {
    pending:  quotes.filter(q => q.status === 'submitted').length,
    inReview: quotes.filter(q => q.status === 'under_review').length,
    approved: quotes.filter(q => q.status === 'approved').length,
    rejected: quotes.filter(q => q.status === 'rejected').length,
  };

  const filtered = filterStatus === 'all' ? quotes : quotes.filter(q => q.status === filterStatus);
  const clientName = r => r.institution?.name || `${r.insuredPerson?.firstName ?? ''} ${r.insuredPerson?.lastName ?? ''}`.trim() || 'Unknown Applicant';
  const daysOld = r => r.createdAt ? Math.floor((Date.now() - new Date(r.createdAt)) / 86400000) : 0;

  const btnStyle = (bg, color = '#fff', border = 'none') => ({
    background: bg, border, borderRadius: 6, color, padding: '5px 11px',
    fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
  });

  const tiers = detail?.product?.tiers || [];
  const selectedTier = tiers.find(t => t._id === offer.tierId);
  const premiumNum = parseFloat(offer.premium) || 0;

  return (
    <div style={{ background: D.bg, minHeight: '100%', margin: -24, padding: 28 }}>
      <style>{`
        .uw-table .ant-table                              { background: transparent !important; }
        .uw-table .ant-table-thead > tr > th             { background: #f9fafb !important; color: #6b7280 !important; border-bottom: 1px solid #e5e7eb !important; font-size: 11px; letter-spacing: .08em; font-weight: 700; padding: 10px 16px !important; }
        .uw-table .ant-table-tbody > tr > td             { border-bottom: 1px solid #f3f4f6 !important; background: transparent !important; padding: 14px 16px !important; }
        .uw-table .ant-table-tbody > tr:hover > td       { background: #f9fafb !important; }
        .uw-table .ant-empty-description                 { color: #6b7280; }
        .uw-table .ant-pagination                        { padding: 12px 20px !important; }
      `}</style>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ color: D.text, fontWeight: 800, fontSize: 22, margin: 0 }}>Underwriting Portal</h1>
          <p style={{ color: D.sec, fontSize: 13, margin: '4px 0 0' }}>Review applications and issue personalised offers to applicants.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Chip color={D.green}  bg="rgba(34,197,94,0.1)"  border="rgba(34,197,94,0.25)">SLA: 98%</Chip>
          <Chip color={D.text}   bg="#f3f4f6"              border={D.border}>Queue: {counts.pending + counts.inReview}</Chip>
          {counts.inReview > 0 && <Chip color={D.red} bg="rgba(239,68,68,0.1)" border="rgba(239,68,68,0.25)">⚠ In Review: {counts.inReview}</Chip>}
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'PENDING',   value: counts.pending,  color: D.amber, sub: 'awaiting assignment' },
          { label: 'IN REVIEW', value: counts.inReview, color: D.blue,  sub: 'active underwriting' },
          { label: 'APPROVED',  value: counts.approved, color: D.green, sub: 'offers sent to clients' },
          { label: 'REJECTED',  value: counts.rejected, color: D.red,   sub: 'not approved' },
        ].map(s => (
          <div key={s.label} style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: '20px 22px' }}>
            <div style={{ color: D.sec, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ color: D.sec, fontSize: 12, marginTop: 6 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Queue table */}
      <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${D.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <span style={{ color: D.text, fontWeight: 700, fontSize: 15 }}>Applications Queue</span>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            style={{ background: D.card2, border: `1px solid ${D.border}`, borderRadius: 8, color: D.text, padding: '7px 12px', fontSize: 12, cursor: 'pointer', outline: 'none' }}>
            <option value="all">All</option>
            <option value="submitted">Pending</option>
            <option value="under_review">In Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: 60, textAlign: 'center' }}><Spin /></div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['', 'APPLICANT', 'PRODUCT', 'QUOTE #', 'DAYS', 'STATUS', 'RISK', ''].map((h, i) => (
                    <th key={i} style={{ padding: '10px 16px', color: '#6b7280', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', borderBottom: `1px solid ${D.border}`, textAlign: i >= 5 ? 'center' : 'left', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const d = daysOld(r);
                  const score = r.riskFactors?.riskScore || 3;
                  const [rlabel, rcolor] = RISK_LABEL(score);
                  return (
                    <tr key={r._id} style={{ borderBottom: `1px solid #f3f4f6` }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <td style={{ padding: '12px 16px', width: 32 }}>
                        {score >= 7 ? <WarningOutlined style={{ color: D.red, fontSize: 15 }} /> : <div style={{ width: 10, height: 10, borderRadius: '50%', background: D.border }} />}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 700, color: D.text, fontSize: 14 }}>{clientName(r)}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ color: D.sec, fontSize: 13 }}>{r.product?.name || '—'}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#9ca3af' }}>{r.quoteNumber}</span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{ color: d > 14 ? D.red : D.text, fontWeight: 700, fontSize: 13 }}>{d}d</span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600 }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS_DOT[r.status] || D.sec, display: 'inline-block' }} />
                          <span style={{ textTransform: 'capitalize', color: D.text }}>{r.status?.replace(/_/g, ' ')}</span>
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{ background: `${rcolor}18`, color: rcolor, borderRadius: 20, padding: '2px 9px', fontSize: 11, fontWeight: 700 }}>{rlabel}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          {['underwriter','payer_admin','superadmin'].includes(user?.role) && r.status === 'submitted' && (
                            <button onClick={() => takeOwnership(r)} style={btnStyle(D.blue)}>Take</button>
                          )}
                          <button onClick={() => openDetail(r)} style={btnStyle(D.navy)}>
                            {r.status === 'under_review' ? 'Review →' : 'View'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>No applications found.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Quote Detail Overlay ──────────────────────────────────────────────── */}
      {detail && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px 16px', overflowY: 'auto', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setDetail(null); }}
        >
          <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 18, width: '100%', maxWidth: 1160, marginBottom: 20, boxShadow: '0 24px 80px rgba(0,0,0,0.2)', overflow: 'hidden' }}>

            {/* Top bar */}
            <div style={{ padding: '16px 28px', borderBottom: `1px solid ${D.border}`, background: D.navy, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  {detail.product?.productType?.toUpperCase() || 'APPLICATION'}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontFamily: 'monospace' }}>{detail.quoteNumber}</span>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {detail.validUntil && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Decision Deadline</div>
                    <div style={{ color: '#fca5a5', fontWeight: 700 }}>{new Date(detail.validUntil).toLocaleDateString()}</div>
                  </div>
                )}
                <button onClick={() => setDetail(null)} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}>✕ Close</button>
              </div>
            </div>

            <div style={{ padding: '24px 28px 8px' }}>
              <h2 style={{ color: D.text, fontWeight: 800, fontSize: 26, margin: 0 }}>{clientName(detail)}</h2>
              <div style={{ color: D.sec, fontSize: 13, marginTop: 4 }}>{detail.product?.name} · Submitted {detail.createdAt ? new Date(detail.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}</div>
            </div>

            {/* Two-column body */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, padding: '20px 28px 28px', alignItems: 'start' }}>

              {/* ── LEFT PANEL ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Profile */}
                <Section title="Profile" icon={<BankOutlined style={{ color: D.green }} />}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 10 }}>
                    {[
                      { label: 'PRODUCT',          value: detail.product?.name || '—' },
                      { label: 'MEMBERS COVERED',  value: (detail.memberCount || 1).toLocaleString() },
                      { label: 'RISK SCORE',        value: `${detail.riskFactors?.riskScore || '—'} / 10` },
                    ].map(f => (
                      <div key={f.label} style={{ background: D.card2, borderRadius: 8, padding: '12px 14px' }}>
                        <div style={{ color: D.sec, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 4 }}>{f.label}</div>
                        <div style={{ color: D.text, fontWeight: 600, fontSize: 14 }}>{f.value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: D.card2, borderRadius: 8, padding: '12px 14px' }}>
                    <div style={{ color: D.sec, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 4 }}>ASSIGNED UNDERWRITER</div>
                    <div style={{ color: D.text, fontWeight: 600 }}>
                      {detail.assignedUnderwriter
                        ? `${detail.assignedUnderwriter.firstName} ${detail.assignedUnderwriter.lastName}`
                        : <span style={{ color: D.amber }}>Unassigned — click "Take Ownership"</span>}
                    </div>
                  </div>
                </Section>

                {/* Application Details */}
                {detail.applicationData && Object.keys(detail.applicationData).some(k => !SKIP_KEYS.includes(k) && detail.applicationData[k]) && (
                  <Section title="Application Details" icon={<span style={{ fontSize: 15 }}>📋</span>}>
                    <AppDataSection data={detail.applicationData} />
                  </Section>
                )}

                {/* Risk factors + notes */}
                <Section title="Risk Assessment" icon={<span style={{ fontSize: 15 }}>🛡</span>}>
                  {(detail.riskFactors?.riskScore || 0) >= 7 && (
                    <RiskItem icon={<WarningOutlined />} color={D.red} bg="rgba(239,68,68,0.08)" border="rgba(239,68,68,0.2)"
                      title="High Risk Score" desc={`Score ${detail.riskFactors.riskScore}/10 — requires senior underwriter review`} />
                  )}
                  <RiskItem icon={<CheckCircleOutlined />} color={D.green} bg="rgba(34,197,94,0.08)" border="rgba(34,197,94,0.2)"
                    title="Application Received" desc="Documentation submitted by applicant for review" />
                  {detail.riskFactors?.claimsHistory && (
                    <RiskItem icon={<FileTextOutlined />} color={D.amber} bg="rgba(245,158,11,0.08)" border="rgba(245,158,11,0.2)"
                      title={`Claims History: ${detail.riskFactors.claimsHistory}`} desc="Self-reported by applicant" />
                  )}
                  {(detail.notes || []).map((n, i) => (
                    <div key={i} style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 14px', marginTop: 8, border: '1px solid #e5e7eb' }}>
                      <div style={{ color: D.text, fontSize: 13 }}>{n.content}</div>
                      <div style={{ color: D.sec, fontSize: 11, marginTop: 4 }}>
                        {n.author?.firstName} {n.author?.lastName} · {n.timestamp ? new Date(n.timestamp).toLocaleString() : ''}
                      </div>
                    </div>
                  ))}
                </Section>

                {/* Documents */}
                <Section title={`Submitted Documents (${(detail.documents || []).length})`} icon={<span style={{ fontSize: 15 }}>📎</span>}>
                  {(detail.documents || []).length === 0 ? (
                    <div style={{ color: '#ef4444', fontSize: 13, fontWeight: 600 }}>⚠ No documents were attached by the applicant.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(detail.documents || []).map((doc, i) => {
                        const url  = docUrl(doc);
                        const name = doc.originalName || doc.name || `Document ${i + 1}`;
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: D.card2, border: `1px solid ${D.border}`, borderRadius: 10 }}>
                            <span style={{ fontSize: 20, flexShrink: 0 }}>{fileIcon(doc.mimetype || doc.mimeType, name)}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ color: D.text, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                              {doc.docType && <div style={{ color: D.sec, fontSize: 11, marginTop: 1, textTransform: 'capitalize' }}>{doc.docType.replace(/_/g, ' ')}</div>}
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                              <a href={url} target="_blank" rel="noopener noreferrer"
                                style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 7, padding: '5px 11px', color: '#1e40af', fontSize: 12, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <EyeOutlined style={{ fontSize: 11 }} /> View
                              </a>
                              <a href={url} download={name}
                                style={{ background: D.navy, border: 'none', borderRadius: 7, padding: '5px 11px', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <DownloadOutlined style={{ fontSize: 11 }} /> Download
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Section>

                {/* Underwriter rationale */}
                <Section title="Internal Underwriting Notes" icon={<span style={{ fontSize: 15 }}>📝</span>}>
                  <div style={{ color: D.sec, fontSize: 12, marginBottom: 8 }}>For internal records only — not visible to the applicant.</div>
                  <textarea value={rationale} onChange={e => setRationale(e.target.value)}
                    placeholder="Enter justification, risk observations, or conditions for internal reference…"
                    rows={4}
                    style={{ width: '100%', background: D.card2, border: `1px solid ${D.border}`, borderRadius: 8, color: D.text, padding: '12px 14px', fontSize: 13, resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </Section>
              </div>

              {/* ── RIGHT PANEL ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 20 }}>

                {/* Coverage summary — read-only */}
                <div style={{ background: D.card2, border: `1px solid ${D.border}`, borderRadius: 12, padding: 18 }}>
                  <div style={{ fontWeight: 700, color: D.text, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 7 }}>
                    🛡 Coverage Summary
                  </div>
                  {[
                    { label: 'Member Count',  value: detail.memberCount?.toString() || '1' },
                    { label: 'Risk Score',    value: `${detail.riskFactors?.riskScore ?? '—'} / 10` },
                    { label: 'Status',        value: detail.status?.replace(/_/g, ' '), style: { textTransform: 'capitalize', fontWeight: 700, color: detail.status === 'approved' ? D.green : detail.status === 'rejected' ? D.red : D.text } },
                    { label: 'Submitted',     value: detail.createdAt ? new Date(detail.createdAt).toLocaleDateString() : '—' },
                  ].map(f => (
                    <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${D.border}` }}>
                      <span style={{ color: D.sec, fontSize: 13 }}>{f.label}</span>
                      <span style={{ color: D.text, fontWeight: 600, fontSize: 13, ...(f.style || {}) }}>{f.value}</span>
                    </div>
                  ))}
                </div>

                {/* ── OFFER BUILDER (only when under_review) ── */}
                {['underwriter','payer_admin','superadmin'].includes(user?.role) && detail.status === 'under_review' && (
                  <div style={{ background: '#fff', border: `2px solid ${D.navy}`, borderRadius: 14, overflow: 'hidden' }}>
                    <div style={{ background: D.navy, padding: '14px 18px' }}>
                      <div style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>🏷 Build Your Offer</div>
                      <div style={{ color: '#93c5fd', fontSize: 12, marginTop: 2 }}>Set the terms to send to the applicant</div>
                    </div>
                    <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>

                      {/* Tier selector */}
                      {tiers.length > 0 && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Coverage Tier</div>
                          <select
                            value={offer.tierId}
                            onChange={e => {
                              const t = tiers.find(t => t._id === e.target.value);
                              setO('tierId', e.target.value);
                              if (t && !offer.premium) setO('premium', t.annualPremium?.toString() || '');
                            }}
                            style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 9, fontSize: 13, background: '#fff' }}>
                            <option value="">Select tier…</option>
                            {tiers.map(t => <option key={t._id} value={t._id}>{t.name} — ETB {t.annualPremium?.toLocaleString()}/yr</option>)}
                          </select>
                          {selectedTier && (
                            <div style={{ marginTop: 6, fontSize: 11, color: '#6b7280' }}>
                              Base premium: ETB {selectedTier.annualPremium?.toLocaleString()}/yr. Adjust below.
                            </div>
                          )}
                        </div>
                      )}

                      {/* Final premium — most important field */}
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                          Final Annual Premium (ETB) <span style={{ color: D.red }}>*</span>
                        </div>
                        <input
                          type="number" min="0"
                          placeholder="e.g. 18000"
                          value={offer.premium}
                          onChange={e => setO('premium', e.target.value)}
                          style={{ width: '100%', padding: '10px 13px', border: `2px solid ${offer.premium ? D.navy : '#e5e7eb'}`, borderRadius: 9, fontSize: 16, fontWeight: 700, color: D.navy, boxSizing: 'border-box', outline: 'none' }}
                        />
                        {premiumNum > 0 && (
                          <div style={{ marginTop: 5, fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
                            ETB {premiumNum.toLocaleString()} / yr · ≈ ETB {Math.round(premiumNum / 12).toLocaleString()} / month
                          </div>
                        )}
                      </div>

                      {/* Offer validity */}
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Offer Valid Until</div>
                        <input
                          type="date"
                          value={offer.validUntil}
                          onChange={e => setO('validUntil', e.target.value)}
                          style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 9, fontSize: 13, boxSizing: 'border-box' }}
                        />
                      </div>

                      {/* Underwriting conditions */}
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Underwriting Conditions <span style={{ color: '#9ca3af', fontWeight: 400, fontSize: 10 }}>(optional)</span></div>
                        <textarea
                          rows={2}
                          placeholder="e.g. Pre-existing condition exclusion applies for 12 months. Annual health check required."
                          value={offer.conditions}
                          onChange={e => setO('conditions', e.target.value)}
                          style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 9, fontSize: 12, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
                        />
                      </div>

                      {/* Note to client */}
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Message to Applicant <span style={{ color: '#9ca3af', fontWeight: 400, fontSize: 10 }}>(visible to client)</span></div>
                        <textarea
                          rows={3}
                          placeholder="A personal note to the applicant explaining the offer, what's covered, or any next steps…"
                          value={offer.noteToClient}
                          onChange={e => setO('noteToClient', e.target.value)}
                          style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 9, fontSize: 12, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
                        />
                      </div>

                      {/* Offer preview pill */}
                      {premiumNum > 0 && (
                        <div style={{ background: 'linear-gradient(135deg,#064e3b,#065f46)', borderRadius: 10, padding: '12px 14px' }}>
                          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Offer Preview</div>
                          <div style={{ color: '#fff', fontSize: 22, fontWeight: 900 }}>ETB {premiumNum.toLocaleString()}<span style={{ fontSize: 12, fontWeight: 400, marginLeft: 4 }}>/yr</span></div>
                          {selectedTier && <div style={{ color: '#6ee7b7', fontSize: 12, marginTop: 2 }}>{selectedTier.name} tier</div>}
                          {offer.validUntil && <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 4 }}>Offer valid until {new Date(offer.validUntil).toLocaleDateString()}</div>}
                        </div>
                      )}

                      {!offer.premium && (
                        <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 9, padding: '9px 12px', fontSize: 12, color: '#92400e' }}>
                          ⚠ Enter the final annual premium to enable the Send Offer button.
                        </div>
                      )}

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                        <button
                          onClick={() => setRejectOpen(true)}
                          style={{ flex: 1, padding: '11px 0', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, color: D.red, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <CloseOutlined /> Reject
                        </button>
                        <button
                          onClick={sendOffer}
                          disabled={!offer.premium || sendingOffer}
                          style={{
                            flex: 2, padding: '11px 0', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13,
                            background: offer.premium && !sendingOffer ? D.green : '#e5e7eb',
                            color: offer.premium ? '#fff' : '#9ca3af',
                            cursor: offer.premium && !sendingOffer ? 'pointer' : 'not-allowed',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                          }}>
                          {sendingOffer ? <LoadingOutlined /> : <CheckOutlined />}
                          {sendingOffer ? 'Sending…' : 'Send Offer to Client →'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Submitted state */}
                {detail.status === 'submitted' && ['underwriter','payer_admin','superadmin'].includes(user?.role) && (
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: 18, textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, color: '#1e40af', fontSize: 15, marginBottom: 6 }}>Ready to Review</div>
                    <div style={{ color: '#3b82f6', fontSize: 13, marginBottom: 14, lineHeight: 1.6 }}>Take ownership of this application to start the underwriting review and build the offer.</div>
                    <button onClick={() => takeOwnership(detail)}
                      style={{ width: '100%', padding: '12px 0', background: D.navy, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                      Take Ownership
                    </button>
                  </div>
                )}

                {/* Approved — show sent offer */}
                {detail.status === 'approved' && (
                  <div style={{ background: 'linear-gradient(135deg,#064e3b,#065f46)', borderRadius: 14, padding: '20px 18px' }}>
                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Offer Sent to Client</div>
                    <div style={{ color: '#fff', fontSize: 32, fontWeight: 900, lineHeight: 1, marginBottom: 4 }}>
                      ETB {(detail.finalPremium || 0).toLocaleString()}
                    </div>
                    <div style={{ color: '#6ee7b7', fontSize: 13 }}>Annual premium · client notified</div>
                    {detail.validUntil && <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 6 }}>Offer expires {new Date(detail.validUntil).toLocaleDateString()}</div>}
                  </div>
                )}

                {/* Rejected */}
                {detail.status === 'rejected' && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: 18 }}>
                    <div style={{ fontWeight: 700, color: '#991b1b', fontSize: 14, marginBottom: 6 }}>Application Rejected</div>
                    {(detail.notes || []).slice(-1).map((n, i) => (
                      <div key={i} style={{ color: '#dc2626', fontSize: 13, lineHeight: 1.5 }}>{n.content}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject overlay */}
      {rejectOpen && detail && (
        <RejectOverlay quote={detail} onClose={() => setRejectOpen(false)} onConfirmed={handleRejected} />
      )}
    </div>
  );
}

// ── Helper components ────────────────────────────────────────────────────────

function Chip({ color, bg, border, children }) {
  return (
    <span style={{ background: bg, color, border: `1px solid ${border}`, borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      {children}
    </span>
  );
}

function Section({ title, icon, children }) {
  return (
    <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        {icon}
        <span style={{ color: '#111827', fontWeight: 700, fontSize: 14 }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function RiskItem({ icon, color, bg, border, title, desc }) {
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: '11px 14px', marginBottom: 8, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span style={{ color, marginTop: 2, flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ color: '#111827', fontWeight: 600, fontSize: 13 }}>{title}</div>
        <div style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>{desc}</div>
      </div>
    </div>
  );
}
