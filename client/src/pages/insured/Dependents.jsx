import { useEffect, useState, useCallback } from 'react';
import { Spin, message, DatePicker } from 'antd';
import dayjs from 'dayjs';
import {
  UserOutlined, PlusOutlined, ClockCircleOutlined, CheckCircleOutlined,
  CloseCircleOutlined, SyncOutlined, WarningOutlined, UploadOutlined,
  ArrowLeftOutlined, ArrowRightOutlined, InfoCircleOutlined, LoadingOutlined,
  SafetyOutlined, UserDeleteOutlined,
} from '@ant-design/icons';
import api from '../../api';

const NAVY  = '#1e3a5f';
const GREEN = '#22c55e';
const RED   = '#ef4444';
const AMBER = '#f59e0b';
const BLUE  = '#1d4ed8';

// ── Static config ──────────────────────────────────────────────────────────────

const RELATIONSHIP_META = {
  spouse:  {
    label: 'Spouse',
    icon: '💍',
    color: '#be185d', bg: '#fce7f3',
    eligibility: 'Legally married partner. Must provide valid marriage certificate. Coverage ends upon legal separation or divorce.',
    ageLimit: null,
  },
  child:   {
    label: 'Child',
    icon: '👶',
    color: '#16a34a', bg: '#dcfce7',
    eligibility: 'Biological, step, or adopted child. Typically covered up to age 21 (26 if enrolled full-time in school). Must provide birth or adoption certificate.',
    ageLimit: 26,
  },
  parent:  {
    label: 'Parent',
    icon: '👨‍👩‍👦',
    color: '#7c3aed', bg: '#ede9fe',
    eligibility: 'Biological or legal parent. Subject to underwriter eligibility assessment. Must provide proof of relationship.',
    ageLimit: null,
  },
  sibling: {
    label: 'Sibling',
    icon: '🤝',
    color: '#d97706', bg: '#fef3c7',
    eligibility: 'Biological or step-sibling who is financially dependent on the policyholder. Subject to underwriting review.',
    ageLimit: null,
  },
  other:   {
    label: 'Other',
    icon: '👤',
    color: '#6b7280', bg: '#f3f4f6',
    eligibility: 'Domestic partner or legal dependent. Must provide proof of financial dependence and relationship documentation.',
    ageLimit: null,
  },
};

const REQUIRED_DOCS = {
  spouse:  ['Marriage Certificate (certified copy)', 'National ID of Spouse', 'Recent passport-size photo of spouse'],
  child:   ['Birth Certificate', 'National ID (if over 15)', 'Student Enrollment Letter (if 18–26)'],
  parent:  ["Parent's National ID", 'Birth Certificate (proving parent–child relationship)', 'Proof of financial dependence'],
  sibling: ["Sibling's National ID", 'Birth Certificate (proving shared parentage)', 'Proof of financial dependence'],
  other:   ['National ID of dependent', 'Proof of legal relationship or domestic partnership', 'Proof of financial dependence'],
};

const QUALIFYING_EVENTS = [
  { value: 'annual_enrollment', label: 'Annual Enrollment Period', desc: 'Adding during the open enrollment window' },
  { value: 'marriage',          label: 'Marriage',                 desc: 'Newly married — adding spouse or step-children' },
  { value: 'birth',             label: 'Birth of Child',           desc: 'New biological child born' },
  { value: 'adoption',          label: 'Adoption',                 desc: 'Newly adopted child' },
  { value: 'loss_of_coverage',  label: 'Loss of Other Coverage',   desc: "Dependent lost coverage from another insurer's policy" },
  { value: 'other',             label: 'Other',                    desc: 'Describe the qualifying reason below' },
];

const STATUS_CFG = {
  pending:      { label: 'Pending Review',  color: AMBER,  bg: '#fef9c3', icon: <ClockCircleOutlined /> },
  under_review: { label: 'Under Review',    color: BLUE,   bg: '#dbeafe', icon: <SyncOutlined /> },
  approved:     { label: 'Approved',        color: '#16a34a', bg: '#dcfce7', icon: <CheckCircleOutlined /> },
  rejected:     { label: 'Rejected',        color: RED,    bg: '#fee2e2', icon: <CloseCircleOutlined /> },
};

const CHRONIC_CONDITIONS_DEP = ['Diabetes', 'Hypertension', 'Asthma', 'Heart Disease', 'Cancer', 'Kidney Disease', 'None'];

function calcAge(dob) {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000);
}

// ── Shared UI atoms ────────────────────────────────────────────────────────────

const inputStyle = (err) => ({
  width: '100%', padding: '10px 13px', border: `1.5px solid ${err ? RED : '#e5e7eb'}`,
  borderRadius: 9, fontSize: 13, color: '#111827', background: '#fff',
  outline: 'none', boxSizing: 'border-box',
});

function Label({ children, required }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
      {children}{required && <span style={{ color: RED }}> *</span>}
    </div>
  );
}

function StepDot({ n, active, done }) {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 800, flexShrink: 0,
      background: done ? GREEN : active ? NAVY : '#e5e7eb',
      color: done || active ? '#fff' : '#9ca3af',
    }}>
      {done ? '✓' : n}
    </div>
  );
}

// ── Per-document upload slot ───────────────────────────────────────────────────

function DocSlot({ label, file, onUpload, onRemove, uploading }) {
  const pickFile = () => {
    const el = document.createElement('input');
    el.type = 'file';
    el.accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx';
    el.onchange = e => e.target.files[0] && onUpload(label, e.target.files[0]);
    el.click();
  };
  return (
    <div style={{
      border: `1.5px solid ${file ? '#bbf7d0' : '#e5e7eb'}`, borderRadius: 10,
      padding: '11px 14px', background: file ? '#f0fdf4' : '#fafafa', transition: 'all 0.15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: file ? '#15803d' : '#374151' }}>{label}</div>
          {file && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{file.originalName}</div>}
        </div>
        {uploading === label
          ? <LoadingOutlined style={{ color: NAVY }} />
          : file
            ? <button onClick={() => onRemove(label)} style={{ background: '#fee2e2', border: 'none', borderRadius: 6, padding: '4px 10px', color: '#dc2626', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Remove</button>
            : <button onClick={pickFile} style={{ background: NAVY, border: 'none', borderRadius: 6, padding: '6px 12px', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                <UploadOutlined style={{ fontSize: 11 }} /> Upload
              </button>
        }
      </div>
    </div>
  );
}

function CheckboxPill({ label, checked, onChange }) {
  return (
    <div onClick={() => onChange(!checked)} style={{
      padding: '6px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
      border: `1.5px solid ${checked ? NAVY : '#e5e7eb'}`,
      background: checked ? '#eff6ff' : '#fff', color: checked ? NAVY : '#6b7280',
      transition: 'all 0.12s',
    }}>
      {checked ? '✓ ' : ''}{label}
    </div>
  );
}

// ── Add Dependent Modal (5-step) ───────────────────────────────────────────────

const emptyDepForm = () => ({
  relationship: '',
  firstName: '', lastName: '', dateOfBirth: '', gender: '', nationalId: '',
  qualifyingEvent: '', qualifyingEventDate: '', qualifyingEventNote: '',
  // health declaration
  hasHealthDeclaration: false,
  chronicConditions: [],
  currentMedications: '',
  smoker: '',
});

function AddDependentModal({ enrollment, open, onClose, onSubmitted }) {
  const [step, setStep]             = useState(1);
  const [form, setForm]             = useState(emptyDepForm());
  const [docUploads, setDocUploads] = useState({});
  const [uploadingDoc, setUploadingDoc] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors]         = useState({});

  useEffect(() => {
    if (open) { setStep(1); setForm(emptyDepForm()); setDocUploads({}); setErrors({}); }
  }, [open]);

  const sf = (key, val) => setForm(d => ({ ...d, [key]: val }));

  const relMeta   = RELATIONSHIP_META[form.relationship] || null;
  const reqDocs   = REQUIRED_DOCS[form.relationship]     || [];
  const isHealth  = ['health'].includes(enrollment?.product?.productType);

  const handleDocUpload = async (label, file) => {
    setUploadingDoc(label);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setDocUploads(d => ({ ...d, [label]: res.data }));
    } catch {
      message.error(`Failed to upload ${label}`);
    } finally { setUploadingDoc(null); }
  };

  const handleDocRemove = (label) => setDocUploads(d => { const n = { ...d }; delete n[label]; return n; });

  const validateStep = () => {
    const e = {};
    if (step === 1 && !form.relationship) e.relationship = 'Required';
    if (step === 2) {
      if (!form.firstName)    e.firstName   = 'Required';
      if (!form.lastName)     e.lastName    = 'Required';
      if (!form.dateOfBirth)  e.dateOfBirth = 'Required';
    }
    if (step === 3 && !form.qualifyingEvent) e.qualifyingEvent = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goNext = () => { if (validateStep()) setStep(s => s + 1); };
  const goBack = () => { setStep(s => s - 1); setErrors({}); };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const age = calcAge(form.dateOfBirth);
      await api.post('/endorsements', {
        enrollmentId: enrollment._id,
        type: 'add_dependent',
        details: {
          dependent: {
            firstName: form.firstName,
            lastName:  form.lastName,
            dateOfBirth: form.dateOfBirth,
            gender:    form.gender,
            nationalId: form.nationalId,
            relationship: form.relationship,
          },
          qualifyingEvent:     form.qualifyingEvent,
          qualifyingEventDate: form.qualifyingEventDate,
          qualifyingEventNote: form.qualifyingEventNote,
          documents: Object.values(docUploads),
          healthDeclaration: form.hasHealthDeclaration ? {
            chronicConditions:  form.chronicConditions,
            currentMedications: form.currentMedications,
            smoker:             form.smoker,
          } : null,
          calculatedAge: age,
        },
      });
      message.success('Dependent addition request submitted. Your insurer will review it within 1–3 business days.');
      onSubmitted();
      onClose();
    } catch (err) {
      message.error(err?.response?.data?.message || 'Failed to submit request');
    } finally { setSubmitting(false); }
  };

  if (!open || !enrollment) return null;

  const STEPS = ['Relationship', 'Personal Details', 'Qualifying Event', 'Documents', 'Review'];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 16px', backdropFilter: 'blur(3px)' }}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 680, maxHeight: '93vh', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(0,0,0,0.22)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ background: NAVY, padding: '20px 28px', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 17 }}>Add a Dependent</div>
              <div style={{ color: '#93c5fd', fontSize: 12, marginTop: 2 }}>{enrollment.product?.name} · {enrollment.tier?.name} · {enrollment.enrollmentNumber}</div>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, color: 'rgba(255,255,255,0.7)', width: 32, height: 32, cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>
          {/* Step progress */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            {STEPS.map((label, i) => {
              const n      = i + 1;
              const active = step === n;
              const done   = step > n;
              return (
                <div key={n} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'initial' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <StepDot n={n} active={active} done={done} />
                    <span style={{ fontSize: 10, fontWeight: 600, color: active ? '#fff' : done ? '#6ee7b7' : 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>{label}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div style={{ flex: 1, height: 2, background: done ? '#6ee7b7' : 'rgba(255,255,255,0.15)', marginBottom: 14, marginLeft: 4, marginRight: 4 }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '24px 28px' }}>

          {/* ── Step 1: Relationship ── */}
          {step === 1 && (
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#111827', marginBottom: 4 }}>Who are you adding?</div>
              <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 20 }}>Select your relationship to the person you want to cover under this policy.</div>
              {errors.relationship && <div style={{ color: RED, fontSize: 12, marginBottom: 12 }}>Please select a relationship.</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {Object.entries(RELATIONSHIP_META).map(([key, m]) => {
                  const sel = form.relationship === key;
                  return (
                    <div key={key} onClick={() => sf('relationship', key)} style={{
                      border: `2px solid ${sel ? m.color : '#e5e7eb'}`, borderRadius: 14, padding: '16px',
                      cursor: 'pointer', background: sel ? m.bg : '#fff', transition: 'all 0.15s',
                    }}>
                      <div style={{ fontSize: 26, marginBottom: 8 }}>{m.icon}</div>
                      <div style={{ fontWeight: 800, color: sel ? m.color : '#111827', fontSize: 15 }}>{m.label}</div>
                      <div style={{ color: '#6b7280', fontSize: 12, marginTop: 4, lineHeight: 1.5 }}>{m.eligibility.slice(0, 70)}…</div>
                    </div>
                  );
                })}
              </div>
              {relMeta && (
                <div style={{ marginTop: 16, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontWeight: 700, color: '#0369a1', fontSize: 13, marginBottom: 4 }}>Eligibility — {relMeta.label}</div>
                  <div style={{ color: '#0c4a6e', fontSize: 13, lineHeight: 1.6 }}>{relMeta.eligibility}</div>
                  {relMeta.ageLimit && (
                    <div style={{ marginTop: 8, color: '#0369a1', fontSize: 12, fontWeight: 600 }}>
                      ⚠ Coverage ends at age {relMeta.ageLimit} (or upon loss of student status)
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Personal Details ── */}
          {step === 2 && (
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#111827', marginBottom: 4 }}>Dependent's Personal Details</div>
              <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 20 }}>Provide accurate details exactly as they appear on official documents.</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 18px' }}>
                <div>
                  <Label required>First Name</Label>
                  <input style={inputStyle(errors.firstName)} value={form.firstName} onChange={e => sf('firstName', e.target.value)} placeholder="As on ID / Birth cert" />
                  {errors.firstName && <div style={{ color: RED, fontSize: 11, marginTop: 3 }}>{errors.firstName}</div>}
                </div>
                <div>
                  <Label required>Last Name</Label>
                  <input style={inputStyle(errors.lastName)} value={form.lastName} onChange={e => sf('lastName', e.target.value)} placeholder="Family / surname" />
                </div>
                <div>
                  <Label required>Date of Birth</Label>
                  <DatePicker style={{ width: '100%' }} status={errors.dateOfBirth ? 'error' : ''} value={form.dateOfBirth ? dayjs(form.dateOfBirth) : null} onChange={d => sf('dateOfBirth', d ? d.format('YYYY-MM-DD') : '')} />
                  {errors.dateOfBirth && <div style={{ color: RED, fontSize: 11, marginTop: 3 }}>{errors.dateOfBirth}</div>}
                  {form.dateOfBirth && calcAge(form.dateOfBirth) !== null && (
                    <div style={{ color: '#6b7280', fontSize: 11, marginTop: 3 }}>Age: {calcAge(form.dateOfBirth)} years</div>
                  )}
                </div>
                <div>
                  <Label>Gender</Label>
                  <select style={inputStyle(false)} value={form.gender} onChange={e => sf('gender', e.target.value)}>
                    <option value="">Select…</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <Label>National ID Number</Label>
                  <input style={inputStyle(false)} value={form.nationalId} onChange={e => sf('nationalId', e.target.value)} placeholder="National ID or passport number" />
                </div>
              </div>

              {/* Age warning for child */}
              {form.relationship === 'child' && calcAge(form.dateOfBirth) !== null && calcAge(form.dateOfBirth) >= 21 && (
                <div style={{ marginTop: 14, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#92400e', display: 'flex', gap: 8 }}>
                  <WarningOutlined style={{ marginTop: 2, flexShrink: 0 }} />
                  <span>This dependent is {calcAge(form.dateOfBirth)} years old. Children aged 21–26 must provide proof of full-time student enrollment. Coverage above 26 is not available for children.</span>
                </div>
              )}

              {/* Health declaration — only for health/life policies */}
              {isHealth && (
                <div style={{ marginTop: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ fontWeight: 700, color: '#111827', fontSize: 14 }}>Health Declaration</div>
                    <div onClick={() => sf('hasHealthDeclaration', !form.hasHealthDeclaration)} style={{
                      padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      border: `1.5px solid ${form.hasHealthDeclaration ? NAVY : '#e5e7eb'}`,
                      background: form.hasHealthDeclaration ? '#eff6ff' : '#fff',
                      color: form.hasHealthDeclaration ? NAVY : '#9ca3af',
                    }}>
                      {form.hasHealthDeclaration ? '✓ Enabled' : 'Enable'}
                    </div>
                  </div>
                  {form.hasHealthDeclaration ? (
                    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px' }}>
                      <div style={{ marginBottom: 12 }}>
                        <Label>Pre-existing conditions (select all that apply)</Label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {CHRONIC_CONDITIONS_DEP.map(c => (
                            <CheckboxPill key={c} label={c} checked={form.chronicConditions.includes(c)}
                              onChange={v => sf('chronicConditions', v ? [...form.chronicConditions, c] : form.chronicConditions.filter(x => x !== c))} />
                          ))}
                        </div>
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        <Label>Current medications (if any)</Label>
                        <textarea style={{ ...inputStyle(false), resize: 'vertical' }} rows={2} value={form.currentMedications} onChange={e => sf('currentMedications', e.target.value)} placeholder="List any prescribed medications…" />
                      </div>
                      <div>
                        <Label>Smoking status</Label>
                        <select style={inputStyle(false)} value={form.smoker} onChange={e => sf('smoker', e.target.value)}>
                          <option value="">Select…</option>
                          <option>Never</option><option>Former smoker</option><option>Occasional</option><option>Daily</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#0369a1' }}>
                      <InfoCircleOutlined style={{ marginRight: 6 }} />
                      For health policies, a medical declaration may be required by the underwriter. Enabling it now speeds up approval.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Qualifying Event ── */}
          {step === 3 && (
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#111827', marginBottom: 4 }}>Qualifying Life Event</div>
              <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 20 }}>
                Select the reason you are adding this dependent now. Dependents can normally only be added during the annual enrollment window or after a qualifying life event.
              </div>
              {errors.qualifyingEvent && <div style={{ color: RED, fontSize: 12, marginBottom: 10 }}>Please select a qualifying event.</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
                {QUALIFYING_EVENTS.map(ev => {
                  const sel = form.qualifyingEvent === ev.value;
                  return (
                    <div key={ev.value} onClick={() => sf('qualifyingEvent', ev.value)} style={{
                      border: `2px solid ${sel ? NAVY : '#e5e7eb'}`, borderRadius: 12, padding: '12px 16px',
                      cursor: 'pointer', background: sel ? '#f0f6ff' : '#fff', transition: 'all 0.15s',
                      display: 'flex', alignItems: 'center', gap: 12,
                    }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${sel ? NAVY : '#d1d5db'}`, background: sel ? NAVY : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {sel && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: sel ? NAVY : '#111827', fontSize: 14 }}>{ev.label}</div>
                        <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 1 }}>{ev.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {form.qualifyingEvent && form.qualifyingEvent !== 'annual_enrollment' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 18px' }}>
                  <div>
                    <Label required>Event Date</Label>
                    <DatePicker style={{ width: '100%' }} value={form.qualifyingEventDate ? dayjs(form.qualifyingEventDate) : null} onChange={d => sf('qualifyingEventDate', d ? d.format('YYYY-MM-DD') : '')} />
                  </div>
                  <div>
                    {form.qualifyingEvent === 'other' && (
                      <>
                        <Label required>Description</Label>
                        <input style={inputStyle(false)} value={form.qualifyingEventNote} onChange={e => sf('qualifyingEventNote', e.target.value)} placeholder="Briefly describe the event…" />
                      </>
                    )}
                  </div>
                </div>
              )}
              <div style={{ marginTop: 16, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#92400e' }}>
                <WarningOutlined style={{ marginRight: 6 }} />
                Qualifying life events typically have a <strong>30-day window</strong> after the event. Adding a dependent outside this window or the annual enrollment period may be declined.
              </div>
            </div>
          )}

          {/* ── Step 4: Documents ── */}
          {step === 4 && (
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#111827', marginBottom: 4 }}>Supporting Documents</div>
              <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 6 }}>
                Upload the documents required to verify your {relMeta?.label?.toLowerCase() || 'dependent'}'s eligibility. These are mandatory for approval.
              </div>
              <div style={{ background: '#f0f6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '9px 13px', fontSize: 12, color: '#1e40af', marginBottom: 18, display: 'flex', gap: 7 }}>
                <InfoCircleOutlined style={{ marginTop: 1, flexShrink: 0 }} />
                <span>Documents are reviewed by an underwriter. Unclear or incorrect documents will delay approval. Max 5 MB per file (PDF, JPG, PNG).</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                {reqDocs.map(label => (
                  <DocSlot key={label} label={label} file={docUploads[label] || null} onUpload={handleDocUpload} onRemove={handleDocRemove} uploading={uploadingDoc} />
                ))}
              </div>
              {/* Additional optional upload */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: 9, color: '#374151', fontSize: 13, cursor: 'pointer', width: 'fit-content' }}>
                <UploadOutlined /> Attach additional supporting files (optional)
                <input type="file" multiple hidden accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={async (e) => {
                    for (const file of Array.from(e.target.files)) await handleDocUpload(`Additional: ${file.name}`, file);
                    e.target.value = '';
                  }} />
              </label>
            </div>
          )}

          {/* ── Step 5: Review ── */}
          {step === 5 && (
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#111827', marginBottom: 16 }}>Review & Submit</div>

              {/* Dependent summary */}
              <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 14, padding: '18px 20px', marginBottom: 16 }}>
                <div style={{ fontWeight: 700, color: '#111827', fontSize: 14, marginBottom: 14 }}>Dependent Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
                  {[
                    ['Full Name',     `${form.firstName} ${form.lastName}`],
                    ['Relationship',  relMeta?.label || form.relationship],
                    ['Date of Birth', form.dateOfBirth ? new Date(form.dateOfBirth).toLocaleDateString() : '—'],
                    ['Age',           calcAge(form.dateOfBirth) !== null ? `${calcAge(form.dateOfBirth)} years` : '—'],
                    ['Gender',        form.gender || '—'],
                    ['National ID',   form.nationalId || '—'],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <div style={{ color: '#9ca3af', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{k}</div>
                      <div style={{ color: '#111827', fontSize: 13, fontWeight: 600, marginTop: 1 }}>{v}</div>
                    </div>
                  ))}
                </div>
                {form.hasHealthDeclaration && form.chronicConditions.length > 0 && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
                    <div style={{ color: '#9ca3af', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Health Declaration</div>
                    <div style={{ color: '#374151', fontSize: 13 }}>Conditions: {form.chronicConditions.join(', ')}</div>
                  </div>
                )}
              </div>

              {/* Qualifying event */}
              <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 14, padding: '14px 20px', marginBottom: 16 }}>
                <div style={{ fontWeight: 700, color: '#111827', fontSize: 14, marginBottom: 8 }}>Qualifying Event</div>
                <div style={{ color: '#374151', fontSize: 13 }}>
                  {QUALIFYING_EVENTS.find(e => e.value === form.qualifyingEvent)?.label || '—'}
                  {form.qualifyingEventDate && <span style={{ color: '#9ca3af', marginLeft: 8 }}>· {new Date(form.qualifyingEventDate).toLocaleDateString()}</span>}
                </div>
              </div>

              {/* Documents */}
              <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 14, padding: '14px 20px', marginBottom: 16 }}>
                <div style={{ fontWeight: 700, color: '#111827', fontSize: 14, marginBottom: 8 }}>Documents Uploaded</div>
                {Object.keys(docUploads).length === 0 ? (
                  <div style={{ color: '#ef4444', fontSize: 13 }}>⚠ No documents uploaded. Approval may be delayed.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {Object.entries(docUploads).map(([label, f]) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13 }}>
                        <CheckCircleOutlined style={{ color: GREEN, fontSize: 12 }} />
                        <span style={{ color: '#374151' }}>{label}</span>
                        <span style={{ color: '#9ca3af', fontSize: 11 }}>— {f.originalName}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Premium notice */}
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '14px 16px', fontSize: 13, color: '#1e40af' }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>💰 Premium Impact</div>
                <div style={{ lineHeight: 1.6 }}>
                  Adding a dependent typically increases your annual premium. The exact revised amount will be calculated by your insurer's underwriting team and communicated to you upon approval. <strong>No charge is made until you explicitly accept the revised premium.</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 28px', borderTop: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
          {step > 1
            ? <button onClick={goBack} style={{ padding: '10px 18px', border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff', color: '#374151', fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><ArrowLeftOutlined style={{ fontSize: 13 }} /> Back</button>
            : <button onClick={onClose} style={{ padding: '10px 18px', border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff', color: '#374151', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
          }
          <div style={{ flex: 1, color: '#9ca3af', fontSize: 12 }}>
            Step {step} of {STEPS.length} — {STEPS[step - 1]}
          </div>
          {step < 5 ? (
            <button onClick={goNext} style={{ padding: '10px 22px', background: NAVY, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
              Continue <ArrowRightOutlined style={{ fontSize: 13 }} />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting} style={{ padding: '10px 24px', background: submitting ? '#9ca3af' : GREEN, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 14, cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              {submitting ? <LoadingOutlined /> : <CheckCircleOutlined />}
              {submitting ? 'Submitting…' : 'Submit Request'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Dependent card ─────────────────────────────────────────────────────────────

function DependentCard({ dependent, enrollmentId, onRemoveRequested }) {
  const m   = RELATIONSHIP_META[dependent.relationship] || RELATIONSHIP_META.other;
  const age = calcAge(dependent.dateOfBirth);

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 44, height: 44, borderRadius: '50%', background: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
        {m.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, color: '#111827', fontSize: 14 }}>{dependent.firstName} {dependent.lastName}</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
          <span style={{ background: m.bg, color: m.color, borderRadius: 20, padding: '2px 9px', fontSize: 11, fontWeight: 700 }}>{m.label}</span>
          {age !== null && <span style={{ color: '#9ca3af', fontSize: 12 }}>{age} yrs</span>}
          {dependent.gender && <span style={{ color: '#9ca3af', fontSize: 12, textTransform: 'capitalize' }}>{dependent.gender}</span>}
          {dependent.dateOfBirth && <span style={{ color: '#9ca3af', fontSize: 12 }}>b. {new Date(dependent.dateOfBirth).toLocaleDateString()}</span>}
        </div>
        {dependent.nationalId && <div style={{ color: '#9ca3af', fontSize: 11, marginTop: 2 }}>ID: {dependent.nationalId}</div>}
      </div>
      <div style={{ display: 'flex', flex: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
        <span style={{ background: '#dcfce7', color: '#16a34a', borderRadius: 20, padding: '2px 9px', fontSize: 11, fontWeight: 700 }}>● Active</span>
        <button onClick={() => onRemoveRequested(dependent)} style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, padding: '4px 10px', color: '#dc2626', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
          <UserDeleteOutlined style={{ fontSize: 11 }} /> Remove
        </button>
      </div>
    </div>
  );
}

// ── Pending request badge ──────────────────────────────────────────────────────

function PendingRequestCard({ endorsement }) {
  const cfg  = STATUS_CFG[endorsement.status] || STATUS_CFG.pending;
  const dep  = endorsement.details?.dependent || {};
  const isAdd = endorsement.type === 'add_dependent';
  const rel  = RELATIONSHIP_META[dep.relationship] || RELATIONSHIP_META.other;

  return (
    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
        {isAdd ? rel.icon : '❌'}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, color: '#111827', fontSize: 13 }}>
          {isAdd ? `Adding ${rel.label}: ${dep.firstName} ${dep.lastName}` : `Remove request`}
        </div>
        <div style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>
          Submitted {new Date(endorsement.createdAt).toLocaleDateString()}
          {endorsement.details?.qualifyingEvent && ` · ${QUALIFYING_EVENTS.find(e => e.value === endorsement.details.qualifyingEvent)?.label}`}
        </div>
        {endorsement.reviewNote && <div style={{ color: '#374151', fontSize: 12, marginTop: 4, background: '#fff', borderRadius: 6, padding: '4px 8px', border: '1px solid #e5e7eb' }}>Note: {endorsement.reviewNote}</div>}
      </div>
      <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
        {cfg.icon} {cfg.label}
      </span>
    </div>
  );
}

// ── Remove dependent mini-modal ────────────────────────────────────────────────

function RemoveModal({ enrollment, dependent, open, onClose, onSubmitted }) {
  const [reason, setReason]   = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (open) setReason(''); }, [open]);

  const submit = async () => {
    if (!reason.trim()) { message.error('Please provide a reason for removal.'); return; }
    setLoading(true);
    try {
      await api.post('/endorsements', {
        enrollmentId: enrollment._id,
        type: 'remove_dependent',
        details: { dependentId: dependent._id, dependentName: `${dependent.firstName} ${dependent.lastName}`, reason },
      });
      message.success('Removal request submitted. Your insurer will process it shortly.');
      onSubmitted();
      onClose();
    } catch (err) {
      message.error(err?.response?.data?.message || 'Failed to submit request');
    } finally { setLoading(false); }
  };

  if (!open) return null;
  const m = RELATIONSHIP_META[dependent?.relationship] || RELATIONSHIP_META.other;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(3px)' }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 460, boxShadow: '0 24px 64px rgba(0,0,0,0.18)', overflow: 'hidden' }}>
        <div style={{ background: '#fef2f2', padding: '18px 22px', borderBottom: '1px solid #fecaca', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 800, color: '#991b1b', fontSize: 16 }}>Remove Dependent</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 16, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: '#f9fafb', borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 24 }}>{m.icon}</div>
            <div>
              <div style={{ fontWeight: 700, color: '#111827' }}>{dependent?.firstName} {dependent?.lastName}</div>
              <div style={{ color: '#6b7280', fontSize: 12 }}>{m.label}</div>
            </div>
          </div>
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#991b1b' }}>
            ⚠ This will submit a removal request to your insurer. Coverage for this dependent ends on the effective date approved by the insurer.
          </div>
          <div>
            <Label required>Reason for removal</Label>
            <select style={inputStyle(false)} value={reason} onChange={e => setReason(e.target.value)}>
              <option value="">Select a reason…</option>
              <option>Divorce / legal separation</option>
              <option>Child reached maximum coverage age</option>
              <option>Dependent obtained own insurance coverage</option>
              <option>Death of dependent</option>
              <option>Dependent no longer financially dependent</option>
              <option>Other</option>
            </select>
          </div>
        </div>
        <div style={{ padding: '14px 22px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px 0', border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff', fontWeight: 600, cursor: 'pointer', color: '#374151' }}>Cancel</button>
          <button onClick={submit} disabled={loading} style={{ flex: 2, padding: '10px 0', border: 'none', borderRadius: 10, background: loading ? '#9ca3af' : '#dc2626', color: '#fff', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {loading ? <LoadingOutlined /> : <UserDeleteOutlined />}
            {loading ? 'Submitting…' : 'Submit Removal Request'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function InsuredDependents() {
  const [enrollments, setEnrollments]   = useState([]);
  const [endorsements, setEndorsements] = useState([]);
  const [loading, setLoading]           = useState(true);

  const [addTarget, setAddTarget]       = useState(null); // enrollment to add dependent to
  const [removeTarget, setRemoveTarget] = useState(null); // { enrollment, dependent }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [enrRes, endRes] = await Promise.all([
        api.get('/enrollments').then(async r => {
          const list = Array.isArray(r.data.enrollments) ? r.data.enrollments : [];
          return Promise.all(
            list
              .filter(e => ['active', 'pending_renewal'].includes(e.status))
              .map(e => api.get(`/enrollments/${e._id}`).then(d => d.data.enrollment))
          );
        }),
        api.get('/endorsements', { params: { type: 'dependent' } }).catch(() => ({ data: { endorsements: [] } })),
      ]);
      setEnrollments(enrRes);
      const allEnd = Array.isArray(endRes.data.endorsements) ? endRes.data.endorsements : [];
      setEndorsements(allEnd.filter(e => ['add_dependent', 'remove_dependent'].includes(e.type)));
    } catch (err) {
      console.error('Dependents load failed:', err);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>;

  const totalDependents = enrollments.reduce((sum, e) => sum + (e.insuredPersons?.[0]?.dependents?.length || 0), 0);
  const pending = endorsements.filter(e => ['pending', 'under_review'].includes(e.status));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Page header */}
      <div>
        <h2 style={{ margin: 0, color: '#111827', fontWeight: 800, fontSize: 22 }}>Dependents & Family Coverage</h2>
        <div style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>
          Manage family members covered under your active policies
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        {[
          { label: 'COVERED DEPENDENTS', value: totalDependents, color: GREEN,  icon: <SafetyOutlined /> },
          { label: 'PENDING REQUESTS',   value: pending.length,  color: AMBER,  icon: <ClockCircleOutlined /> },
          { label: 'ACTIVE POLICIES',    value: enrollments.length, color: NAVY, icon: <CheckCircleOutlined /> },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, fontSize: 17, marginBottom: 10 }}>{s.icon}</div>
            <div style={{ color: '#6b7280', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>{s.label}</div>
            <div style={{ color: '#111827', fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* No active enrollments */}
      {enrollments.length === 0 && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '48px 24px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <SafetyOutlined style={{ fontSize: 48, color: '#d1d5db', marginBottom: 16 }} />
          <div style={{ fontWeight: 700, color: '#111827', fontSize: 16, marginBottom: 8 }}>No Active Coverage</div>
          <div style={{ color: '#6b7280', fontSize: 14 }}>You need an active insurance policy before adding dependents. Go to My Benefits to apply for coverage.</div>
        </div>
      )}

      {/* Per-enrollment sections */}
      {enrollments.map(enr => {
        const person   = enr.insuredPersons?.[0];
        const deps     = person?.dependents || [];
        const enrEnds  = endorsements.filter(e => e.enrollment?._id === enr._id || e.enrollment === enr._id);
        const pendingEnr = enrEnds.filter(e => ['pending','under_review'].includes(e.status));

        return (
          <div key={enr._id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            {/* Card header */}
            <div style={{ background: NAVY, padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>{enr.product?.name}</div>
                <div style={{ color: '#93c5fd', fontSize: 12, marginTop: 2 }}>{enr.tier?.name} · {enr.enrollmentNumber}</div>
              </div>
              <button
                onClick={() => setAddTarget(enr)}
                style={{ background: GREEN, border: 'none', borderRadius: 9, padding: '8px 16px', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <PlusOutlined /> Add Dependent
              </button>
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* Active dependents */}
              <div>
                <div style={{ fontWeight: 700, color: '#111827', fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircleOutlined style={{ color: GREEN }} />
                  Covered Dependents ({deps.length})
                  {enr.tier?.maxDependents > 0 && (
                    <span style={{ color: '#9ca3af', fontSize: 12, fontWeight: 400 }}>· max {enr.tier.maxDependents} on this tier</span>
                  )}
                </div>
                {deps.length === 0 ? (
                  <div style={{ background: '#f9fafb', border: '1px dashed #e5e7eb', borderRadius: 12, padding: '24px', textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>👨‍👩‍👧‍👦</div>
                    <div style={{ color: '#9ca3af', fontSize: 14, marginBottom: 6 }}>No dependents added yet</div>
                    <div style={{ color: '#9ca3af', fontSize: 12 }}>Click "Add Dependent" above to start the application process.</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {deps.map((d, i) => (
                      <DependentCard
                        key={d._id || i}
                        dependent={d}
                        enrollmentId={enr._id}
                        onRemoveRequested={(dep) => setRemoveTarget({ enrollment: enr, dependent: dep })}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Pending requests */}
              {pendingEnr.length > 0 && (
                <div>
                  <div style={{ fontWeight: 700, color: '#111827', fontSize: 14, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ClockCircleOutlined style={{ color: AMBER }} />
                    Pending Requests ({pendingEnr.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {pendingEnr.map(e => <PendingRequestCard key={e._id} endorsement={e} />)}
                  </div>
                </div>
              )}

              {/* Recent history */}
              {enrEnds.filter(e => ['approved','rejected'].includes(e.status)).length > 0 && (
                <div>
                  <div style={{ fontWeight: 700, color: '#111827', fontSize: 14, marginBottom: 10 }}>Recent History</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {enrEnds.filter(e => ['approved','rejected'].includes(e.status)).slice(0, 5).map(e => {
                      const cfg = STATUS_CFG[e.status];
                      const dep = e.details?.dependent || {};
                      const isAdd = e.type === 'add_dependent';
                      return (
                        <div key={e._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#f9fafb', borderRadius: 9 }}>
                          <span style={{ color: cfg.color, fontSize: 14 }}>{cfg.icon}</span>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontWeight: 600, fontSize: 13, color: '#374151' }}>
                              {isAdd ? `${dep.firstName} ${dep.lastName} added` : 'Removal processed'}
                            </span>
                            <span style={{ color: '#9ca3af', fontSize: 12, marginLeft: 8 }}>{new Date(e.updatedAt || e.createdAt).toLocaleDateString()}</span>
                          </div>
                          <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{cfg.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Policy info note */}
      <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 12, padding: '16px 20px', fontSize: 13, color: '#0369a1' }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>ℹ About Dependent Coverage</div>
        <div style={{ lineHeight: 1.7 }}>
          Dependents are covered under the same plan as the primary policyholder. Adding or removing a dependent requires an endorsement request reviewed by the insurer.
          Coverage for a dependent ends when they no longer meet eligibility criteria — for example, a child reaching the maximum covered age or a divorce.
          A revised premium may apply upon adding dependents.
        </div>
      </div>

      {/* Add Dependent Modal */}
      <AddDependentModal
        enrollment={addTarget}
        open={!!addTarget}
        onClose={() => setAddTarget(null)}
        onSubmitted={load}
      />

      {/* Remove Dependent Modal */}
      <RemoveModal
        enrollment={removeTarget?.enrollment}
        dependent={removeTarget?.dependent}
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onSubmitted={load}
      />
    </div>
  );
}
