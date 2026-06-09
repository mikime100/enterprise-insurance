import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Spin, Divider, message } from 'antd';
import {
  CheckCircleOutlined, InfoCircleOutlined, ArrowRightOutlined,
  PlusOutlined, CloseOutlined, SafetyOutlined,
  CheckOutlined, LoadingOutlined, EditOutlined, StopOutlined, DownloadOutlined,
  WarningOutlined, SyncOutlined, FileTextOutlined,
} from '@ant-design/icons';
import api from '../../api';
import axios from 'axios';

const GREEN = '#22c55e';
const BLUE  = '#1d4ed8';
const NAVY  = '#1e3a5f';
const API   = import.meta.env.VITE_API_URL || '/api';

const TYPE_META = {
  health:   { emoji: '🏥', color: '#16a34a', bg: '#dcfce7', label: 'Health' },
  life:     { emoji: '🛡️',  color: '#2563eb', bg: '#dbeafe', label: 'Life' },
  auto:     { emoji: '🚗',  color: '#d97706', bg: '#fef3c7', label: 'Auto' },
  home:     { emoji: '🏠',  color: '#7c3aed', bg: '#ede9fe', label: 'Home' },
  travel:   { emoji: '✈️',  color: '#0891b2', bg: '#cffafe', label: 'Travel' },
  business: { emoji: '🏢',  color: '#be185d', bg: '#fce7f3', label: 'Business' },
};
const typeMeta = t => TYPE_META[t] || { emoji: '📋', color: NAVY, bg: '#f1f5f9', label: t };

function barColor(pct) {
  return pct >= 80 ? '#ef4444' : pct >= 50 ? '#f59e0b' : GREEN;
}

function UsageBar({ label, used, limit, sub }) {
  const pct   = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const color = barColor(pct);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <div style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>{label}</div>
          {sub && <div style={{ color: '#6b7280', fontSize: 12, marginTop: 1 }}>{sub}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ background: pct >= 80 ? '#fee2e2' : pct >= 50 ? '#fef9c3' : '#dcfce7', color, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
            {pct}% used
          </span>
          <div style={{ color: '#6b7280', fontSize: 11, marginTop: 3 }}>
            {used.toLocaleString()} / {limit.toLocaleString()} ETB
          </div>
        </div>
      </div>
      <div style={{ height: 10, background: '#f3f4f6', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 10, transition: 'width 0.8s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ color: '#9ca3af', fontSize: 11 }}>{used.toLocaleString()} ETB claimed</span>
        <span style={{ color: '#9ca3af', fontSize: 11 }}>{(limit - used).toLocaleString()} ETB remaining</span>
      </div>
    </div>
  );
}

// ── Active enrollment card ────────────────────────────────────────────────────

function EnrollmentCard({ enrollment, claimUsage, onRequestChange }) {
  const now      = new Date();
  const start    = new Date(enrollment.startDate);
  const end      = new Date(enrollment.endDate);
  const daysLeft = Math.max(0, Math.ceil((end - now) / 86400000));
  const timePct  = Math.min(100, Math.round(((now - start) / (end - start)) * 100));
  const [downloading, setDownloading] = useState(false);

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const res = await api.get(`/enrollments/${enrollment._id}/policy-document`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `Policy-${enrollment.enrollmentNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      message.error('Could not download policy document. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const coverageBars = (enrollment.tier?.coverages || []).map(tc => {
    const cov   = tc.coverage;
    const limit = tc.customLimit || cov?.limits?.annual || 0;
    const key   = (cov?.name || '').toLowerCase().replace(/[_ ]/g, '');
    return { name: cov?.name || '—', desc: cov?.description, limit, used: claimUsage[key] || 0 };
  }).filter(c => c.limit > 0);

  const meta = typeMeta(enrollment.product?.productType);

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      <div style={{ background: NAVY, padding: '20px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            <span style={{ background: 'rgba(34,197,94,0.2)', color: '#4ade80', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
              ● ACTIVE
            </span>
            <span style={{ background: meta.bg, color: meta.color, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
              {meta.emoji} {meta.label}
            </span>
            <span style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.65)', borderRadius: 20, padding: '2px 10px', fontSize: 11 }}>
              {enrollment.enrollmentNumber}
            </span>
          </div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>{enrollment.product?.name}</div>
          <div style={{ color: '#93c5fd', fontSize: 13, marginTop: 3 }}>{enrollment.tier?.name} tier</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Valid until</div>
          <div style={{ color: daysLeft < 30 ? '#fbbf24' : '#fff', fontWeight: 700, fontSize: 15 }}>
            {end.toLocaleDateString()} · {daysLeft} days left
          </div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 }}>
            ETB {enrollment.premium?.amount?.toLocaleString()} / yr
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button
              onClick={downloadPdf}
              disabled={downloading}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: 8, padding: '6px 13px', color: '#fff', fontSize: 12, fontWeight: 600,
                cursor: downloading ? 'not-allowed' : 'pointer', opacity: downloading ? 0.7 : 1,
              }}
              onMouseEnter={e => { if (!downloading) e.currentTarget.style.background = 'rgba(255,255,255,0.22)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
            >
              {downloading ? <LoadingOutlined style={{ fontSize: 12 }} /> : <DownloadOutlined style={{ fontSize: 12 }} />}
              {downloading ? 'Generating…' : 'Certificate'}
            </button>
            <button
              onClick={() => onRequestChange && onRequestChange(enrollment)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: 8, padding: '6px 13px', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.22)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
            >
              <EditOutlined style={{ fontSize: 12 }} /> Request Change
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Policy timeline */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: '#6b7280', fontSize: 13 }}>Policy period</span>
            <span style={{ color: daysLeft < 30 ? '#ef4444' : '#374151', fontWeight: 600, fontSize: 13 }}>
              {timePct}% elapsed · {daysLeft} days remaining
            </span>
          </div>
          <div style={{ height: 10, background: '#f3f4f6', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${timePct}%`, background: daysLeft < 30 ? '#ef4444' : BLUE, borderRadius: 10 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ color: '#9ca3af', fontSize: 11 }}>{start.toLocaleDateString()}</span>
            <span style={{ color: '#9ca3af', fontSize: 11 }}>{end.toLocaleDateString()}</span>
          </div>
        </div>

        <Divider style={{ margin: 0 }} />

        {/* Coverage usage */}
        {coverageBars.length > 0 ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span style={{ fontWeight: 700, color: '#111827', fontSize: 15 }}>Coverage Usage This Year</span>
              <span style={{ background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: 20, padding: '2px 9px', fontSize: 11 }}>
                <InfoCircleOutlined style={{ marginRight: 4 }} />Based on approved claims
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {coverageBars.map((c, i) => <UsageBar key={i} label={c.name} used={c.used} limit={c.limit} sub={c.desc} />)}
            </div>
          </div>
        ) : (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckCircleOutlined style={{ color: GREEN, fontSize: 18 }} />
            <div>
              <div style={{ fontWeight: 700, color: '#15803d' }}>Full coverage available</div>
              <div style={{ color: '#6b7280', fontSize: 13 }}>No claims made yet — all benefits are unused.</div>
            </div>
          </div>
        )}

        {/* Covered services detail */}
        {(enrollment.tier?.coverages || []).length > 0 && (
          <>
            <Divider style={{ margin: 0 }} />
            <div>
              <div style={{ fontWeight: 700, color: '#111827', fontSize: 15, marginBottom: 12 }}>Covered Services</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                {enrollment.tier.coverages.map((tc, i) => {
                  const cov   = tc.coverage;
                  const limit = tc.customLimit || cov?.limits?.annual || 0;
                  return (
                    <div key={i} style={{ background: '#f9fafb', borderRadius: 12, padding: 14, border: '1px solid #e5e7eb' }}>
                      <div style={{ fontWeight: 700, color: '#111827', fontSize: 13, marginBottom: 4 }}>{cov?.name}</div>
                      {cov?.description && <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 8 }}>{cov.description}</div>}
                      {limit > 0 && <div style={{ fontWeight: 700, color: GREEN, fontSize: 13 }}>{limit.toLocaleString()} ETB / yr</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Available product card — links to quote application ────────────────────────

function ProductCard({ product, onApply }) {
  const meta      = typeMeta(product.productType);
  const tiers     = product.tiers || [];
  const minPrice  = tiers.length ? Math.min(...tiers.map(t => t.annualPremium)) : null;
  const maxPrice  = tiers.length > 1 ? Math.max(...tiers.map(t => t.annualPremium)) : null;
  // Key benefits from cheapest tier
  const keyBenefits = (tiers[0]?.coverages || []).slice(0, 4);

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
      {/* Card header */}
      <div style={{ background: `linear-gradient(135deg, ${meta.color}12 0%, ${meta.color}06 100%)`, borderBottom: `1px solid ${meta.color}22`, padding: '20px 22px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ width: 54, height: 54, borderRadius: 14, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>
          {meta.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: meta.color, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4, background: meta.bg, display: 'inline-block', borderRadius: 6, padding: '2px 8px' }}>
            {meta.label}
          </div>
          <div style={{ fontWeight: 800, color: '#111827', fontSize: 16, lineHeight: 1.3 }}>{product.name}</div>
          {product.description && (
            <div style={{ color: '#6b7280', fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>
              {product.description.slice(0, 85)}{product.description.length > 85 ? '…' : ''}
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
        {/* Premium range */}
        {minPrice != null && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb', borderRadius: 10, padding: '10px 14px' }}>
            <span style={{ color: '#6b7280', fontSize: 12, fontWeight: 600 }}>Annual premium</span>
            <span style={{ fontWeight: 800, color: NAVY, fontSize: 15 }}>
              ETB {minPrice.toLocaleString()}{maxPrice ? ` – ${maxPrice.toLocaleString()}` : ''}
            </span>
          </div>
        )}

        {/* Tier pills */}
        {tiers.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Available tiers</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {tiers.map(t => (
                <span key={t._id} style={{ background: '#f0f6ff', color: NAVY, borderRadius: 20, padding: '4px 11px', fontSize: 12, fontWeight: 600 }}>
                  {t.name} · ETB {t.annualPremium?.toLocaleString()}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Key benefits */}
        {keyBenefits.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>What's covered</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {keyBenefits.map((tc, i) => {
                const cov   = tc.coverage;
                const limit = tc.customLimit || cov?.limits?.annual;
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <CheckCircleOutlined style={{ color: GREEN, fontSize: 12, flexShrink: 0 }} />
                      <span style={{ color: '#374151', fontSize: 13 }}>{cov?.name}</span>
                    </div>
                    {limit && <span style={{ color: '#6b7280', fontSize: 12, fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>up to {limit.toLocaleString()} ETB</span>}
                  </div>
                );
              })}
              {(product.tiers?.[0]?.coverages?.length || 0) > 4 && (
                <div style={{ color: '#9ca3af', fontSize: 12, marginLeft: 19 }}>+ {(product.tiers[0].coverages.length - 4)} more benefits</div>
              )}
            </div>
          </div>
        )}

        {/* Info note */}
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 9, padding: '9px 12px', fontSize: 12, color: '#1e40af', display: 'flex', gap: 7, alignItems: 'flex-start' }}>
          <InfoCircleOutlined style={{ marginTop: 1, flexShrink: 0 }} />
          <span>No commitment yet — submitting an application starts the underwriting review. An underwriter will assess your details and send you a personalised offer.</span>
        </div>

        {/* CTA button */}
        <button
          onClick={onApply}
          style={{
            marginTop: 'auto', width: '100%', padding: '12px 0',
            background: NAVY, border: 'none', borderRadius: 10,
            color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#1a3356'; }}
          onMouseLeave={e => { e.currentTarget.style.background = NAVY; }}
        >
          <FileTextOutlined /> Apply for this Coverage <ArrowRightOutlined />
        </button>
      </div>
    </div>
  );
}

// ── Endorsement modal ─────────────────────────────────────────────────────────

const ENDORSEMENT_TYPES = [
  { value: 'tier_change',      label: 'Change Coverage Tier',     desc: 'Upgrade or downgrade your plan tier' },
  { value: 'add_dependent',    label: 'Add a Dependent',          desc: 'Add a family member to your coverage' },
  { value: 'remove_dependent', label: 'Remove a Dependent',       desc: 'Remove a dependent from your coverage' },
  { value: 'contact_update',   label: 'Update Contact Info',      desc: 'Change your phone number or email' },
  { value: 'suspension',       label: 'Request Suspension',       desc: 'Temporarily pause your coverage' },
  { value: 'cancellation',     label: 'Cancel Policy',            desc: 'Permanently cancel this enrollment' },
];

function EndorsementModal({ enrollment, open, onClose, onSubmitted }) {
  const [step, setStep]             = useState(1);
  const [type, setType]             = useState('');
  const [details, setDetails]       = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (open) { setStep(1); setType(''); setDetails({}); } }, [open]);

  const submit = async () => {
    setSubmitting(true);
    try {
      await api.post('/endorsements', { enrollmentId: enrollment._id, type, details });
      message.success('Change request submitted. Your insurer will review it shortly.');
      onSubmitted();
      onClose();
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not submit request');
    } finally { setSubmitting(false); }
  };

  if (!open) return null;

  const set = (key, val) => setDetails(d => ({ ...d, [key]: val }));
  const setDep = (key, val) => setDetails(d => ({ ...d, dependent: { ...(d.dependent || {}), [key]: val } }));

  const canSubmit = (() => {
    if (!type) return false;
    if (type === 'tier_change')      return !!details.requestedTierId;
    if (type === 'add_dependent')    return details.dependent?.firstName && details.dependent?.lastName && details.dependent?.relationship;
    if (type === 'remove_dependent') return !!details.dependentId;
    if (type === 'contact_update')   return details.field && details.newValue;
    if (type === 'suspension')       return !!details.reason;
    if (type === 'cancellation')     return !!details.reason;
    return false;
  })();

  const dependents = enrollment.insuredPersons?.[0]?.dependents || [];
  const tiers = enrollment.product?.tiers || [];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}>
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 520, margin: '0 16px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ background: NAVY, padding: '20px 24px', borderRadius: '18px 18px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>Request a Policy Change</div>
            <div style={{ color: '#93c5fd', fontSize: 12, marginTop: 2 }}>{enrollment.enrollmentNumber} · {enrollment.product?.name}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ padding: 24 }}>
          {step === 1 && (
            <div>
              <div style={{ color: '#374151', fontWeight: 600, fontSize: 14, marginBottom: 14 }}>What would you like to change?</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {ENDORSEMENT_TYPES.map(t => {
                  const sel = type === t.value;
                  const isDanger = t.value === 'cancellation' || t.value === 'suspension';
                  return (
                    <div key={t.value} onClick={() => setType(t.value)} style={{
                      border: `2px solid ${sel ? (isDanger ? '#ef4444' : NAVY) : '#e5e7eb'}`,
                      borderRadius: 12, padding: '12px 16px', cursor: 'pointer',
                      background: sel ? (isDanger ? '#fef2f2' : '#f0f6ff') : '#fff', transition: 'all 0.15s',
                    }}>
                      <div style={{ fontWeight: 700, color: sel ? (isDanger ? '#dc2626' : NAVY) : '#111827', fontSize: 14 }}>{t.label}</div>
                      <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 2 }}>{t.desc}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button onClick={onClose} style={{ flex: 1, padding: '11px 0', border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff', color: '#374151', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button onClick={() => setStep(2)} disabled={!type} style={{ flex: 2, padding: '11px 0', border: 'none', borderRadius: 10, background: type ? NAVY : '#e5e7eb', color: type ? '#fff' : '#9ca3af', fontWeight: 700, cursor: type ? 'pointer' : 'not-allowed' }}>
                  Continue →
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 13, cursor: 'pointer', marginBottom: 16, padding: 0 }}>← Back</button>

              {type === 'tier_change' && (
                <div>
                  <div style={{ fontWeight: 600, color: '#111827', marginBottom: 10 }}>Select New Tier</div>
                  {tiers.length === 0 && <div style={{ color: '#9ca3af', fontSize: 13 }}>No tier options available. Contact your insurer.</div>}
                  {tiers.filter(t => t._id !== enrollment.tier?._id).map(t => (
                    <div key={t._id} onClick={() => set('requestedTierId', t._id)} style={{
                      border: `2px solid ${details.requestedTierId === t._id ? NAVY : '#e5e7eb'}`,
                      borderRadius: 12, padding: '12px 16px', marginBottom: 8, cursor: 'pointer',
                      background: details.requestedTierId === t._id ? '#f0f6ff' : '#fff',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 700, color: '#111827' }}>{t.name}</span>
                        <span style={{ fontWeight: 700, color: GREEN }}>ETB {t.annualPremium?.toLocaleString()}/yr</span>
                      </div>
                    </div>
                  ))}
                  <input placeholder="Reason for change (optional)" value={details.reason || ''} onChange={e => set('reason', e.target.value)}
                    style={{ width: '100%', marginTop: 8, padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              )}

              {type === 'add_dependent' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontWeight: 600, color: '#111827', marginBottom: 2 }}>Dependent Details</div>
                  {[['firstName','First Name'],['lastName','Last Name']].map(([k,l]) => (
                    <input key={k} placeholder={l} value={details.dependent?.[k] || ''} onChange={e => setDep(k, e.target.value)}
                      style={{ padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 13 }} />
                  ))}
                  <input type="date" value={details.dependent?.dateOfBirth || ''} onChange={e => setDep('dateOfBirth', e.target.value)}
                    style={{ padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 13 }} />
                  <select value={details.dependent?.relationship || ''} onChange={e => setDep('relationship', e.target.value)}
                    style={{ padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 13, background: '#fff' }}>
                    <option value="">Relationship…</option>
                    {['spouse','child','parent','sibling','other'].map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
                  </select>
                  <select value={details.dependent?.gender || ''} onChange={e => setDep('gender', e.target.value)}
                    style={{ padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 13, background: '#fff' }}>
                    <option value="">Gender (optional)</option>
                    {['male','female','other'].map(g => <option key={g} value={g}>{g.charAt(0).toUpperCase()+g.slice(1)}</option>)}
                  </select>
                </div>
              )}

              {type === 'remove_dependent' && (
                <div>
                  <div style={{ fontWeight: 600, color: '#111827', marginBottom: 10 }}>Select Dependent to Remove</div>
                  {dependents.length === 0
                    ? <div style={{ color: '#9ca3af', fontSize: 13 }}>No dependents on record.</div>
                    : dependents.map(d => (
                      <div key={d._id} onClick={() => set('dependentId', d._id)} style={{
                        border: `2px solid ${details.dependentId === d._id ? '#ef4444' : '#e5e7eb'}`,
                        borderRadius: 12, padding: '12px 16px', marginBottom: 8, cursor: 'pointer',
                        background: details.dependentId === d._id ? '#fef2f2' : '#fff',
                      }}>
                        <div style={{ fontWeight: 700 }}>{d.firstName} {d.lastName}</div>
                        <div style={{ color: '#9ca3af', fontSize: 12 }}>{d.relationship}</div>
                      </div>
                    ))
                  }
                </div>
              )}

              {type === 'contact_update' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontWeight: 600, color: '#111827', marginBottom: 2 }}>Update Contact Info</div>
                  <select value={details.field || ''} onChange={e => set('field', e.target.value)}
                    style={{ padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 13, background: '#fff' }}>
                    <option value="">Select field…</option>
                    <option value="phone">Phone Number</option>
                    <option value="email">Email Address</option>
                  </select>
                  <input placeholder="New value" value={details.newValue || ''} onChange={e => set('newValue', e.target.value)}
                    style={{ padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 13 }} />
                </div>
              )}

              {(type === 'suspension' || type === 'cancellation') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 14px', color: '#991b1b', fontSize: 13 }}>
                    {type === 'cancellation'
                      ? '⚠️ This will permanently cancel your policy. This cannot be undone once approved.'
                      : '⚠️ Your coverage will be paused. Claims during suspension will not be covered.'}
                  </div>
                  <textarea placeholder="Reason *" value={details.reason || ''} onChange={e => set('reason', e.target.value)} rows={3}
                    style={{ padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 13, resize: 'vertical' }} />
                  <input type="date" placeholder="Requested effective date" value={details.requestedDate || ''} onChange={e => set('requestedDate', e.target.value)}
                    style={{ padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 13 }} />
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button onClick={onClose} style={{ flex: 1, padding: '11px 0', border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff', color: '#374151', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button onClick={submit} disabled={!canSubmit || submitting} style={{
                  flex: 2, padding: '11px 0', border: 'none', borderRadius: 10,
                  background: canSubmit && !submitting ? NAVY : '#e5e7eb',
                  color: canSubmit && !submitting ? '#fff' : '#9ca3af',
                  fontWeight: 700, cursor: canSubmit && !submitting ? 'pointer' : 'not-allowed',
                }}>
                  {submitting ? 'Submitting…' : 'Submit Request'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Renewal banner ─────────────────────────────────────────────────────────────

function RenewalBanner({ enrollment, onRenew, renewing }) {
  const daysLeft = Math.max(0, Math.ceil((new Date(enrollment.endDate) - new Date()) / 86400000));
  const urgent   = daysLeft <= 7;

  return (
    <div style={{
      background: urgent ? '#fef2f2' : '#fffbeb',
      border: `1.5px solid ${urgent ? '#fca5a5' : '#fde68a'}`,
      borderRadius: 12, padding: '14px 20px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <WarningOutlined style={{ color: urgent ? '#ef4444' : '#d97706', fontSize: 20, flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: 700, color: urgent ? '#991b1b' : '#92400e', fontSize: 14 }}>
            {urgent ? `Urgent: Policy expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}!` : `Your policy expires in ${daysLeft} days`}
          </div>
          <div style={{ color: urgent ? '#b91c1c' : '#78350f', fontSize: 13, marginTop: 2 }}>
            Renew now to avoid a gap in coverage. Your plan and tier stay the same.
          </div>
        </div>
      </div>
      <button onClick={() => onRenew(enrollment)} disabled={renewing} style={{
        background: urgent ? '#ef4444' : '#f59e0b', border: 'none', borderRadius: 9,
        padding: '10px 20px', color: '#fff', fontWeight: 700, fontSize: 13,
        cursor: renewing ? 'not-allowed' : 'pointer', opacity: renewing ? 0.7 : 1,
        display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0, whiteSpace: 'nowrap',
      }}>
        {renewing ? <LoadingOutlined /> : <SyncOutlined />}
        {renewing ? 'Processing…' : 'Renew Now'}
      </button>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function InsuredCoverage() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();

  const [enrollments, setEnrollments]         = useState([]);
  const [claims, setClaims]                   = useState([]);
  const [products, setProducts]               = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [renewingId, setRenewingId]           = useState(null);
  const [endorseEnrollment, setEndorseEnrollment] = useState(null);
  const [paymentStatus, setPaymentStatus]     = useState(null);

  const load = useCallback(async () => {
    try {
      const [enrollRes, claimsRes, productsRes] = await Promise.all([
        api.get('/enrollments').then(async r => {
          const list = Array.isArray(r.data.enrollments) ? r.data.enrollments : [];
          return Promise.all(list.map(e => api.get(`/enrollments/${e._id}`).then(d => d.data.enrollment)));
        }),
        api.get('/claims'),
        axios.get(`${API}/products`, { params: { withTiers: 'true' }, withCredentials: true }),
      ]);
      setEnrollments(enrollRes);
      setClaims(Array.isArray(claimsRes.data.claims) ? claimsRes.data.claims : []);
      setProducts(productsRes.data.products || productsRes.data || []);
    } catch (err) {
      console.error('Coverage load failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle Chapa payment return
  useEffect(() => {
    const chapaStatus = searchParams.get('chapa_status');
    const txRef       = searchParams.get('tx_ref');
    if (chapaStatus === 'success' && txRef) {
      setPaymentStatus('verifying');
      api.get(`/chapa/verify/${txRef}`)
        .then(() => {
          setPaymentStatus('success');
          message.success('Payment verified! Your coverage is now active.', 5);
          load();
          navigate('/insured/coverage', { replace: true });
        })
        .catch(() => {
          setPaymentStatus('failed');
          message.error('Payment verification failed. Please contact support.', 6);
          navigate('/insured/coverage', { replace: true });
        });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRenew = async (enrollment) => {
    setRenewingId(enrollment._id);
    try {
      const renewRes = await api.post(`/enrollments/${enrollment._id}/renew`);
      const chapaRes = await api.post('/chapa/initialize', { enrollmentId: renewRes.data.enrollment._id });
      window.location.href = chapaRes.data.checkout_url;
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not start renewal. Please try again.');
      setRenewingId(null);
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>;

  // Build claim usage map
  const claimUsage = {};
  claims.filter(c => ['approved', 'settled', 'partially_approved'].includes(c.status)).forEach(c => {
    const key = (c.claimType || '').toLowerCase().replace(/[_ ]/g, '');
    claimUsage[key] = (claimUsage[key] || 0) + (c.approvedAmount || c.claimedAmount || 0);
  });

  const activeStatuses     = ['active', 'pending_renewal'];
  const activeEnrollments  = enrollments.filter(e => activeStatuses.includes(e.status));
  const enrolledProductIds = new Set(enrollments.map(e => e.product?._id?.toString()));
  const availableProducts  = products.filter(p => p.isActive !== false && !enrolledProductIds.has(p._id?.toString()));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Payment status banners */}
      {paymentStatus === 'verifying' && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <LoadingOutlined style={{ color: '#d97706', fontSize: 18 }} />
          <div>
            <div style={{ fontWeight: 700, color: '#92400e' }}>Verifying your payment…</div>
            <div style={{ color: '#78350f', fontSize: 13 }}>Please wait while we confirm your transaction.</div>
          </div>
        </div>
      )}
      {paymentStatus === 'success' && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <CheckCircleOutlined style={{ color: GREEN, fontSize: 20 }} />
          <div>
            <div style={{ fontWeight: 700, color: '#15803d' }}>Payment successful! Coverage activated.</div>
            <div style={{ color: '#166534', fontSize: 13 }}>Your new plan is now active below.</div>
          </div>
        </div>
      )}

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, color: '#111827', fontWeight: 800, fontSize: 22 }}>My Benefits & Coverage</h2>
          <div style={{ color: '#6b7280', fontSize: 14, marginTop: 3 }}>
            {activeEnrollments.length > 0
              ? `${activeEnrollments.length} active plan${activeEnrollments.length > 1 ? 's' : ''} · ${availableProducts.length} more available`
              : 'Explore plans below and submit an application to get covered'}
          </div>
        </div>
        {availableProducts.length > 0 && (
          <button
            onClick={() => document.getElementById('explore-plans')?.scrollIntoView({ behavior: 'smooth' })}
            style={{ background: NAVY, border: 'none', borderRadius: 10, color: '#fff', padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <PlusOutlined /> Explore More Plans
          </button>
        )}
      </div>

      {/* ── SECTION 1: Active coverage ──────────────────────────────────── */}
      {activeEnrollments.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontWeight: 700, color: '#111827', fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <SafetyOutlined style={{ color: GREEN }} /> My Active Plans
          </div>
          {activeEnrollments.map(e => (
            <div key={e._id} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {e.status === 'pending_renewal' && (
                <RenewalBanner enrollment={e} onRenew={handleRenew} renewing={renewingId === e._id} />
              )}
              <EnrollmentCard enrollment={e} claimUsage={claimUsage} onRequestChange={setEndorseEnrollment} />
            </div>
          ))}
        </div>
      )}

      {/* ── SECTION 2: Explore available plans ─────────────────────────── */}
      <div id="explore-plans">
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 700, color: '#111827', fontSize: 16, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <PlusOutlined style={{ color: BLUE }} />
            {activeEnrollments.length > 0 ? 'Explore More Coverage Plans' : 'Available Insurance Plans'}
          </div>
          <div style={{ color: '#6b7280', fontSize: 13, lineHeight: 1.6 }}>
            {activeEnrollments.length > 0
              ? 'Expand your protection with additional coverage. Each plan below requires a quote application — our underwriters will review your details and send you a personalised premium offer within 1–3 business days.'
              : 'Browse the coverage options below. Click "Apply for this Coverage" to start a quote application. No payment is required until you accept an approved offer.'}
          </div>
        </div>

        {availableProducts.length === 0 && activeEnrollments.length > 0 ? (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: '36px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🎉</div>
            <div style={{ fontWeight: 700, color: '#15803d', fontSize: 16, marginBottom: 6 }}>You're enrolled in all available plans!</div>
            <div style={{ color: '#6b7280', fontSize: 14 }}>Check back later for new products added by your insurer.</div>
          </div>
        ) : availableProducts.length === 0 ? (
          <div style={{ background: NAVY, borderRadius: 16, padding: '48px 24px', textAlign: 'center' }}>
            <SafetyOutlined style={{ fontSize: 48, color: 'rgba(255,255,255,0.25)', marginBottom: 16 }} />
            <div style={{ fontWeight: 700, color: '#fff', fontSize: 18, marginBottom: 8 }}>No Plans Available Yet</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
              No insurance products are available right now. Please contact support or check back later.
            </div>
          </div>
        ) : (
          <>
            {/* How it works — shown only when no active plans */}
            {activeEnrollments.length === 0 && (
              <div style={{ background: '#f0f6ff', border: '1px solid #bfdbfe', borderRadius: 14, padding: '18px 22px', marginBottom: 20 }}>
                <div style={{ fontWeight: 700, color: '#1e40af', fontSize: 14, marginBottom: 10 }}>How the application process works</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                  {[
                    { step: '1', label: 'Choose a plan', icon: '👆', desc: 'Click Apply on any plan below' },
                    { step: '2', label: 'Fill application', icon: '📝', desc: 'Complete the detailed quote form' },
                    { step: '3', label: 'Underwriting review', icon: '🔍', desc: 'We review within 1–3 business days' },
                    { step: '4', label: 'Accept & Pay', icon: '✅', desc: 'Accept the offer and pay via Chapa' },
                  ].map(s => (
                    <div key={s.step} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1e40af', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{s.step}</div>
                      <div>
                        <div style={{ fontWeight: 700, color: '#1e40af', fontSize: 13 }}>{s.icon} {s.label}</div>
                        <div style={{ color: '#3b82f6', fontSize: 12, marginTop: 1 }}>{s.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 18 }}>
              {availableProducts.map(p => (
                <ProductCard
                  key={p._id}
                  product={p}
                  onApply={() => navigate(`/insured/quotes?productId=${p._id}`)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Endorsement / change request modal */}
      <EndorsementModal
        enrollment={endorseEnrollment}
        open={!!endorseEnrollment}
        onClose={() => setEndorseEnrollment(null)}
        onSubmitted={load}
      />
    </div>
  );
}
