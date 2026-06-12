// ─── Enterprise Insurance mobile design system ───────────────────────────────

export const C = {
  navy:      '#1e3a5f',
  navyDark:  '#0a1628',
  navyMid:   '#0d2040',
  green:     '#22c55e',
  greenDark: '#16a34a',
  blue:      '#2563eb',
  blueDeep:  '#1d4ed8',
  purple:    '#7c3aed',
  amber:     '#f59e0b',
  red:       '#ef4444',
  cyan:      '#0891b2',
  ink:       '#111827',
  slate:     '#374151',
  gray:      '#6b7280',
  grayLight: '#9ca3af',
  line:      '#e5e7eb',
  lineSoft:  '#f3f4f6',
  bg:        '#f6f8fb',
  card:      '#ffffff',
};

export const R = { sm: 10, md: 14, lg: 18, xl: 24 };

export const SHADOW = {
  card: {
    shadowColor: '#0a1628', shadowOpacity: 0.06, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  float: {
    shadowColor: '#0a1628', shadowOpacity: 0.16, shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
};

// ─── Claim status config — full parity with web portal ───────────────────────

export type StatusCfg = { color: string; bg: string; label: string; icon: string; step?: number };

export const CLAIM_STATUS: Record<string, StatusCfg> = {
  submitted:                { color: '#1d4ed8', bg: '#dbeafe', label: 'Submitted',          icon: 'paper-plane',        step: 0 },
  acknowledged:             { color: '#0891b2', bg: '#cffafe', label: 'Acknowledged',       icon: 'checkmark-done',     step: 1 },
  under_review:             { color: '#2563eb', bg: '#dbeafe', label: 'Under Review',       icon: 'search',             step: 2 },
  documentation_requested:  { color: '#d97706', bg: '#fef3c7', label: 'Docs Requested',     icon: 'document-attach',    step: 2 },
  investigation:            { color: '#7c3aed', bg: '#ede9fe', label: 'Investigation',      icon: 'eye',                step: 2 },
  assessment:               { color: '#0369a1', bg: '#e0f2fe', label: 'Assessment',         icon: 'calculator',         step: 3 },
  awaiting_client_approval: { color: '#9333ea', bg: '#f3e8ff', label: 'Offer Received',     icon: 'cash',               step: 4 },
  disputed:                 { color: '#ea580c', bg: '#ffedd5', label: 'Disputed',           icon: 'alert-circle',       step: 4 },
  pending_finance_approval: { color: '#d97706', bg: '#fef3c7', label: 'Finance Approval',   icon: 'hourglass',          step: 4 },
  approved:                 { color: '#16a34a', bg: '#dcfce7', label: 'Approved',           icon: 'checkmark-circle',   step: 4 },
  partially_approved:       { color: '#059669', bg: '#d1fae5', label: 'Partly Approved',    icon: 'checkmark-circle',   step: 4 },
  denied:                   { color: '#dc2626', bg: '#fee2e2', label: 'Denied',             icon: 'close-circle',       step: 4 },
  payment_initiated:        { color: '#2563eb', bg: '#dbeafe', label: 'Payment Initiated',  icon: 'card',               step: 5 },
  settled:                  { color: '#16a34a', bg: '#dcfce7', label: 'Settled',            icon: 'shield-checkmark',   step: 6 },
  closed:                   { color: '#6b7280', bg: '#f3f4f6', label: 'Closed',             icon: 'archive',            step: 6 },
};

export const statusCfg = (s?: string): StatusCfg =>
  CLAIM_STATUS[s || ''] || { color: '#6b7280', bg: '#f3f4f6', label: (s || 'Unknown').replace(/_/g, ' '), icon: 'help-circle' };

// Stages shown on the claim progress tracker
export const CLAIM_STAGES = ['Filed', 'Received', 'Review', 'Assessed', 'Decision', 'Payment', 'Settled'];

// ─── Claim types ──────────────────────────────────────────────────────────────

export const CLAIM_TYPE_LABELS: Record<string, string> = {
  inpatient: 'Inpatient', outpatient: 'Outpatient', dental: 'Dental',
  optical: 'Optical', maternity: 'Maternity', pharmacy: 'Pharmacy',
  emergency: 'Emergency', auto_accident: 'Auto Accident',
  property_damage: 'Property Damage', liability: 'Liability',
  death: 'Death / Life', disability: 'Disability', travel: 'Travel', other: 'Other',
};

export const CLAIM_TYPE_ICONS: Record<string, string> = {
  inpatient: 'bed', outpatient: 'medkit', dental: 'happy', optical: 'glasses',
  maternity: 'heart', pharmacy: 'bandage', emergency: 'flash',
  auto_accident: 'car-sport', property_damage: 'home', liability: 'people',
  death: 'flower', disability: 'accessibility', travel: 'airplane', other: 'ellipsis-horizontal',
};

export const CLAIM_TYPES_BY_PRODUCT: Record<string, string[]> = {
  auto:       ['auto_accident', 'property_damage', 'liability', 'other'],
  home:       ['property_damage', 'liability', 'other'],
  renters:    ['property_damage', 'liability', 'other'],
  business:   ['property_damage', 'liability', 'auto_accident', 'other'],
  life:       ['death', 'disability', 'other'],
  disability: ['disability', 'other'],
  health:     ['inpatient', 'outpatient', 'dental', 'optical', 'maternity', 'pharmacy', 'emergency', 'death', 'disability', 'other'],
  travel:     ['travel', 'emergency', 'inpatient', 'outpatient', 'other'],
  pet:        ['inpatient', 'outpatient', 'emergency', 'pharmacy', 'other'],
};

export const ALL_CLAIM_TYPES = Object.keys(CLAIM_TYPE_LABELS);

export const THIRD_PARTY_TYPES = ['auto_accident', 'property_damage', 'liability'];

export const DOC_TYPES = [
  { value: 'receipt',        label: 'Receipt / Invoice', icon: 'receipt' },
  { value: 'medical_report', label: 'Medical Report',    icon: 'medkit' },
  { value: 'police_report',  label: 'Police Report',     icon: 'shield' },
  { value: 'photo',          label: 'Photo / Evidence',  icon: 'image' },
  { value: 'invoice',        label: 'Repair Invoice',    icon: 'construct' },
  { value: 'other',          label: 'Other',             icon: 'document' },
];

// Server returns relative /api/uploads/... URLs — absolutise for mobile
export const SERVER_ROOT = 'https://enterprise-insurance-api.onrender.com';
export const absUrl = (u?: string) =>
  !u ? '' : u.startsWith('http') ? u : `${SERVER_ROOT}${u.startsWith('/') ? '' : '/'}${u}`;

export const fmtMoney = (n?: number | null) =>
  n == null ? '—' : `ETB ${Number(n).toLocaleString()}`;

export const fmtDate = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
