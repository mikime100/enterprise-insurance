// ─── Dependent / endorsement config — shared by dependents screens ────────────

export type RelMeta = { label: string; icon: string; color: string; bg: string; eligibility: string; ageLimit: number | null };

export const REL_META: Record<string, RelMeta> = {
  spouse:  { label: 'Spouse',  icon: '💍', color: '#be185d', bg: '#fce7f3',
    eligibility: 'Legally married partner. Requires a valid marriage certificate. Coverage ends on legal separation or divorce.', ageLimit: null },
  child:   { label: 'Child',   icon: '👶', color: '#16a34a', bg: '#dcfce7',
    eligibility: 'Biological, step, or adopted child. Covered up to age 21 (26 if a full-time student). Requires a birth or adoption certificate.', ageLimit: 26 },
  parent:  { label: 'Parent',  icon: '👨‍👩‍👦', color: '#7c3aed', bg: '#ede9fe',
    eligibility: 'Biological or legal parent. Subject to underwriter eligibility. Requires proof of relationship.', ageLimit: null },
  sibling: { label: 'Sibling', icon: '🤝', color: '#d97706', bg: '#fef3c7',
    eligibility: 'Biological or step-sibling who is financially dependent on you. Subject to underwriting review.', ageLimit: null },
  other:   { label: 'Other',   icon: '👤', color: '#6b7280', bg: '#f3f4f6',
    eligibility: 'Domestic partner or legal dependent. Requires proof of financial dependence and relationship.', ageLimit: null },
};

export const REQUIRED_DOCS: Record<string, string[]> = {
  spouse:  ['Marriage Certificate (certified copy)', 'National ID of spouse', 'Passport-size photo of spouse'],
  child:   ['Birth Certificate', 'National ID (if over 15)', 'Student Enrollment Letter (if 18–26)'],
  parent:  ["Parent's National ID", 'Birth Certificate (proving parent–child relationship)', 'Proof of financial dependence'],
  sibling: ["Sibling's National ID", 'Birth Certificate (proving shared parentage)', 'Proof of financial dependence'],
  other:   ['National ID of dependent', 'Proof of legal relationship or partnership', 'Proof of financial dependence'],
};

export const QUALIFYING_EVENTS = [
  { value: 'annual_enrollment', label: 'Annual Enrollment',     desc: 'Adding during the open enrollment window' },
  { value: 'marriage',          label: 'Marriage',              desc: 'Newly married — adding spouse or step-children' },
  { value: 'birth',             label: 'Birth of Child',        desc: 'New biological child born' },
  { value: 'adoption',          label: 'Adoption',              desc: 'Newly adopted child' },
  { value: 'loss_of_coverage',  label: 'Loss of Coverage',      desc: 'Dependent lost coverage from another insurer' },
  { value: 'other',             label: 'Other',                 desc: 'Describe the qualifying reason' },
];

export const DEP_STATUS: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending:      { label: 'Pending',      color: '#d97706', bg: '#fef9c3', icon: 'time' },
  under_review: { label: 'Under Review', color: '#1d4ed8', bg: '#dbeafe', icon: 'sync' },
  approved:     { label: 'Approved',     color: '#16a34a', bg: '#dcfce7', icon: 'checkmark-circle' },
  rejected:     { label: 'Rejected',     color: '#dc2626', bg: '#fee2e2', icon: 'close-circle' },
};

export const CHRONIC_CONDITIONS = ['Diabetes', 'Hypertension', 'Asthma', 'Heart Disease', 'Cancer', 'Kidney Disease', 'None'];

export const calcAge = (dob?: string | Date): number | null =>
  !dob ? null : Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000);
