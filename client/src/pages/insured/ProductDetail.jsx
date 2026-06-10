import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin } from 'antd';
import { ArrowLeftOutlined, CheckCircleOutlined, CloseCircleOutlined, ArrowRightOutlined, InfoCircleOutlined } from '@ant-design/icons';
import api from '../../api';

const NAVY  = '#1e3a5f';
const GREEN = '#22c55e';
const BLUE  = '#1d4ed8';

const TYPE_META = {
  health:   { emoji: '🏥', color: '#16a34a', bg: '#dcfce7', label: 'Health' },
  life:     { emoji: '🛡️',  color: '#2563eb', bg: '#dbeafe', label: 'Life' },
  auto:     { emoji: '🚗',  color: '#d97706', bg: '#fef3c7', label: 'Auto' },
  home:     { emoji: '🏠',  color: '#7c3aed', bg: '#ede9fe', label: 'Home' },
  travel:   { emoji: '✈️',  color: '#0891b2', bg: '#cffafe', label: 'Travel' },
  business: { emoji: '🏢',  color: '#be185d', bg: '#fce7f3', label: 'Business' },
};
const typeMeta = t => TYPE_META[t] || { emoji: '📋', color: NAVY, bg: '#f1f5f9', label: t };

const STANDARD_TERMS = `1. ELIGIBILITY
This policy is available to individuals meeting the age requirements specified in the product details. All applicants are subject to underwriting review.

2. WAITING PERIOD
Coverage becomes effective after the waiting period stated in the policy schedule. Claims submitted during the waiting period will not be accepted.

3. PREMIUM PAYMENT
Annual premiums must be paid in full prior to coverage activation. Failure to pay may result in suspension or cancellation of the policy.

4. CLAIM PROCEDURES
All claims must be submitted within 30 days of the insured event. Supporting documentation as specified per claim type must be provided.

5. EXCLUSIONS
This policy does not cover pre-existing conditions (unless declared and accepted), self-inflicted injuries, acts of war, or events resulting from criminal activity by the insured.

6. RENEWALS
This policy renews annually. The insurer reserves the right to adjust premiums upon renewal based on claims history and market conditions.

7. CANCELLATION
Either party may cancel this policy with 30 days written notice. Refunds for unused premium will be calculated on a pro-rata basis.

8. DISPUTE RESOLUTION
Disputes arising under this policy shall first be referred to mediation. If unresolved, disputes will be settled under the applicable laws of the Federal Democratic Republic of Ethiopia.

9. DATA PROTECTION
Your personal information is processed in accordance with applicable data protection laws and our Privacy Policy.

10. GOVERNING LAW
This policy is governed by the laws of Ethiopia and subject to the regulations of the Ethiopian Insurance Regulatory Authority.`;

export default function ProductDetail() {
  const { productId } = useParams();
  const navigate      = useNavigate();
  const [product, setProduct]     = useState(null);
  const [tiers, setTiers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [selectedTierIdx, setSelectedTierIdx] = useState(0);
  const [termsOpen, setTermsOpen] = useState(false);

  useEffect(() => {
    api.get(`/products/${productId}`)
      .then(r => { setProduct(r.data.product); setTiers(r.data.tiers || []); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>;
  if (!product) return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>❌</div>
      <div style={{ fontWeight: 700, color: '#374151', fontSize: 16 }}>Product not found.</div>
      <button onClick={() => navigate('/insured/explore')} style={{ marginTop: 16, padding: '10px 20px', background: NAVY, border: 'none', borderRadius: 9, color: '#fff', cursor: 'pointer', fontWeight: 700 }}>← Back to Explore</button>
    </div>
  );

  const meta     = typeMeta(product.productType);
  const selTier  = tiers[selectedTierIdx];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Back */}
      <button
        onClick={() => navigate('/insured/explore')}
        style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#6b7280', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0, fontWeight: 600 }}
      >
        <ArrowLeftOutlined /> Back to Explore Coverage
      </button>

      {/* Hero card */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 18, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ background: `linear-gradient(135deg, ${meta.color}18 0%, ${meta.color}08 100%)`, borderBottom: `1px solid ${meta.color}30`, padding: '28px 32px', display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ width: 72, height: 72, borderRadius: 18, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38, flexShrink: 0 }}>
            {meta.emoji}
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
              <span style={{ background: meta.bg, color: meta.color, borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{meta.label}</span>
              {(product.targetMarkets || []).map(m => (
                <span key={m} style={{ background: '#f3f4f6', color: '#6b7280', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>{m}</span>
              ))}
              {!product.isActive && <span style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>INACTIVE</span>}
            </div>
            <h1 style={{ margin: 0, color: '#111827', fontWeight: 900, fontSize: 24, lineHeight: 1.2 }}>{product.name}</h1>
            <p style={{ margin: '8px 0 0', color: '#6b7280', fontSize: 15, lineHeight: 1.6 }}>{product.description}</p>
          </div>
          <button
            onClick={() => navigate(`/insured/quotes?productId=${productId}`)}
            style={{ padding: '13px 28px', background: NAVY, border: 'none', borderRadius: 11, color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0, boxShadow: `0 4px 14px ${NAVY}40` }}
            onMouseEnter={e => { e.currentTarget.style.background = '#1a3356'; }}
            onMouseLeave={e => { e.currentTarget.style.background = NAVY; }}
          >
            Apply for this Coverage <ArrowRightOutlined />
          </button>
        </div>

        {/* Quick stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', borderTop: '1px solid #f3f4f6' }}>
          {[
            { icon: '📅', label: 'Waiting Period', value: product.waitingPeriodMonths === 0 ? 'No waiting period' : `${product.waitingPeriodMonths} month${product.waitingPeriodMonths !== 1 ? 's' : ''}` },
            { icon: '👤', label: 'Eligible Ages', value: `${product.ageRange?.min || 18} – ${product.ageRange?.max || 65} years` },
            { icon: '👨‍👩‍👧', label: 'Max Dependents', value: `Up to ${tiers[0]?.maxDependents ?? 4} per plan` },
            { icon: '💰', label: 'Starting From', value: tiers.length ? `ETB ${Math.min(...tiers.map(t => t.annualPremium)).toLocaleString()} / yr` : '—' },
          ].map((s, i, arr) => (
            <div key={s.label} style={{ padding: '16px 20px', borderRight: i < arr.length - 1 ? '1px solid #f3f4f6' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 22 }}>{s.icon}</span>
              <div>
                <div style={{ color: '#9ca3af', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</div>
                <div style={{ color: '#111827', fontWeight: 700, fontSize: 14, marginTop: 2 }}>{s.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Key features */}
      {(product.features || []).length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '22px 28px' }}>
          <div style={{ fontWeight: 800, color: '#111827', fontSize: 16, marginBottom: 16 }}>Key Features</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
            {product.features.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <CheckCircleOutlined style={{ color: GREEN, fontSize: 15, marginTop: 1, flexShrink: 0 }} />
                <span style={{ color: '#374151', fontSize: 14, lineHeight: 1.5 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tier comparison */}
      {tiers.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '20px 28px', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ fontWeight: 800, color: '#111827', fontSize: 16, marginBottom: 4 }}>Coverage Tiers</div>
            <div style={{ color: '#6b7280', fontSize: 13 }}>Choose a tier when submitting your application. You can compare what's included in each tier below.</div>
          </div>

          {/* Tier selector tabs */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #f3f4f6', overflowX: 'auto' }}>
            {tiers.map((t, i) => (
              <button key={t._id} onClick={() => setSelectedTierIdx(i)} style={{
                padding: '14px 24px', border: 'none', borderBottom: `2px solid ${selectedTierIdx === i ? NAVY : 'transparent'}`,
                background: selectedTierIdx === i ? '#f8faff' : 'transparent',
                color: selectedTierIdx === i ? NAVY : '#6b7280',
                fontWeight: selectedTierIdx === i ? 800 : 500, fontSize: 14, cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0, transition: 'all 0.12s',
              }}>
                <span>{t.name}</span>
                <span style={{ fontSize: 13, fontWeight: selectedTierIdx === i ? 700 : 400, color: selectedTierIdx === i ? meta.color : '#9ca3af' }}>
                  ETB {t.annualPremium.toLocaleString()}/yr
                </span>
              </button>
            ))}
          </div>

          {/* Selected tier detail */}
          {selTier && (
            <div style={{ padding: '24px 28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 800, color: '#111827', fontSize: 18 }}>{selTier.name} Tier</div>
                  {selTier.description && <div style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>{selTier.description}</div>}
                </div>
                <div style={{ background: NAVY, color: '#fff', borderRadius: 12, padding: '10px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>ANNUAL PREMIUM</div>
                  <div style={{ fontWeight: 900, fontSize: 22 }}>ETB {selTier.annualPremium.toLocaleString()}</div>
                </div>
              </div>

              {selTier.coverages?.length > 0 ? (
                <div>
                  <div style={{ fontWeight: 700, color: '#111827', fontSize: 14, marginBottom: 12 }}>What's Covered</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                    {selTier.coverages.map((tc, i) => {
                      const cov   = tc.coverage;
                      const limit = tc.customLimit || cov?.limits?.annual;
                      return (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: i % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: i < selTier.coverages.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                            <CheckCircleOutlined style={{ color: GREEN, fontSize: 14, marginTop: 2, flexShrink: 0 }} />
                            <div>
                              <div style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>{cov?.name}</div>
                              {cov?.description && <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 2 }}>{cov.description}</div>}
                            </div>
                          </div>
                          {limit && (
                            <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                              <div style={{ fontWeight: 700, color: NAVY, fontSize: 14 }}>ETB {limit.toLocaleString()}</div>
                              <div style={{ color: '#9ca3af', fontSize: 11 }}>annual limit</div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>No coverage details loaded for this tier.</div>
              )}

              <div style={{ marginTop: 20, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <InfoCircleOutlined style={{ color: '#16a34a', marginTop: 1, flexShrink: 0 }} />
                <span style={{ color: '#166534', fontSize: 13 }}>You'll select your preferred tier during the application. The underwriter may suggest a different tier based on your risk assessment.</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Terms & Conditions */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden' }}>
        <button
          onClick={() => setTermsOpen(o => !o)}
          style={{ width: '100%', padding: '18px 28px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left' }}
        >
          <div>
            <div style={{ fontWeight: 800, color: '#111827', fontSize: 16 }}>Terms &amp; Conditions</div>
            <div style={{ color: '#9ca3af', fontSize: 13, marginTop: 2 }}>Policy rules, exclusions, and legal obligations — please read before applying</div>
          </div>
          <span style={{ color: '#9ca3af', fontSize: 18, transform: termsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'block' }}>▼</span>
        </button>

        {termsOpen && (
          <div style={{ borderTop: '1px solid #f3f4f6', padding: '24px 28px' }}>
            {product.terms ? (
              <div style={{ color: '#374151', fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{product.terms}</div>
            ) : (
              <div style={{ color: '#374151', fontSize: 14, lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>{STANDARD_TERMS}</div>
            )}
            <div style={{ marginTop: 20, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <InfoCircleOutlined style={{ color: '#d97706', marginTop: 1, flexShrink: 0 }} />
              <span style={{ color: '#78350f', fontSize: 13 }}>By submitting an application you confirm you have read and understood these terms. Final policy terms will be included in your policy document after enrollment.</span>
            </div>
          </div>
        )}
      </div>

      {/* Exclusions note */}
      <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 14, padding: '16px 20px' }}>
        <div style={{ fontWeight: 700, color: '#991b1b', fontSize: 14, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CloseCircleOutlined /> Common Exclusions
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
          {[
            'Pre-existing conditions (unless declared)',
            'Self-inflicted injuries',
            'Acts of war or terrorism',
            'Participation in illegal activities',
            'Events occurring before policy activation',
            'Claims without supporting documentation',
          ].map((e, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
              <span style={{ color: '#ef4444', fontSize: 12, marginTop: 1, flexShrink: 0 }}>✕</span>
              <span style={{ color: '#991b1b', fontSize: 13, lineHeight: 1.4 }}>{e}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sticky bottom CTA */}
      <div style={{ position: 'sticky', bottom: 0, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', borderTop: '1px solid #e5e7eb', margin: '0 -24px', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 700, color: '#111827', fontSize: 15 }}>{product.name}</div>
          <div style={{ color: '#6b7280', fontSize: 13 }}>
            {tiers.length ? `From ETB ${Math.min(...tiers.map(t => t.annualPremium)).toLocaleString()} / yr · ${tiers.length} tier${tiers.length !== 1 ? 's' : ''} available` : 'Contact insurer for pricing'}
          </div>
        </div>
        <button
          onClick={() => navigate(`/insured/quotes?productId=${productId}`)}
          style={{ padding: '13px 32px', background: NAVY, border: 'none', borderRadius: 11, color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9, boxShadow: `0 4px 14px ${NAVY}40` }}
          onMouseEnter={e => { e.currentTarget.style.background = '#1a3356'; }}
          onMouseLeave={e => { e.currentTarget.style.background = NAVY; }}
        >
          Apply for this Coverage <ArrowRightOutlined />
        </button>
      </div>
    </div>
  );
}
