import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Spin, Divider, Drawer, Modal, message, Tag, Input } from 'antd';
import {
  CheckCircleOutlined, InfoCircleOutlined, ArrowRightOutlined,
  PlusOutlined, CloseOutlined, SafetyOutlined, CreditCardOutlined,
  CheckOutlined, LoadingOutlined, EditOutlined, StopOutlined, DownloadOutlined,
  WarningOutlined, SyncOutlined,
} from '@ant-design/icons';

const EXCLUSIONS_COV = {
  health: ['Pre-existing conditions during the waiting period','Cosmetic or elective procedures','Experimental treatments not approved by medical authority','Self-inflicted injuries','Injuries from illegal activities','Infertility or assisted reproduction'],
  auto:   ['Mechanical breakdown not caused by accident','Normal wear and tear','Driving under the influence','Racing or speed testing','War or civil unrest','Driving without a valid licence'],
  life:   ['Suicide within the first 2 years','Death from illegal activities','Death from war/civil unrest','Undisclosed pre-existing terminal illness'],
};
const getExclusionsCov = t => EXCLUSIONS_COV[t] || ['Pre-existing conditions during waiting period','Illegal activities','War and civil unrest','Fraud or misrepresentation'];

function agreementTextCov(tierName, productName, premium) {
  return `ENTERPRISE INSURANCE S.C. — POLICY AGREEMENT
Plan: ${productName} — ${tierName} | Annual Premium: ETB ${(premium||0).toLocaleString()} | Version: v1.0

1. COVERAGE — Takes effect upon payment confirmation and remains active for one (1) policy year.
2. PREMIUM — ETB ${(premium||0).toLocaleString()} is due in full upon enrollment. Policy is inactive until payment is confirmed.
3. PLAN CHANGES — Allowed within 30 days of policy start. Later changes subject to underwriting review.
4. CLAIMS — Must be submitted within 90 days of incident with supporting documentation. Enterprise Insurance reserves the right to investigate.
5. EXCLUSIONS — Standard exclusions apply as listed. Claims from excluded conditions will not be honored.
6. WAITING PERIOD — Certain benefits have a waiting period. Emergency services are exempt.
7. CANCELLATION — 30 days written notice required. Pro-rated refund minus 10% admin fee; no refund after 11 months.
8. DATA PRIVACY — Information processed per Ethiopian data protection law; shared with service providers only for claims.
9. MISREPRESENTATION — Material misrepresentation may result in cancellation and forfeiture of premiums.
10. DISPUTES — Resolved via NIBE (Ethiopian Insurance Regulatory Authority) if direct negotiation fails within 30 days.

By signing, you confirm: you are 18+, all registration information is accurate, and you have read and agree to all terms.`;
}
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
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: 8, padding: '6px 13px',
                color: '#fff', fontSize: 12, fontWeight: 600,
                cursor: downloading ? 'not-allowed' : 'pointer',
                opacity: downloading ? 0.7 : 1,
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
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: 8, padding: '6px 13px',
                color: '#fff', fontSize: 12, fontWeight: 600,
                cursor: 'pointer',
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
                      {limit > 0 && (
                        <div style={{ fontWeight: 700, color: GREEN, fontSize: 13 }}>
                          {limit.toLocaleString()} ETB / yr
                        </div>
                      )}
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

function ProductCard({ product, isEnrolled, onSelect }) {
  const meta      = typeMeta(product.productType);
  const minPrice  = product.tiers?.length
    ? Math.min(...product.tiers.map(t => t.annualPremium))
    : null;

  return (
    <div
      onClick={() => !isEnrolled && onSelect(product)}
      style={{
        background: '#fff',
        border: `2px solid ${isEnrolled ? '#bbf7d0' : '#e5e7eb'}`,
        borderRadius: 16,
        padding: 20,
        cursor: isEnrolled ? 'default' : 'pointer',
        transition: 'all 0.18s',
        position: 'relative',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      }}
      onMouseEnter={e => { if (!isEnrolled) e.currentTarget.style.borderColor = NAVY; }}
      onMouseLeave={e => { if (!isEnrolled) e.currentTarget.style.borderColor = '#e5e7eb'; }}
    >
      {isEnrolled && (
        <div style={{ position: 'absolute', top: 14, right: 14, background: '#dcfce7', color: '#16a34a', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
          <CheckOutlined style={{ marginRight: 4 }} />Enrolled
        </div>
      )}

      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>
          {meta.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: meta.color, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4, background: meta.bg, display: 'inline-block', borderRadius: 6, padding: '2px 7px' }}>
            {meta.label}
          </div>
          <div style={{ fontWeight: 800, color: '#111827', fontSize: 15, lineHeight: 1.3, marginBottom: 6 }}>
            {product.name}
          </div>
          {product.description && (
            <div style={{ color: '#6b7280', fontSize: 13, lineHeight: 1.5, marginBottom: 10 }}>
              {product.description.slice(0, 90)}{product.description.length > 90 ? '...' : ''}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {minPrice != null ? (
              <div>
                <span style={{ color: '#9ca3af', fontSize: 11 }}>Starting from</span>
                <div style={{ fontWeight: 800, color: isEnrolled ? GREEN : NAVY, fontSize: 16 }}>
                  {minPrice.toLocaleString()} ETB/mo
                </div>
              </div>
            ) : <div />}
            {!isEnrolled && (
              <div style={{ color: NAVY, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                {product.tiers?.length || 0} tiers <ArrowRightOutlined />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PlanDetailDrawer({ product, open, onClose, onEnroll, enrolling }) {
  const [selectedTier, setSelectedTier] = useState(null);
  const [sigName,      setSigName]      = useState('');
  const [agreed,       setAgreed]       = useState(false);
  const meta = product ? typeMeta(product.productType) : {};

  useEffect(() => {
    if (open) { setSelectedTier(null); setSigName(''); setAgreed(false); }
  }, [open, product]);

  if (!product) return null;

  const exclusions = getExclusionsCov(product.productType);
  const canEnroll  = !!selectedTier && sigName.trim().length >= 3 && agreed && !enrolling;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={600}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
            {meta.emoji}
          </div>
          <div>
            <div style={{ fontWeight: 800, color: '#111827', fontSize: 16 }}>{product.name}</div>
            <div style={{ fontSize: 11, color: meta.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{meta.label}</div>
          </div>
        </div>
      }
      footer={
        <div>
          {!canEnroll && selectedTier && (
            <div style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center', marginBottom: 8 }}>
              {!sigName.trim() ? 'Type your full name to sign.' : !agreed ? 'Check the agreement box to continue.' : ''}
            </div>
          )}
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '12px 0', border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff', color: '#374151', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
              Cancel
            </button>
            <button
              onClick={() => canEnroll && onEnroll(product, selectedTier, sigName.trim())}
              disabled={!canEnroll}
              style={{
                flex: 2, padding: '12px 0', border: 'none', borderRadius: 10,
                background: canEnroll ? NAVY : '#e5e7eb',
                color: canEnroll ? '#fff' : '#9ca3af',
                fontWeight: 700, cursor: canEnroll ? 'pointer' : 'not-allowed',
                fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {enrolling ? <><LoadingOutlined /> Processing...</> : <><CreditCardOutlined /> Sign &amp; Pay with Chapa</>}
            </button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Disclaimer */}
        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <InfoCircleOutlined style={{ color: '#0369a1', fontSize: 16, marginTop: 2 }} />
          <span style={{ color: '#0c4a6e', fontSize: 13, lineHeight: 1.6 }}>
            Review the full plan details below before enrolling. You can change your plan within 30 days of your policy start date. <strong>No payment is charged until you complete checkout on Chapa.</strong>
          </span>
        </div>

        {product.description && (
          <div style={{ background: '#f8fafc', borderRadius: 12, padding: '14px 16px', color: '#374151', fontSize: 14, lineHeight: 1.6 }}>
            {product.description}
          </div>
        )}

        {/* Tier selection */}
        <div>
          <div style={{ fontWeight: 700, color: '#111827', fontSize: 15, marginBottom: 4 }}>Choose a Tier</div>
          <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 14 }}>Select the coverage level that fits your needs.</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(product.tiers || []).map(tier => {
              const isSelected = selectedTier?._id === tier._id;
              return (
                <div key={tier._id} onClick={() => setSelectedTier(tier)} style={{ border: `2px solid ${isSelected ? NAVY : '#e5e7eb'}`, borderRadius: 14, padding: '16px 18px', cursor: 'pointer', background: isSelected ? '#f0f6ff' : '#fff', transition: 'all 0.15s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 800, color: isSelected ? NAVY : '#111827', fontSize: 15 }}>{tier.name}</div>
                      {tier.description && <div style={{ color: '#6b7280', fontSize: 12, marginTop: 3 }}>{tier.description}</div>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, color: isSelected ? NAVY : '#111827', fontSize: 18 }}>ETB {tier.annualPremium?.toLocaleString()}</div>
                      <div style={{ color: '#9ca3af', fontSize: 11 }}>per year · ETB {Math.round((tier.annualPremium||0)/12).toLocaleString()}/mo</div>
                    </div>
                  </div>
                  {/* ALL coverage services */}
                  {(tier.coverages || []).length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
                      {tier.coverages.map((tc, i) => {
                        const cov   = tc.coverage;
                        const limit = tc.customLimit || cov?.limits?.annual;
                        return (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <CheckCircleOutlined style={{ color: GREEN, fontSize: 12 }} />
                              <div>
                                <span style={{ color: '#374151', fontSize: 13 }}>{cov?.name}</span>
                                {cov?.description && <div style={{ color: '#9ca3af', fontSize: 11 }}>{cov.description}</div>}
                              </div>
                            </div>
                            {limit && <span style={{ color: '#6b7280', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>up to {limit.toLocaleString()} ETB</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {isSelected && (
                    <div style={{ marginTop: 10, background: NAVY, borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckOutlined style={{ color: '#fff', fontSize: 12 }} />
                      <span style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>Selected — ETB {tier.annualPremium?.toLocaleString()} / year</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Exclusions */}
        <div>
          <div style={{ fontWeight: 700, color: '#111827', fontSize: 15, marginBottom: 10 }}>What Is Not Covered</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {exclusions.map((ex, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <StopOutlined style={{ color: '#ef4444', fontSize: 13, marginTop: 3 }} />
                <span style={{ color: '#4b5563', fontSize: 13 }}>{ex}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Key terms */}
        <div>
          <div style={{ fontWeight: 700, color: '#111827', fontSize: 15, marginBottom: 10 }}>Key Terms</div>
          {[
            ['Claims deadline',  'Submit within 90 days of incident'],
            ['Waiting period',   product.waitingPeriodMonths > 0 ? `${product.waitingPeriodMonths} months` : 'None'],
            ['Plan change',      'Allowed within 30 days of policy start'],
            ['Cancellation',     '30 days notice — pro-rated refund minus 10% admin fee'],
            ['Disputes',         'Resolved via NIBE (Ethiopian Insurance Regulatory Authority)'],
          ].map(([k, v], i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
              <span style={{ color: '#6b7280' }}>{k}</span>
              <span style={{ color: '#111827', fontWeight: 600, maxWidth: '55%', textAlign: 'right' }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Policy agreement */}
        {selectedTier && (
          <>
            <div>
              <div style={{ fontWeight: 700, color: '#111827', fontSize: 15, marginBottom: 10 }}>Policy Agreement</div>
              <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, maxHeight: 220, overflowY: 'auto' }}>
                <pre style={{ fontSize: 12, color: '#374151', lineHeight: 1.8, whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>
                  {agreementTextCov(selectedTier.name, product.name, selectedTier.annualPremium)}
                </pre>
              </div>
            </div>

            {/* Digital signature */}
            <div style={{ background: '#fafafa', border: '2px solid #e5e7eb', borderRadius: 14, padding: '20px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <EditOutlined style={{ color: NAVY, fontSize: 16 }} />
                <span style={{ fontWeight: 700, color: '#111827', fontSize: 15 }}>Digital Signature</span>
              </div>
              <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 12 }}>
                Type your full legal name below. This constitutes your legally binding digital signature on this policy agreement.
              </div>
              <Input
                size="large"
                placeholder="Full legal name"
                value={sigName}
                onChange={e => setSigName(e.target.value)}
                style={{ fontSize: 16, borderColor: sigName.trim().length >= 3 ? NAVY : undefined, marginBottom: 12 }}
              />
              {sigName.trim().length >= 3 && (
                <div style={{ background: '#f0f6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
                  <div style={{ fontSize: 20, fontStyle: 'italic', color: NAVY, fontWeight: 600 }}>{sigName.trim()}</div>
                  <div style={{ color: '#6b7280', fontSize: 11, marginTop: 4 }}>
                    Signed: {new Date().toLocaleDateString('en-ET', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>
              )}
              <div
                onClick={() => setAgreed(a => !a)}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${agreed ? GREEN : '#d1d5db'}`, background: agreed ? GREEN : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                  {agreed && <CheckOutlined style={{ color: '#fff', fontSize: 11 }} />}
                </div>
                <span style={{ color: '#374151', fontSize: 13, lineHeight: 1.6 }}>
                  I have read the full policy agreement above and agree to all terms and conditions.
                </span>
              </div>
            </div>
          </>
        )}

        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '12px 16px' }}>
          <div style={{ fontWeight: 700, color: '#92400e', fontSize: 13, marginBottom: 4 }}>🔒 Secure Payment via Chapa</div>
          <div style={{ color: '#78350f', fontSize: 12, lineHeight: 1.5 }}>
            After signing, you will be redirected to Chapa to complete payment — telebirr, CBE Birr, or bank card. Your enrollment activates immediately after payment is confirmed.
          </div>
        </div>
      </div>
    </Drawer>
  );
}

const ENDORSEMENT_TYPES = [
  { value: 'tier_change',      label: 'Change Coverage Tier',     desc: 'Upgrade or downgrade your plan tier' },
  { value: 'add_dependent',    label: 'Add a Dependent',          desc: 'Add a family member to your coverage' },
  { value: 'remove_dependent', label: 'Remove a Dependent',       desc: 'Remove a dependent from your coverage' },
  { value: 'contact_update',   label: 'Update Contact Info',      desc: 'Change your phone number or email' },
  { value: 'suspension',       label: 'Request Suspension',       desc: 'Temporarily pause your coverage' },
  { value: 'cancellation',     label: 'Cancel Policy',            desc: 'Permanently cancel this enrollment' },
];

function EndorsementModal({ enrollment, open, onClose, onSubmitted }) {
  const [step, setStep]         = useState(1);
  const [type, setType]         = useState('');
  const [details, setDetails]   = useState({});
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
        {/* Modal header */}
        <div style={{ background: NAVY, padding: '20px 24px', borderRadius: '18px 18px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>Request a Policy Change</div>
            <div style={{ color: '#93c5fd', fontSize: 12, marginTop: 2 }}>{enrollment.enrollmentNumber} · {enrollment.product?.name}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ padding: 24 }}>
          {/* Step 1 — type selector */}
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
                      background: sel ? (isDanger ? '#fef2f2' : '#f0f6ff') : '#fff',
                      transition: 'all 0.15s',
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

          {/* Step 2 — details form */}
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
                  <input type="date" placeholder="Date of Birth" value={details.dependent?.dateOfBirth || ''} onChange={e => setDep('dateOfBirth', e.target.value)}
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

function RenewalBanner({ enrollment, onRenew, renewing }) {
  const daysLeft = Math.max(0, Math.ceil((new Date(enrollment.endDate) - new Date()) / 86400000));
  const urgent   = daysLeft <= 7;

  return (
    <div style={{
      background:   urgent ? '#fef2f2' : '#fffbeb',
      border:       `1.5px solid ${urgent ? '#fca5a5' : '#fde68a'}`,
      borderRadius: 12,
      padding:      '14px 20px',
      display:      'flex',
      alignItems:   'center',
      justifyContent: 'space-between',
      flexWrap:     'wrap',
      gap:          12,
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
      <button
        onClick={() => onRenew(enrollment)}
        disabled={renewing}
        style={{
          background:   urgent ? '#ef4444' : '#f59e0b',
          border:       'none',
          borderRadius: 9,
          padding:      '10px 20px',
          color:        '#fff',
          fontWeight:   700,
          fontSize:     13,
          cursor:       renewing ? 'not-allowed' : 'pointer',
          opacity:      renewing ? 0.7 : 1,
          display:      'flex',
          alignItems:   'center',
          gap:          7,
          flexShrink:   0,
          whiteSpace:   'nowrap',
        }}
      >
        {renewing ? <LoadingOutlined /> : <SyncOutlined />}
        {renewing ? 'Processing…' : 'Renew Now'}
      </button>
    </div>
  );
}

export default function InsuredCoverage() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();

  const [enrollments, setEnrollments] = useState([]);
  const [claims, setClaims]           = useState([]);
  const [products, setProducts]       = useState([]);
  const [loading, setLoading]         = useState(true);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [drawerOpen, setDrawerOpen]           = useState(false);
  const [enrolling, setEnrolling]             = useState(false);
  const [renewingId, setRenewingId]           = useState(null);
  const [endorseEnrollment, setEndorseEnrollment] = useState(null);

  const [paymentStatus, setPaymentStatus] = useState(null); // 'verifying' | 'success' | 'failed'

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
          // Clear URL params
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
      // 1. Create the renewal (next-period pending enrollment)
      const renewRes = await api.post(`/enrollments/${enrollment._id}/renew`);
      const newEnrollmentId = renewRes.data.enrollment._id;

      // 2. Initialize Chapa for the new pending enrollment
      const chapaRes = await api.post('/chapa/initialize', { enrollmentId: newEnrollmentId });
      window.location.href = chapaRes.data.checkout_url;
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not start renewal. Please try again.');
      setRenewingId(null);
    }
  };

  const handleEnroll = async (product, tier, sigName) => {
    setEnrolling(true);
    try {
      // 1. Save signed policy agreement
      await api.post('/policy-agreements', {
        productId:     product._id,
        tierId:        tier._id,
        signatureData: sigName,
        agreed:        true,
      });

      // 2. Create pending enrollment
      const enrollRes = await api.post('/enrollments/self', {
        productId: product._id,
        tierId:    tier._id,
      });
      const enrollmentId = enrollRes.data.enrollment._id;

      // 3. Initialize Chapa payment
      const chapaRes = await api.post('/chapa/initialize', { enrollmentId });
      const { checkout_url } = chapaRes.data;

      // 4. Redirect to Chapa checkout
      window.location.href = checkout_url;
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not start payment. Please try again.');
      setEnrolling(false);
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>;

  // Build claim usage map
  const claimUsage = {};
  claims.filter(c => ['approved', 'settled', 'partially_approved'].includes(c.status)).forEach(c => {
    const key = (c.claimType || '').toLowerCase().replace(/[_ ]/g, '');
    claimUsage[key] = (claimUsage[key] || 0) + (c.approvedAmount || c.claimedAmount || 0);
  });

  // Products user is not yet enrolled in
  const enrolledProductIds = new Set(enrollments.map(e => e.product?._id?.toString()));
  const availableProducts  = products.filter(p => p.isActive !== false && !enrolledProductIds.has(p._id?.toString()));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Payment status banner */}
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
            {enrollments.length > 0
              ? `${enrollments.length} active plan${enrollments.length > 1 ? 's' : ''} · ${availableProducts.length} more available to add`
              : 'Choose a plan below to get started'}
          </div>
        </div>
        {availableProducts.length > 0 && (
          <button
            onClick={() => { const el = document.getElementById('available-plans'); el?.scrollIntoView({ behavior: 'smooth' }); }}
            style={{ background: GREEN, border: 'none', borderRadius: 10, color: '#fff', padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <PlusOutlined /> Add Coverage
          </button>
        )}
      </div>

      {/* ── Active enrollments ──────────────────────────────────────── */}
      {enrollments.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontWeight: 700, color: '#111827', fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <SafetyOutlined style={{ color: GREEN }} /> My Active Plans
          </div>
          {enrollments.map(e => (
            <div key={e._id} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {e.status === 'pending_renewal' && (
                <RenewalBanner
                  enrollment={e}
                  onRenew={handleRenew}
                  renewing={renewingId === e._id}
                />
              )}
              <EnrollmentCard
                enrollment={e}
                claimUsage={claimUsage}
                onRequestChange={setEndorseEnrollment}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── Available plans ─────────────────────────────────────────── */}
      <div id="available-plans">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontWeight: 700, color: '#111827', fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <PlusOutlined style={{ color: BLUE }} />
              {enrollments.length > 0 ? 'Add More Coverage' : 'Available Plans'}
            </div>
            <div style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }}>
              {enrollments.length > 0
                ? 'Expand your protection with additional coverage plans. You can review full details, exclusions, and policy terms before any payment is made.'
                : 'Choose a plan that fits your needs. Click to review full details, coverage limits, exclusions, and sign the policy agreement before subscribing.'}
            </div>
          </div>
        </div>

        {availableProducts.length === 0 && enrollments.length > 0 ? (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: '28px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🎉</div>
            <div style={{ fontWeight: 700, color: '#15803d', fontSize: 16, marginBottom: 6 }}>You're enrolled in all available plans!</div>
            <div style={{ color: '#6b7280', fontSize: 14 }}>Check back later for new products.</div>
          </div>
        ) : availableProducts.length === 0 && enrollments.length === 0 ? (
          <div style={{ background: NAVY, borderRadius: 16, padding: '48px 24px', textAlign: 'center' }}>
            <SafetyOutlined style={{ fontSize: 48, color: 'rgba(255,255,255,0.25)', marginBottom: 16 }} />
            <div style={{ fontWeight: 700, color: '#fff', fontSize: 18, marginBottom: 8 }}>No Active Coverage</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 24 }}>
              You are not currently enrolled in any active policy.
            </div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
              No plans are available right now. Please contact support or check back later.
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {availableProducts.map(p => (
              <ProductCard
                key={p._id}
                product={p}
                isEnrolled={false}
                onSelect={prod => { setSelectedProduct(prod); setDrawerOpen(true); }}
              />
            ))}
            {products.filter(p => enrolledProductIds.has(p._id?.toString())).map(p => (
              <ProductCard key={p._id} product={p} isEnrolled={true} onSelect={() => {}} />
            ))}
          </div>
        )}
      </div>

      {/* Plan detail drawer */}
      <PlanDetailDrawer
        product={selectedProduct}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedProduct(null); }}
        onEnroll={handleEnroll}
        enrolling={enrolling}
      />

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
