import { useEffect, useState, useCallback } from 'react';
import { Table, Spin, message } from 'antd';
import {
  FileTextOutlined, PlusOutlined, CheckCircleOutlined, ClockCircleOutlined,
  ExclamationCircleOutlined, CheckOutlined, CloseCircleOutlined, UploadOutlined,
  ArrowLeftOutlined, LoadingOutlined,
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

// ── Dynamic config by product type ────────────────────────────────────────────

const TYPE_META = {
  health:   { label: 'Health Insurance',   icon: '🏥', color: '#16a34a', bg: '#dcfce7' },
  auto:     { label: 'Auto Insurance',     icon: '🚗', color: '#d97706', bg: '#fef3c7' },
  life:     { label: 'Life Insurance',     icon: '🛡️',  color: '#2563eb', bg: '#dbeafe' },
  home:     { label: 'Home Insurance',     icon: '🏠', color: '#7c3aed', bg: '#ede9fe' },
  travel:   { label: 'Travel Insurance',   icon: '✈️',  color: '#0891b2', bg: '#cffafe' },
  business: { label: 'Business Insurance', icon: '🏢', color: '#be185d', bg: '#fce7f3' },
};

const REQUIRED_DOCS = {
  health:   ['National ID / Passport', 'Medical History Report', 'Recent Lab Results (within 6 months)', 'Prescription (if on regular medication)'],
  auto:     ['National ID', 'Vehicle Registration Certificate', "Driver's License (front & back)", 'Proof of Ownership / Purchase Agreement'],
  life:     ['National ID / Passport', 'Recent Medical Checkup Report', 'Birth Certificate', 'Income Statement / Latest Payslip'],
  home:     ['National ID', 'Property Title Deed / Ownership Document', 'Property Valuation Report', 'Recent Utility Bill'],
  travel:   ['National ID', 'Valid Passport (copy)', 'Flight Itinerary / Booking Confirmation', 'Accommodation / Hotel Booking'],
  business: ['Business License / Commercial Registration', 'Tax Identification Certificate', 'Financial Statements (last 2 fiscal years)', 'Premises Lease or Title Deed'],
};

const INCOME_RANGES = [
  'Under ETB 50,000', 'ETB 50,000 – 120,000', 'ETB 120,000 – 300,000',
  'ETB 300,000 – 600,000', 'ETB 600,000 – 1,200,000', 'Over ETB 1,200,000',
];

const CHRONIC_CONDITIONS = ['Diabetes', 'Hypertension', 'Asthma', 'Heart Disease', 'Cancer (past/present)', 'Kidney Disease', 'HIV/AIDS', 'Mental Health Condition', 'None of the above'];

// ── Helpers ───────────────────────────────────────────────────────────────────

const emptyForm = () => ({
  productId: '', purpose: '',
  // personal
  dateOfBirth: '', gender: '', occupation: '', incomeRange: '', maritalStatus: '', dependentCount: '0', phone: '',
  // health
  height: '', weight: '', chronicConditions: [], smoker: '', alcoholUse: '', familyHistory: '', currentMedications: '', surgicalHistory: '', surgicalDetail: '',
  // auto
  vehicleMake: '', vehicleModel: '', vehicleYear: '', engineCC: '', transmission: '', plateOrVIN: '', vehicleUsage: '', yearsLicensed: '', atFaultAccidents: '0', currentMileage: '',
  // life
  desiredSumInsured: '', beneficiaryName: '', beneficiaryRelation: '', occupationRisk: '', annualIncome: '', highRiskActivities: '',
  // home
  propertyType: '', constructionYear: '', floorAreaSqm: '', propertyCity: '', ownershipType: '', securityFeatures: [], previousIncidents: '',
  // travel
  destination: '', departureDate: '', returnDate: '', tripPurpose: '', estimatedTripCost: '', hasMedicalCondition: '',
  // business
  businessType: '', yearsInOperation: '', numEmployees: '', annualRevenueBand: '', premisesType: '', previousBusinessClaims: '',
  // risk
  claimsHistory: '', yearsInsured: '',
  additionalNotes: '',
});

function Label({ children, required }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, display: 'flex', gap: 4 }}>
      {children}
      {required && <span style={{ color: RED }}>*</span>}
    </div>
  );
}

function Field({ label, required, children, span = 1 }) {
  return (
    <div style={{ gridColumn: `span ${span}` }}>
      {label && <Label required={required}>{label}</Label>}
      {children}
    </div>
  );
}

const inputStyle = (hasError) => ({
  width: '100%', padding: '10px 13px', border: `1.5px solid ${hasError ? RED : '#e5e7eb'}`,
  borderRadius: 9, fontSize: 13, color: '#111827', background: '#fff',
  outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s',
});

const selectStyle = inputStyle(false);

function SectionHead({ number, title, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 18 }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: NAVY, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0, marginTop: 2 }}>
        {number}
      </div>
      <div>
        <div style={{ fontWeight: 800, fontSize: 15, color: '#111827' }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

function Grid({ children, cols = 2 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '14px 18px' }}>
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ borderTop: '1px solid #f3f4f6', margin: '6px 0 22px' }} />;
}

function CheckboxGroup({ options, value = [], onChange }) {
  const toggle = (opt) => {
    const next = value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt];
    onChange(next);
  };
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map(opt => {
        const sel = value.includes(opt);
        return (
          <div key={opt} onClick={() => toggle(opt)} style={{
            padding: '6px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            border: `1.5px solid ${sel ? NAVY : '#e5e7eb'}`,
            background: sel ? '#eff6ff' : '#fff',
            color: sel ? NAVY : '#6b7280',
            transition: 'all 0.12s',
          }}>
            {sel ? '✓ ' : ''}{opt}
          </div>
        );
      })}
    </div>
  );
}

function YesNo({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {['Yes', 'No'].map(opt => {
        const sel = value === opt;
        return (
          <div key={opt} onClick={() => onChange(opt)} style={{
            flex: 1, textAlign: 'center', padding: '9px', borderRadius: 9, fontSize: 13, fontWeight: 700,
            border: `1.5px solid ${sel ? (opt === 'Yes' ? '#dc2626' : '#16a34a') : '#e5e7eb'}`,
            background: sel ? (opt === 'Yes' ? '#fef2f2' : '#f0fdf4') : '#fff',
            color: sel ? (opt === 'Yes' ? '#dc2626' : '#16a34a') : '#9ca3af',
            cursor: 'pointer', transition: 'all 0.12s',
          }}>
            {opt}
          </div>
        );
      })}
    </div>
  );
}

// ── Per-document upload slots ──────────────────────────────────────────────────

function DocSlot({ label, file, onUpload, onRemove, uploading }) {
  const fileInput = () => {
    const el = document.createElement('input');
    el.type = 'file';
    el.accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx';
    el.onchange = (e) => e.target.files[0] && onUpload(label, e.target.files[0]);
    el.click();
  };

  return (
    <div style={{
      border: `1.5px solid ${file ? '#bbf7d0' : '#e5e7eb'}`,
      borderRadius: 10, padding: '12px 14px', background: file ? '#f0fdf4' : '#fafafa',
      transition: 'all 0.15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: file ? '#15803d' : '#374151', marginBottom: file ? 2 : 0 }}>{label}</div>
          {file && <div style={{ fontSize: 11, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 240 }}>{file.originalName}</div>}
        </div>
        {uploading === label ? (
          <LoadingOutlined style={{ color: NAVY, fontSize: 16 }} />
        ) : file ? (
          <button onClick={() => onRemove(label)} style={{
            background: '#fee2e2', border: 'none', borderRadius: 6, padding: '4px 10px',
            color: '#dc2626', fontSize: 11, fontWeight: 700, cursor: 'pointer',
          }}>Remove</button>
        ) : (
          <button onClick={fileInput} style={{
            background: NAVY, border: 'none', borderRadius: 6, padding: '6px 12px',
            color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <UploadOutlined style={{ fontSize: 11 }} /> Upload
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function InsuredQuotes() {
  const [quotes, setQuotes]         = useState([]);
  const [products, setProducts]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [detail, setDetail]         = useState(null);
  const [reqOpen, setReqOpen]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [accepting, setAccepting]   = useState(false);

  const [formData, setFormData]     = useState(emptyForm());
  const [errors, setErrors]         = useState({});
  const [docUploads, setDocUploads] = useState({});   // { [label]: fileInfo }
  const [uploadingDoc, setUploadingDoc] = useState(null); // label currently uploading
  const [formStep, setFormStep]     = useState(1);    // 1 = type select, 2 = full form

  const navigate = useNavigate();
  const { user }  = useAuth();

  const sf = useCallback((key, val) => setFormData(d => ({ ...d, [key]: val })), []);
  const selectedProduct = products.find(p => p._id === formData.productId);
  const productType     = selectedProduct?.productType || '';
  const typeMeta        = TYPE_META[productType] || null;
  const requiredDocs    = REQUIRED_DOCS[productType] || [];

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api.get('/quotes'), api.get('/products?withTiers=true')])
      .then(([q, p]) => {
        setQuotes(Array.isArray(q.data.quotes) ? q.data.quotes : []);
        setProducts(p.data.products || p.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (q) => {
    setDetail(q);
    try { const r = await api.get(`/quotes/${q._id}`); setDetail(r.data.quote); } catch (_) {}
  };

  const openReq = () => {
    setFormData(emptyForm());
    setErrors({});
    setDocUploads({});
    setFormStep(1);
    setReqOpen(true);
  };

  const handleDocUpload = async (label, file) => {
    setUploadingDoc(label);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setDocUploads(d => ({ ...d, [label]: res.data }));
    } catch (err) {
      message.error(err?.response?.data?.message || `Failed to upload ${label}`);
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleDocRemove = (label) => {
    setDocUploads(d => { const next = { ...d }; delete next[label]; return next; });
  };

  const validate = () => {
    const e = {};
    if (!formData.productId)      e.productId     = 'Required';
    if (!formData.dateOfBirth)    e.dateOfBirth   = 'Required';
    if (!formData.occupation)     e.occupation    = 'Required';
    if (!formData.claimsHistory)  e.claimsHistory = 'Required';

    if (productType === 'auto') {
      if (!formData.vehicleMake)   e.vehicleMake  = 'Required';
      if (!formData.vehicleModel)  e.vehicleModel = 'Required';
      if (!formData.vehicleYear)   e.vehicleYear  = 'Required';
      if (!formData.plateOrVIN)    e.plateOrVIN   = 'Required';
    }
    if (productType === 'life') {
      if (!formData.desiredSumInsured) e.desiredSumInsured = 'Required';
      if (!formData.beneficiaryName)   e.beneficiaryName   = 'Required';
    }
    if (productType === 'home') {
      if (!formData.propertyType)   e.propertyType = 'Required';
      if (!formData.propertyCity)   e.propertyCity = 'Required';
    }
    if (productType === 'travel') {
      if (!formData.destination)    e.destination   = 'Required';
      if (!formData.departureDate)  e.departureDate = 'Required';
      if (!formData.returnDate)     e.returnDate    = 'Required';
    }
    if (productType === 'business') {
      if (!formData.businessType)   e.businessType = 'Required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRequest = async () => {
    if (!validate()) {
      message.error('Please fill in all required fields.');
      return;
    }
    const product = products.find(p => p._id === formData.productId);
    const payerId = product?.payer?._id || product?.payer;
    if (!payerId) {
      message.error('Selected product has no insurer assigned. Please contact support.');
      return;
    }
    setSubmitting(true);
    try {
      // Build age from DOB
      const dob = formData.dateOfBirth ? new Date(formData.dateOfBirth) : null;
      const age  = dob ? Math.floor((Date.now() - dob.getTime()) / 31557600000) : undefined;

      const payload = {
        product:       formData.productId,
        payer:         payerId,
        insuredPerson: user?.linkedEntity?.entityId,
        memberCount:   parseInt(formData.dependentCount || '0', 10) + 1,
        riskFactors: {
          averageAge:    age,
          claimsHistory: formData.claimsHistory,
        },
        // Full application data stored in riskFactors for underwriter reference
        applicationData: { ...formData },
        documents: Object.values(docUploads),
      };

      await api.post('/quotes', payload);
      message.success('Application submitted — an underwriter will review it within 1–3 business days.');
      setReqOpen(false);
      load();
    } catch (err) {
      message.error(err?.response?.data?.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccept = async (quote) => {
    setAccepting(true);
    try {
      const { data } = await api.post(`/quotes/${quote._id}/accept`);
      const chapa = await api.post('/chapa/initialize', { enrollmentId: data.enrollment._id });
      const url = chapa.data.checkout_url || chapa.data.data?.checkout_url;
      if (url) window.location.href = url;
      else { message.success('Enrollment confirmed!'); navigate('/insured/coverage'); }
    } catch (err) {
      message.error(err?.response?.data?.message || 'Failed to accept offer. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  const pendingCount  = quotes.filter(q => ['submitted','under_review'].includes(q.status)).length;
  const approvedCount = quotes.filter(q => q.status === 'approved').length;
  const acceptedCount = quotes.filter(q => q.status === 'accepted').length;

  const btnSm = (bg, color = '#fff') => ({
    background: bg, border: 'none', borderRadius: 7,
    color, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
  });

  const columns = [
    { title: 'QUOTE #', key: 'num', render: (_, r) => <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#6b7280' }}>{r.quoteNumber}</span> },
    { title: 'PRODUCT', key: 'prod', render: (_, r) => <span style={{ fontWeight: 600, color: '#111827' }}>{r.product?.name || '—'}</span> },
    {
      title: 'STATUS', key: 'status', render: (_, r) => {
        const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.draft;
        return <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>{cfg.label}</span>;
      },
    },
    {
      title: 'PREMIUM (ETB)', key: 'premium', align: 'right', render: (_, r) => {
        const amt = r.finalPremium || r.scenarios?.[0]?.annualPremium;
        return amt ? <span style={{ fontWeight: 700, color: NAVY }}>{amt.toLocaleString()}</span> : <span style={{ color: '#9ca3af' }}>Pending</span>;
      },
    },
    { title: 'SUBMITTED', key: 'date', render: (_, r) => <span style={{ color: '#6b7280', fontSize: 13 }}>{new Date(r.createdAt).toLocaleDateString()}</span> },
    {
      title: '', key: 'actions', render: (_, r) => (
        <button onClick={() => openDetail(r)} style={btnSm(r.status === 'approved' ? GREEN : NAVY)}>
          {r.status === 'approved' ? 'View Offer →' : 'View'}
        </button>
      ),
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>My Applications</h1>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 13 }}>Request a personalised quote and track your applications through underwriting</p>
        </div>
        <button onClick={openReq} style={{ background: NAVY, border: 'none', borderRadius: 10, color: '#fff', padding: '11px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
          <PlusOutlined /> Request a Quote
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {[
          { label: 'PENDING REVIEW',    value: pendingCount,  color: AMBER,    icon: <ClockCircleOutlined />,  sub: 'Awaiting underwriter decision' },
          { label: 'APPROVED OFFERS',   value: approvedCount, color: '#059669', icon: <CheckCircleOutlined />, sub: approvedCount > 0 ? 'Ready to accept & pay' : 'No pending offers' },
          { label: 'ACCEPTED POLICIES', value: acceptedCount, color: BLUE,     icon: <FileTextOutlined />,     sub: 'Converted to active policy' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '20px 22px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, fontSize: 18, marginBottom: 12 }}>{s.icon}</div>
            <div style={{ color: '#6b7280', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{s.label}</div>
            <div style={{ color: '#111827', fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{s.value}</div>
            <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 6 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Approved offer banner */}
      {approvedCount > 0 && (
        <div style={{ background: 'linear-gradient(135deg,#064e3b,#065f46)', borderRadius: 14, padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircleOutlined style={{ color: '#6ee7b7', fontSize: 20 }} />
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>You have an approved offer waiting!</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Review your personalised premium, then accept to activate your coverage.</div>
            </div>
          </div>
          <button onClick={() => { const aq = quotes.find(q => q.status === 'approved'); if (aq) openDetail(aq); }}
            style={{ background: GREEN, border: 'none', borderRadius: 9, color: '#fff', padding: '11px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            View &amp; Accept Offer →
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && quotes.length === 0 && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 32, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#111827', marginBottom: 24, textAlign: 'center' }}>How the Quote Process Works</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 28 }}>
            {[
              { step: '1', label: 'Apply', desc: 'Select your coverage type and complete the detailed application form', color: BLUE },
              { step: '2', label: 'Underwriting', desc: 'Our team assesses your profile and prepares a personalised offer', color: AMBER },
              { step: '3', label: 'Review Offer', desc: 'See your approved premium and available tier options', color: '#059669' },
              { step: '4', label: 'Accept & Pay', desc: 'Pay via Chapa to immediately activate your coverage', color: NAVY },
            ].map(s => (
              <div key={s.step} style={{ textAlign: 'center', padding: '12px 8px' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${s.color}15`, border: `2px solid ${s.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, fontWeight: 800, fontSize: 18, margin: '0 auto 12px' }}>{s.step}</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>{s.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center' }}>
            <button onClick={openReq} style={{ background: NAVY, border: 'none', borderRadius: 10, color: '#fff', padding: '12px 28px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
              Submit Your First Application
            </button>
          </div>
        </div>
      )}

      {/* Quote history table */}
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
            {loading ? <div style={{ padding: 60, textAlign: 'center' }}><Spin /></div>
              : <Table dataSource={quotes} columns={columns} rowKey="_id" pagination={{ pageSize: 8, style: { padding: '12px 20px' } }} size="small" />}
          </div>
        </div>
      )}

      {/* ── Quote Detail Overlay ────────────────────────────────────────────── */}
      {detail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setDetail(null); }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 660, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
            <div style={{ padding: '20px 28px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18, color: '#111827' }}>Application Details</div>
                <div style={{ color: '#9ca3af', fontSize: 13, marginTop: 2, fontFamily: 'monospace' }}>{detail.quoteNumber}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {(() => { const cfg = STATUS_CONFIG[detail.status] || STATUS_CONFIG.draft; return <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>{cfg.label}</span>; })()}
                <button onClick={() => setDetail(null)} style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, color: '#6b7280', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>✕</button>
              </div>
            </div>
            <div style={{ overflowY: 'auto', padding: '24px 28px', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
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
              {['submitted','under_review'].includes(detail.status) && (
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '16px 20px', display: 'flex', gap: 14 }}>
                  <ClockCircleOutlined style={{ color: BLUE, fontSize: 20, marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#1e40af' }}>Application Under Review</div>
                    <div style={{ fontSize: 13, color: '#3b82f6', marginTop: 4 }}>
                      {detail.status === 'submitted' ? 'Your application has been received and is waiting to be assigned to an underwriter.' : 'An underwriter is currently assessing your risk profile. You will be notified once a decision is made.'}
                    </div>
                  </div>
                </div>
              )}
              {detail.status === 'rejected' && (
                <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 12, padding: '16px 20px', display: 'flex', gap: 14 }}>
                  <CloseCircleOutlined style={{ color: RED, fontSize: 20, marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#991b1b' }}>Application Not Approved</div>
                    <div style={{ fontSize: 13, color: '#b91c1c', marginTop: 4 }}>This application was not approved. You may submit a new application with updated information.</div>
                  </div>
                </div>
              )}
              {detail.notes?.length > 0 && (
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 10 }}>Underwriter Notes</div>
                  {detail.notes.map((n, i) => (
                    <div key={i} style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 9, padding: '12px 14px', marginBottom: 8 }}>
                      <div style={{ color: '#374151', fontSize: 13 }}>{n.content}</div>
                      {n.timestamp && <div style={{ color: '#9ca3af', fontSize: 11, marginTop: 4 }}>{n.author ? `${n.author.firstName} ${n.author.lastName} · ` : ''}{new Date(n.timestamp).toLocaleString()}</div>}
                    </div>
                  ))}
                </div>
              )}
              {detail.status === 'approved' && (
                <>
                  <div style={{ background: 'linear-gradient(135deg,#064e3b,#065f46)', borderRadius: 14, padding: '24px 28px', color: '#fff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                      <CheckCircleOutlined style={{ fontSize: 20, color: '#6ee7b7' }} />
                      <div style={{ fontWeight: 800, fontSize: 17 }}>Your Personalised Offer is Ready</div>
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Final Annual Premium</div>
                    <div style={{ fontSize: 38, fontWeight: 900, lineHeight: 1, marginBottom: 6 }}>
                      ETB {(detail.finalPremium || detail.scenarios?.[0]?.annualPremium || 0).toLocaleString()}
                    </div>
                    {detail.finalPremium && <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13 }}>≈ ETB {Math.round(detail.finalPremium / 12).toLocaleString()} / month</div>}
                  </div>
                  {detail.scenarios?.length > 0 && (
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 10 }}>Coverage Options</div>
                      {detail.scenarios.map((s, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: i === 0 ? '#f0fdf4' : '#f9fafb', border: `1px solid ${i === 0 ? '#bbf7d0' : '#e5e7eb'}`, borderRadius: 10, marginBottom: 8 }}>
                          <div>
                            <div style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>{s.name || s.tier?.name || `Option ${i + 1}`}</div>
                            {s.notes && <div style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>{s.notes}</div>}
                          </div>
                          <div style={{ fontWeight: 800, fontSize: 16, color: i === 0 ? '#16a34a' : NAVY }}>ETB {s.annualPremium?.toLocaleString()}/yr</div>
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
            {detail.status === 'approved' && (
              <div style={{ padding: '16px 28px', borderTop: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', gap: 10 }}>
                <button onClick={() => setDetail(null)} style={{ flex: 1, padding: '12px 0', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, color: '#6b7280', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Decide Later</button>
                <button onClick={() => handleAccept(detail)} disabled={accepting}
                  style={{ flex: 2, padding: '12px 0', background: accepting ? '#9ca3af' : GREEN, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 15, cursor: accepting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {accepting ? <LoadingOutlined /> : <CheckOutlined />}
                  {accepting ? 'Processing...' : 'Accept Offer & Pay with Chapa'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Request a Quote — Full-Width Custom Modal ───────────────────────── */}
      {reqOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 16px', backdropFilter: 'blur(3px)' }}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 900, maxHeight: '94vh', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(0,0,0,0.22)', overflow: 'hidden' }}>

            {/* ── Modal header ── */}
            <div style={{ background: NAVY, padding: '22px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {formStep === 2 && (
                  <button onClick={() => setFormStep(1)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, color: '#fff', width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ArrowLeftOutlined style={{ fontSize: 14 }} />
                  </button>
                )}
                <div>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>
                    {formStep === 1 ? 'Select Insurance Type' : `${typeMeta?.icon || ''} ${typeMeta?.label || 'Insurance'} Application`}
                  </div>
                  <div style={{ color: '#93c5fd', fontSize: 12, marginTop: 2 }}>
                    {formStep === 1 ? 'Choose the type of coverage you want to apply for' : 'Complete all sections — your information helps us give you the most accurate premium'}
                  </div>
                </div>
              </div>
              <button onClick={() => setReqOpen(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, color: 'rgba(255,255,255,0.7)', width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>✕</button>
            </div>

            {/* ── Step 1: Product type picker ── */}
            {formStep === 1 && (
              <div style={{ padding: '32px', overflowY: 'auto', flex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
                  {products.map(p => {
                    const m = TYPE_META[p.productType] || { icon: '📋', color: NAVY, bg: '#f1f5f9', label: p.productType };
                    return (
                      <div key={p._id} onClick={() => { sf('productId', p._id); setFormStep(2); setErrors({}); setDocUploads({}); }}
                        style={{ border: `2px solid ${formData.productId === p._id ? NAVY : '#e5e7eb'}`, borderRadius: 14, padding: '20px', cursor: 'pointer', background: formData.productId === p._id ? '#f0f6ff' : '#fff', transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = NAVY; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = formData.productId === p._id ? NAVY : '#e5e7eb'; e.currentTarget.style.transform = ''; }}>
                        <div style={{ width: 50, height: 50, borderRadius: 14, background: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, marginBottom: 12 }}>{m.icon}</div>
                        <div style={{ fontWeight: 800, color: '#111827', fontSize: 15, marginBottom: 4 }}>{p.name}</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: m.color, background: m.bg, display: 'inline-block', borderRadius: 6, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{m.label}</div>
                        {p.description && <div style={{ color: '#6b7280', fontSize: 12, lineHeight: 1.5 }}>{p.description.slice(0, 80)}{p.description.length > 80 ? '…' : ''}</div>}
                        {p.baseAnnualPremium && <div style={{ marginTop: 10, fontWeight: 800, color: NAVY, fontSize: 14 }}>From ETB {p.baseAnnualPremium.toLocaleString()}/yr</div>}
                      </div>
                    );
                  })}
                  {products.length === 0 && (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                      <Spin /> &nbsp; Loading available products…
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Step 2: Full application form ── */}
            {formStep === 2 && (
              <>
                <div style={{ overflowY: 'auto', flex: 1, padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 28 }}>

                  {/* Progress breadcrumb */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {['Coverage', 'Personal Info', typeMeta?.label?.split(' ')[0] || 'Details', 'Risk', 'Documents'].map((s, i) => (
                      <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ background: '#f0f6ff', color: NAVY, borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 700 }}>{i + 1}. {s}</div>
                        {i < 4 && <span style={{ color: '#d1d5db', fontSize: 12 }}>→</span>}
                      </div>
                    ))}
                  </div>

                  {/* ── SECTION 1: Coverage Details ── */}
                  <div>
                    <SectionHead number="1" title="Coverage Details" sub="Tell us what you need covered and why" />
                    <Grid>
                      <Field label="Coverage Product" required>
                        <select style={selectStyle} value={formData.productId} disabled>
                          {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                        </select>
                      </Field>
                      <Field label="Primary Purpose of Coverage">
                        <select style={selectStyle} value={formData.purpose} onChange={e => sf('purpose', e.target.value)}>
                          <option value="">Select purpose…</option>
                          <option>Personal protection</option>
                          <option>Family coverage</option>
                          <option>Employer-mandated</option>
                          <option>Loan / mortgage requirement</option>
                          <option>Legal requirement</option>
                          <option>Other</option>
                        </select>
                      </Field>
                    </Grid>
                  </div>

                  <Divider />

                  {/* ── SECTION 2: Personal Information ── */}
                  <div>
                    <SectionHead number="2" title="Personal Information" sub="Your basic personal details for underwriting" />
                    <Grid>
                      <Field label="Date of Birth" required>
                        <input type="date" style={inputStyle(errors.dateOfBirth)} value={formData.dateOfBirth} onChange={e => sf('dateOfBirth', e.target.value)} />
                        {errors.dateOfBirth && <div style={{ color: RED, fontSize: 11, marginTop: 3 }}>{errors.dateOfBirth}</div>}
                      </Field>
                      <Field label="Gender">
                        <select style={selectStyle} value={formData.gender} onChange={e => sf('gender', e.target.value)}>
                          <option value="">Select…</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Prefer not to say</option>
                        </select>
                      </Field>
                      <Field label="Occupation / Job Title" required>
                        <input style={inputStyle(errors.occupation)} placeholder="e.g. Software Engineer" value={formData.occupation} onChange={e => sf('occupation', e.target.value)} />
                        {errors.occupation && <div style={{ color: RED, fontSize: 11, marginTop: 3 }}>{errors.occupation}</div>}
                      </Field>
                      <Field label="Monthly Income Range">
                        <select style={selectStyle} value={formData.incomeRange} onChange={e => sf('incomeRange', e.target.value)}>
                          <option value="">Select range…</option>
                          {INCOME_RANGES.map(r => <option key={r}>{r}</option>)}
                        </select>
                      </Field>
                      <Field label="Marital Status">
                        <select style={selectStyle} value={formData.maritalStatus} onChange={e => sf('maritalStatus', e.target.value)}>
                          <option value="">Select…</option>
                          <option>Single</option><option>Married</option><option>Divorced</option><option>Widowed</option>
                        </select>
                      </Field>
                      <Field label="Number of Dependents to Cover">
                        <select style={selectStyle} value={formData.dependentCount} onChange={e => sf('dependentCount', e.target.value)}>
                          {['0','1','2','3','4','5+'].map(n => <option key={n}>{n}</option>)}
                        </select>
                      </Field>
                      <Field label="Phone Number">
                        <input style={inputStyle(false)} placeholder="+251 9XX XXX XXX" value={formData.phone} onChange={e => sf('phone', e.target.value)} />
                      </Field>
                    </Grid>
                  </div>

                  <Divider />

                  {/* ── SECTION 3: Type-specific fields ── */}

                  {productType === 'health' && (
                    <div>
                      <SectionHead number="3" title="Medical & Health Information" sub="This information is used exclusively for risk assessment and is kept confidential" />
                      <Grid>
                        <Field label="Height (cm)">
                          <input type="number" style={inputStyle(false)} placeholder="e.g. 170" value={formData.height} onChange={e => sf('height', e.target.value)} />
                        </Field>
                        <Field label="Weight (kg)">
                          <input type="number" style={inputStyle(false)} placeholder="e.g. 70" value={formData.weight} onChange={e => sf('weight', e.target.value)} />
                        </Field>
                        <Field label="Do you smoke?" >
                          <select style={selectStyle} value={formData.smoker} onChange={e => sf('smoker', e.target.value)}>
                            <option value="">Select…</option>
                            <option>Never</option><option>Former smoker</option><option>Occasional</option><option>Daily</option>
                          </select>
                        </Field>
                        <Field label="Alcohol Consumption">
                          <select style={selectStyle} value={formData.alcoholUse} onChange={e => sf('alcoholUse', e.target.value)}>
                            <option value="">Select…</option>
                            <option>Never</option><option>Occasionally (social)</option><option>Weekly</option><option>Daily</option>
                          </select>
                        </Field>
                        <Field label="Do you have a family history of critical illness?" >
                          <select style={selectStyle} value={formData.familyHistory} onChange={e => sf('familyHistory', e.target.value)}>
                            <option value="">Select…</option>
                            <option>No</option><option>Heart disease</option><option>Cancer</option><option>Diabetes</option><option>Stroke</option><option>Multiple conditions</option>
                          </select>
                        </Field>
                        <Field label="Have you had surgery or been hospitalised in the last 5 years?">
                          <select style={selectStyle} value={formData.surgicalHistory} onChange={e => sf('surgicalHistory', e.target.value)}>
                            <option value="">Select…</option>
                            <option>No</option><option>Yes — minor procedure</option><option>Yes — major surgery</option><option>Yes — hospitalisation (no surgery)</option>
                          </select>
                        </Field>
                      </Grid>
                      {formData.surgicalHistory && formData.surgicalHistory !== 'No' && (
                        <div style={{ marginTop: 14 }}>
                          <Field label="Please describe the surgery or hospitalisation">
                            <textarea style={{ ...inputStyle(false), resize: 'vertical' }} rows={2} placeholder="Briefly describe the condition and when it occurred…" value={formData.surgicalDetail} onChange={e => sf('surgicalDetail', e.target.value)} />
                          </Field>
                        </div>
                      )}
                      <div style={{ marginTop: 14 }}>
                        <Label>Pre-existing Chronic Conditions (select all that apply)</Label>
                        <CheckboxGroup options={CHRONIC_CONDITIONS} value={formData.chronicConditions} onChange={v => sf('chronicConditions', v)} />
                      </div>
                      {formData.chronicConditions.length > 0 && !formData.chronicConditions.includes('None of the above') && (
                        <div style={{ marginTop: 14 }}>
                          <Field label="Current medications (if any)">
                            <textarea style={{ ...inputStyle(false), resize: 'vertical' }} rows={2} placeholder="List any prescription medications you are currently taking…" value={formData.currentMedications} onChange={e => sf('currentMedications', e.target.value)} />
                          </Field>
                        </div>
                      )}
                    </div>
                  )}

                  {productType === 'auto' && (
                    <div>
                      <SectionHead number="3" title="Vehicle Information" sub="Details about the vehicle you want to insure" />
                      <Grid>
                        <Field label="Make / Manufacturer" required>
                          <input style={inputStyle(errors.vehicleMake)} placeholder="e.g. Toyota" value={formData.vehicleMake} onChange={e => sf('vehicleMake', e.target.value)} />
                          {errors.vehicleMake && <div style={{ color: RED, fontSize: 11, marginTop: 3 }}>Required</div>}
                        </Field>
                        <Field label="Model" required>
                          <input style={inputStyle(errors.vehicleModel)} placeholder="e.g. Land Cruiser" value={formData.vehicleModel} onChange={e => sf('vehicleModel', e.target.value)} />
                        </Field>
                        <Field label="Year of Manufacture" required>
                          <input type="number" style={inputStyle(errors.vehicleYear)} placeholder="e.g. 2020" min="1990" max={new Date().getFullYear() + 1} value={formData.vehicleYear} onChange={e => sf('vehicleYear', e.target.value)} />
                        </Field>
                        <Field label="Engine Capacity (CC)">
                          <input type="number" style={inputStyle(false)} placeholder="e.g. 2000" value={formData.engineCC} onChange={e => sf('engineCC', e.target.value)} />
                        </Field>
                        <Field label="Transmission">
                          <select style={selectStyle} value={formData.transmission} onChange={e => sf('transmission', e.target.value)}>
                            <option value="">Select…</option>
                            <option>Manual</option><option>Automatic</option>
                          </select>
                        </Field>
                        <Field label="Plate Number / VIN" required>
                          <input style={inputStyle(errors.plateOrVIN)} placeholder="e.g. 3-AA-12345 or VIN number" value={formData.plateOrVIN} onChange={e => sf('plateOrVIN', e.target.value)} />
                        </Field>
                        <Field label="Primary Vehicle Usage">
                          <select style={selectStyle} value={formData.vehicleUsage} onChange={e => sf('vehicleUsage', e.target.value)}>
                            <option value="">Select…</option>
                            <option>Personal / family use</option><option>Commuting to work</option><option>Commercial / delivery</option><option>Ride-share (Ride, etc.)</option><option>Government / NGO</option>
                          </select>
                        </Field>
                        <Field label="Years Holding a Driver's License">
                          <select style={selectStyle} value={formData.yearsLicensed} onChange={e => sf('yearsLicensed', e.target.value)}>
                            <option value="">Select…</option>
                            <option>Less than 1 year</option><option>1–2 years</option><option>3–5 years</option><option>6–10 years</option><option>Over 10 years</option>
                          </select>
                        </Field>
                        <Field label="At-fault Accidents in the Last 3 Years">
                          <select style={selectStyle} value={formData.atFaultAccidents} onChange={e => sf('atFaultAccidents', e.target.value)}>
                            {['0','1','2','3+'].map(n => <option key={n}>{n}</option>)}
                          </select>
                        </Field>
                        <Field label="Approximate Current Mileage (km)">
                          <input type="number" style={inputStyle(false)} placeholder="e.g. 45000" value={formData.currentMileage} onChange={e => sf('currentMileage', e.target.value)} />
                        </Field>
                      </Grid>
                    </div>
                  )}

                  {productType === 'life' && (
                    <div>
                      <SectionHead number="3" title="Life Insurance Details" sub="Coverage amount and beneficiary information" />
                      <Grid>
                        <Field label="Desired Sum Insured (ETB)" required>
                          <input type="number" style={inputStyle(errors.desiredSumInsured)} placeholder="e.g. 500000" value={formData.desiredSumInsured} onChange={e => sf('desiredSumInsured', e.target.value)} />
                          {errors.desiredSumInsured && <div style={{ color: RED, fontSize: 11, marginTop: 3 }}>Required</div>}
                        </Field>
                        <Field label="Annual Personal Income (ETB)">
                          <input type="number" style={inputStyle(false)} placeholder="e.g. 240000" value={formData.annualIncome} onChange={e => sf('annualIncome', e.target.value)} />
                        </Field>
                        <Field label="Beneficiary Full Name" required>
                          <input style={inputStyle(errors.beneficiaryName)} placeholder="Full legal name" value={formData.beneficiaryName} onChange={e => sf('beneficiaryName', e.target.value)} />
                        </Field>
                        <Field label="Beneficiary Relationship">
                          <select style={selectStyle} value={formData.beneficiaryRelation} onChange={e => sf('beneficiaryRelation', e.target.value)}>
                            <option value="">Select…</option>
                            <option>Spouse</option><option>Child</option><option>Parent</option><option>Sibling</option><option>Other</option>
                          </select>
                        </Field>
                        <Field label="Occupation Risk Level">
                          <select style={selectStyle} value={formData.occupationRisk} onChange={e => sf('occupationRisk', e.target.value)}>
                            <option value="">Select…</option>
                            <option>Office / desk work (low risk)</option>
                            <option>Field / outdoor work (medium risk)</option>
                            <option>Manual / construction (medium-high risk)</option>
                            <option>Hazardous (mining, explosives, etc.) (high risk)</option>
                          </select>
                        </Field>
                        <Field label="Do you engage in high-risk activities?">
                          <select style={selectStyle} value={formData.highRiskActivities} onChange={e => sf('highRiskActivities', e.target.value)}>
                            <option value="">Select…</option>
                            <option>No high-risk activities</option>
                            <option>Extreme sports (climbing, skydiving, etc.)</option>
                            <option>Private aviation / piloting</option>
                            <option>Racing (car, motorcycle)</option>
                            <option>Multiple high-risk activities</option>
                          </select>
                        </Field>
                      </Grid>
                    </div>
                  )}

                  {productType === 'home' && (
                    <div>
                      <SectionHead number="3" title="Property Information" sub="Details about the property you want to insure" />
                      <Grid>
                        <Field label="Property Type" required>
                          <select style={inputStyle(errors.propertyType)} value={formData.propertyType} onChange={e => sf('propertyType', e.target.value)}>
                            <option value="">Select…</option>
                            <option>Apartment / Condominium</option><option>Villa / Detached house</option><option>Townhouse</option><option>Commercial building</option><option>Warehouse</option>
                          </select>
                        </Field>
                        <Field label="Year Built / Constructed">
                          <input type="number" style={inputStyle(false)} placeholder="e.g. 2010" value={formData.constructionYear} onChange={e => sf('constructionYear', e.target.value)} />
                        </Field>
                        <Field label="Floor Area (m²)">
                          <input type="number" style={inputStyle(false)} placeholder="e.g. 120" value={formData.floorAreaSqm} onChange={e => sf('floorAreaSqm', e.target.value)} />
                        </Field>
                        <Field label="City / Sub-city" required>
                          <input style={inputStyle(errors.propertyCity)} placeholder="e.g. Addis Ababa, Bole" value={formData.propertyCity} onChange={e => sf('propertyCity', e.target.value)} />
                        </Field>
                        <Field label="Ownership Type">
                          <select style={selectStyle} value={formData.ownershipType} onChange={e => sf('ownershipType', e.target.value)}>
                            <option value="">Select…</option>
                            <option>Fully owned (freehold)</option><option>Mortgage / ongoing loan</option><option>Rented (insuring contents)</option><option>Government-allocated</option>
                          </select>
                        </Field>
                        <Field label="Have there been any burglary or fire incidents?">
                          <select style={selectStyle} value={formData.previousIncidents} onChange={e => sf('previousIncidents', e.target.value)}>
                            <option value="">Select…</option>
                            <option>No prior incidents</option><option>Burglary (last 5 years)</option><option>Fire damage (last 5 years)</option><option>Flood damage (last 5 years)</option><option>Multiple incidents</option>
                          </select>
                        </Field>
                        <Field label="Security Features Installed" span={2}>
                          <CheckboxGroup
                            options={['CCTV / Security cameras', 'Security guard / watchman', 'Alarm system', 'Electronic access control', 'Safe / vault', 'Perimeter wall / fence', 'None']}
                            value={formData.securityFeatures}
                            onChange={v => sf('securityFeatures', v)}
                          />
                        </Field>
                      </Grid>
                    </div>
                  )}

                  {productType === 'travel' && (
                    <div>
                      <SectionHead number="3" title="Travel Information" sub="Details about your upcoming trip" />
                      <Grid>
                        <Field label="Destination Country / Region" required>
                          <input style={inputStyle(errors.destination)} placeholder="e.g. UAE, Europe (Schengen), USA" value={formData.destination} onChange={e => sf('destination', e.target.value)} />
                        </Field>
                        <Field label="Purpose of Travel">
                          <select style={selectStyle} value={formData.tripPurpose} onChange={e => sf('tripPurpose', e.target.value)}>
                            <option value="">Select…</option>
                            <option>Tourism / leisure</option><option>Business</option><option>Education / study abroad</option><option>Medical treatment</option><option>Family visit</option>
                          </select>
                        </Field>
                        <Field label="Departure Date" required>
                          <input type="date" style={inputStyle(errors.departureDate)} value={formData.departureDate} onChange={e => sf('departureDate', e.target.value)} />
                        </Field>
                        <Field label="Return Date" required>
                          <input type="date" style={inputStyle(errors.returnDate)} value={formData.returnDate} onChange={e => sf('returnDate', e.target.value)} />
                        </Field>
                        <Field label="Estimated Total Trip Cost (ETB)">
                          <input type="number" style={inputStyle(false)} placeholder="e.g. 80000" value={formData.estimatedTripCost} onChange={e => sf('estimatedTripCost', e.target.value)} />
                        </Field>
                        <Field label="Do you have any medical conditions requiring treatment abroad?">
                          <select style={selectStyle} value={formData.hasMedicalCondition} onChange={e => sf('hasMedicalCondition', e.target.value)}>
                            <option value="">Select…</option>
                            <option>No</option><option>Yes — stable, managed condition</option><option>Yes — active treatment ongoing</option>
                          </select>
                        </Field>
                      </Grid>
                    </div>
                  )}

                  {productType === 'business' && (
                    <div>
                      <SectionHead number="3" title="Business Information" sub="Details about your business and operations" />
                      <Grid>
                        <Field label="Business Type / Industry" required>
                          <input style={inputStyle(errors.businessType)} placeholder="e.g. Retail trade, Manufacturing, IT services" value={formData.businessType} onChange={e => sf('businessType', e.target.value)} />
                        </Field>
                        <Field label="Years in Operation">
                          <select style={selectStyle} value={formData.yearsInOperation} onChange={e => sf('yearsInOperation', e.target.value)}>
                            <option value="">Select…</option>
                            <option>Less than 1 year</option><option>1–3 years</option><option>4–7 years</option><option>8–15 years</option><option>Over 15 years</option>
                          </select>
                        </Field>
                        <Field label="Number of Employees">
                          <select style={selectStyle} value={formData.numEmployees} onChange={e => sf('numEmployees', e.target.value)}>
                            <option value="">Select…</option>
                            <option>1–5</option><option>6–20</option><option>21–50</option><option>51–200</option><option>Over 200</option>
                          </select>
                        </Field>
                        <Field label="Annual Revenue (ETB)">
                          <select style={selectStyle} value={formData.annualRevenueBand} onChange={e => sf('annualRevenueBand', e.target.value)}>
                            <option value="">Select…</option>
                            <option>Under ETB 500,000</option><option>ETB 500K – 2M</option><option>ETB 2M – 10M</option><option>ETB 10M – 50M</option><option>Over ETB 50M</option>
                          </select>
                        </Field>
                        <Field label="Business Premises">
                          <select style={selectStyle} value={formData.premisesType} onChange={e => sf('premisesType', e.target.value)}>
                            <option value="">Select…</option>
                            <option>Owned premises</option><option>Leased / rented</option><option>Home-based</option><option>Multiple locations</option>
                          </select>
                        </Field>
                        <Field label="Any previous business insurance claims?">
                          <select style={selectStyle} value={formData.previousBusinessClaims} onChange={e => sf('previousBusinessClaims', e.target.value)}>
                            <option value="">Select…</option>
                            <option>No prior claims</option><option>1 claim</option><option>2–3 claims</option><option>4+ claims</option>
                          </select>
                        </Field>
                      </Grid>
                    </div>
                  )}

                  <Divider />

                  {/* ── SECTION 4: Risk Assessment ── */}
                  <div>
                    <SectionHead number="4" title="Risk Assessment" sub="Your insurance history helps us calculate an accurate premium" />
                    <Grid>
                      <Field label="Previous Claims History" required>
                        <select style={inputStyle(errors.claimsHistory)} value={formData.claimsHistory} onChange={e => sf('claimsHistory', e.target.value)}>
                          <option value="">Select…</option>
                          <option value="none">None — No prior insurance claims</option>
                          <option value="low">Low — 1–2 minor claims ever</option>
                          <option value="moderate">Moderate — Regular claims, all resolved</option>
                          <option value="high">High — Frequent or large value claims</option>
                        </select>
                        {errors.claimsHistory && <div style={{ color: RED, fontSize: 11, marginTop: 3 }}>Required</div>}
                      </Field>
                      <Field label="How long have you held insurance coverage?">
                        <select style={selectStyle} value={formData.yearsInsured} onChange={e => sf('yearsInsured', e.target.value)}>
                          <option value="">Select…</option>
                          <option>First time purchasing insurance</option>
                          <option>Less than 2 years</option><option>2–5 years</option><option>6–10 years</option><option>Over 10 years</option>
                        </select>
                      </Field>
                      <Field label="Additional Notes for the Underwriter" span={2}>
                        <textarea style={{ ...inputStyle(false), resize: 'vertical' }} rows={3}
                          placeholder="Anything else you'd like the underwriter to know about your situation…"
                          value={formData.additionalNotes} onChange={e => sf('additionalNotes', e.target.value)} />
                      </Field>
                    </Grid>
                  </div>

                  <Divider />

                  {/* ── SECTION 5: Required Documents ── */}
                  <div>
                    <SectionHead number="5" title="Supporting Documents"
                      sub={`Please upload the following documents required for ${typeMeta?.label || 'this type of'} coverage`} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {requiredDocs.map(label => (
                        <DocSlot key={label} label={label} file={docUploads[label] || null} onUpload={handleDocUpload} onRemove={handleDocRemove} uploading={uploadingDoc} />
                      ))}
                    </div>
                    {/* Additional files */}
                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 8 }}>Additional files (optional)</div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: 9, color: '#374151', fontSize: 13, cursor: 'pointer', width: 'fit-content' }}>
                        <UploadOutlined /> Attach additional files
                        <input type="file" multiple hidden accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                          onChange={async (e) => {
                            for (const file of Array.from(e.target.files)) {
                              const label = `Additional: ${file.name}`;
                              await handleDocUpload(label, file);
                            }
                            e.target.value = '';
                          }} />
                      </label>
                    </div>
                    <div style={{ marginTop: 14, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 9, padding: '10px 14px', fontSize: 12, color: '#0c4a6e' }}>
                      🔒 All documents are encrypted and used only for underwriting. Max 5 MB per file (PDF, JPG, PNG, DOC).
                    </div>
                  </div>

                </div>

                {/* ── Modal footer ── */}
                <div style={{ padding: '18px 32px', borderTop: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'flex-end', flexShrink: 0 }}>
                  <div style={{ flex: 1, color: '#9ca3af', fontSize: 12 }}>
                    Fields marked <span style={{ color: RED }}>*</span> are required. An underwriter will review your application within 1–3 business days.
                  </div>
                  <button onClick={() => setReqOpen(false)} style={{ padding: '11px 22px', border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff', color: '#374151', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button onClick={handleRequest} disabled={submitting} style={{
                    padding: '11px 28px', border: 'none', borderRadius: 10,
                    background: submitting ? '#9ca3af' : NAVY,
                    color: '#fff', fontWeight: 700, fontSize: 14,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    {submitting ? <><LoadingOutlined /> Submitting…</> : <><CheckOutlined /> Submit Application</>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
