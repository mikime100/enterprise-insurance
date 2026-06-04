import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Spin } from 'antd';
import { CheckOutlined, ArrowRightOutlined, UserOutlined, BankOutlined, TeamOutlined } from '@ant-design/icons';
import axios from 'axios';

const API   = import.meta.env.VITE_API_URL || '/api';
const NAVY  = '#0a1628';
const NAVY2 = '#1e3a5f';
const GREEN = '#22c55e';
const BLUE  = '#1d4ed8';

const TYPE_META = {
  health:   { label: 'Health',   emoji: '🏥', color: GREEN },
  auto:     { label: 'Auto',     emoji: '🚗', color: BLUE  },
  life:     { label: 'Life',     emoji: '🛡', color: '#8b5cf6' },
  home:     { label: 'Home',     emoji: '🏠', color: '#f97316' },
  travel:   { label: 'Travel',   emoji: '✈️', color: '#06b6d4' },
  business: { label: 'Business', emoji: '🏢', color: '#f59e0b' },
};

// Who is this plan for — based on targetMarkets
const AUDIENCE_ICONS = {
  Individual:  { icon: <UserOutlined />, label: 'Individuals' },
  Corporate:   { icon: <BankOutlined />, label: 'Companies' },
  SME:         { icon: <TeamOutlined />, label: 'SMEs' },
  Government:  { icon: <BankOutlined />, label: 'Government' },
  Students:    { icon: <UserOutlined />, label: 'Students' },
  Seniors:     { icon: <UserOutlined />, label: 'Seniors' },
};

// ─── Tier Card ────────────────────────────────────────────────────────────────
function TierCard({ tier, color, onSelect }) {
  const monthly = Math.round(tier.annualPremium / 12);

  return (
    <div
      style={{
        background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14,
        padding: '24px', display: 'flex', flexDirection: 'column',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)', transition: 'all 0.18s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = color;
        e.currentTarget.style.boxShadow = `0 6px 24px ${color}25`;
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = '#e5e7eb';
        e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
        <div>
          <div style={{ fontWeight: 800, color: '#111827', fontSize: 18 }}>{tier.name}</div>
          {tier.description && (
            <div style={{ color: '#6b7280', fontSize: 13, marginTop: 3 }}>{tier.description}</div>
          )}
        </div>
        <div style={{ textAlign: 'right', background: `${color}10`, borderRadius: 10, padding: '8px 12px' }}>
          <div style={{ color, fontWeight: 900, fontSize: 22, lineHeight: 1 }}>
            {monthly.toLocaleString()}
          </div>
          <div style={{ color: '#9ca3af', fontSize: 10, fontWeight: 600, letterSpacing: '0.05em' }}>ETB / MO</div>
        </div>
      </div>

      {/* Annual price */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb', borderRadius: 9, padding: '10px 14px', marginBottom: 18 }}>
        <span style={{ color: '#6b7280', fontSize: 13 }}>Annual premium</span>
        <span style={{ fontWeight: 700, color: '#111827', fontSize: 14 }}>
          {tier.annualPremium.toLocaleString()} ETB
        </span>
      </div>

      {/* Key details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, marginBottom: 20 }}>
        {tier.maxDependents > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>
            <span style={{ color: '#6b7280', fontSize: 13 }}>Max dependents</span>
            <span style={{ fontWeight: 600, color: '#111827', fontSize: 13 }}>Up to {tier.maxDependents}</span>
          </div>
        )}
        {tier.employerSharePct < 100 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>
            <span style={{ color: '#6b7280', fontSize: 13 }}>Employer share</span>
            <span style={{ fontWeight: 600, color: '#111827', fontSize: 13 }}>{tier.employerSharePct}%</span>
          </div>
        )}

        {/* Covered services from real Coverage records */}
        {tier.coverages?.length > 0 && (
          <div style={{ marginTop: 4 }}>
            <div style={{ color: '#6b7280', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
              Covered Services
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {tier.coverages.slice(0, 5).map((tc, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckOutlined style={{ color: color, fontSize: 11, flexShrink: 0 }} />
                  <span style={{ color: '#374151', fontSize: 13 }}>
                    {tc.coverage?.name || 'Coverage'}
                    {tc.customLimit && (
                      <span style={{ color: '#9ca3af', fontSize: 11, marginLeft: 6 }}>
                        up to {tc.customLimit.toLocaleString()} ETB
                      </span>
                    )}
                  </span>
                </div>
              ))}
              {tier.coverages.length > 5 && (
                <div style={{ color: '#9ca3af', fontSize: 12, paddingLeft: 19 }}>
                  +{tier.coverages.length - 5} more services
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <button
        onClick={() => onSelect(tier)}
        style={{
          width: '100%', padding: '13px 0', background: color, border: 'none',
          borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 15,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        Select This Plan <ArrowRightOutlined />
      </button>
    </div>
  );
}

// ─── Product Block ────────────────────────────────────────────────────────────
function ProductBlock({ product }) {
  const [open, setOpen]           = useState(true);
  const [selectedTier, setTier]   = useState(null);
  const meta  = TYPE_META[product.productType] || { label: product.productType, emoji: '📋', color: BLUE };
  const color = meta.color;
  const minMonthly = product.tiers?.length
    ? Math.round(Math.min(...product.tiers.map(t => t.annualPremium)) / 12)
    : Math.round(product.baseAnnualPremium / 12);

  return (
    <div style={{ marginBottom: 36 }}>

      {/* Product header row */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          background: NAVY, borderRadius: 14, padding: '22px 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', marginBottom: open && product.tiers?.length ? 20 : 0,
          flexWrap: 'wrap', gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 13, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>
            {meta.emoji}
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 19 }}>{product.name}</div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, marginTop: 3, maxWidth: 480 }}>
              {product.description}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <span style={{ background: `${color}20`, color, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                {meta.label}
              </span>
              {product.targetMarkets?.map(m => (
                <span key={m} style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.65)', borderRadius: 20, padding: '2px 10px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  {AUDIENCE_ICONS[m]?.icon} {AUDIENCE_ICONS[m]?.label || m}
                </span>
              ))}
              {product.waitingPeriodMonths > 0 && (
                <span style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24', borderRadius: 20, padding: '2px 10px', fontSize: 11 }}>
                  {product.waitingPeriodMonths}mo waiting period
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Starting from</div>
            <div style={{ color, fontWeight: 900, fontSize: 22 }}>{minMonthly.toLocaleString()} ETB/mo</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
              {product.tiers?.length || 0} tier{product.tiers?.length !== 1 ? 's' : ''} available
            </div>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 18 }}>{open ? '▲' : '▼'}</div>
        </div>
      </div>

      {/* Tier grid */}
      {open && (
        product.tiers?.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {product.tiers.map(tier => (
              <TierCard key={tier._id} tier={tier} color={color} onSelect={setTier} />
            ))}
          </div>
        ) : (
          <div style={{ background: '#f9fafb', border: '1px dashed #e5e7eb', borderRadius: 12, padding: '32px', textAlign: 'center', color: '#9ca3af' }}>
            Tiers are being configured. Contact us for details.
          </div>
        )
      )}

      {/* Tier selected modal */}
      {selectedTier && (
        <TierSelectedModal tier={selectedTier} product={product} color={color} onClose={() => setTier(null)} />
      )}
    </div>
  );
}

// ─── Tier Selected Modal ──────────────────────────────────────────────────────
function TierSelectedModal({ tier, product, color, onClose }) {
  const navigate = useNavigate();

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#fff', borderRadius: 20, padding: '36px', maxWidth: 480, width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,0.25)' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: `${color}15`, border: `2px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 14px' }}>
            ✅
          </div>
          <div style={{ fontWeight: 800, color: '#111827', fontSize: 22, marginBottom: 6 }}>
            Great choice!
          </div>
          <div style={{ color: '#6b7280', fontSize: 15 }}>
            <strong style={{ color: '#111827' }}>{product.name}</strong> — {tier.name} tier
          </div>
          <div style={{ color, fontWeight: 800, fontSize: 24, marginTop: 10 }}>
            {tier.annualPremium.toLocaleString()} ETB / year
          </div>
          <div style={{ color: '#9ca3af', fontSize: 13 }}>
            ({Math.round(tier.annualPremium / 12).toLocaleString()} ETB/month)
          </div>
        </div>

        {/* What happens next */}
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '16px 20px', marginBottom: 24 }}>
          <div style={{ fontWeight: 700, color: '#15803d', fontSize: 14, marginBottom: 10 }}>What happens next</div>
          {[
            'Create your free account (2 minutes)',
            'Add your dependents if needed',
            'Your application goes to underwriting review',
            'Once approved you'll get your digital policy',
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: i < 3 ? 8 : 0 }}>
              <span style={{ width: 20, height: 20, borderRadius: '50%', background: GREEN, color: '#fff', fontWeight: 700, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                {i + 1}
              </span>
              <span style={{ color: '#374151', fontSize: 13, lineHeight: 1.5 }}>{step}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: '12px 0', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, color: '#374151', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
          >
            Keep Browsing
          </button>
          <button
            onClick={() => navigate('/register')}
            style={{ flex: 2, padding: '12px 0', background: color, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
          >
            Create Account →
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <Link to="/login" style={{ color: '#6b7280', fontSize: 13, textDecoration: 'none' }}>
            Already have an account? <span style={{ color: BLUE, fontWeight: 600 }}>Sign in</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Plans() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    axios.get(`${API}/products?withTiers=true`, { withCredentials: true })
      .then(r => setProducts(Array.isArray(r.data.products) ? r.data.products : []))
      .catch(err => {
        if (err.response?.status === 401) {
          // Backend may not have deployed yet — show empty state gracefully
          setProducts([]);
        } else {
          setError('Could not load plans. Please try again later.');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const types = ['all', ...new Set(products.map(p => p.productType))];
  const visible = typeFilter === 'all' ? products : products.filter(p => p.productType === typeFilter);

  return (
    <div style={{ fontFamily: 'Inter, -apple-system, Arial, sans-serif', background: '#f5f7fa', minHeight: '100vh' }}>

      {/* Navbar */}
      <nav style={{ background: NAVY, padding: '0 5%', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 12px rgba(0,0,0,0.25)' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, color: '#fff' }}>E</div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Enterprise Insurance</span>
        </Link>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link to="/login" style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>Sign In</Link>
          <Link to="/register" style={{ background: GREEN, borderRadius: 8, color: '#fff', padding: '8px 18px', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ background: `linear-gradient(160deg, ${NAVY} 0%, #0d2040 60%, ${NAVY2} 100%)`, padding: '56px 5% 48px', textAlign: 'center' }}>
        <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 'clamp(26px, 4vw, 46px)', margin: '0 0 14px', lineHeight: 1.2 }}>
          Our Insurance Plans
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 16, maxWidth: 560, margin: '0 auto 0', lineHeight: 1.7 }}>
          Full pricing transparency. Compare tiers, see every covered service, and select the right plan in minutes.
        </p>
      </div>

      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '36px 5% 60px' }}>

        {/* Type filter pills */}
        {!loading && products.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 32 }}>
            {types.map(t => {
              const meta = TYPE_META[t];
              const active = typeFilter === t;
              return (
                <button key={t} onClick={() => setTypeFilter(t)}
                  style={{
                    background: active ? NAVY : '#fff',
                    border: `1px solid ${active ? NAVY : '#e5e7eb'}`,
                    borderRadius: 20, padding: '7px 18px',
                    color: active ? '#fff' : '#374151',
                    fontWeight: active ? 700 : 500, fontSize: 14, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  {meta?.emoji && <span>{meta.emoji}</span>}
                  {t === 'all' ? 'All Plans' : meta?.label || t}
                  {t !== 'all' && (
                    <span style={{ background: active ? 'rgba(255,255,255,0.2)' : '#f3f4f6', borderRadius: 20, padding: '0 7px', fontSize: 11, fontWeight: 700 }}>
                      {products.filter(p => p.productType === t).length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Content */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
            <Spin size="large" />
          </div>
        )}

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '20px 24px', color: '#dc2626', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {!loading && !error && visible.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div style={{ fontWeight: 700, color: '#111827', fontSize: 18, marginBottom: 8 }}>No plans available yet</div>
            <div style={{ color: '#6b7280', marginBottom: 20 }}>Our products are being configured. Check back soon or contact us.</div>
            <Link to="/register" style={{ background: GREEN, color: '#fff', borderRadius: 9, padding: '11px 24px', fontWeight: 700, textDecoration: 'none', fontSize: 15 }}>
              Register Interest
            </Link>
          </div>
        )}

        {!loading && !error && visible.map(p => (
          <ProductBlock key={p._id} product={p} />
        ))}

        {/* Bottom CTA */}
        {!loading && visible.length > 0 && (
          <div style={{ background: `linear-gradient(135deg, ${NAVY}, ${NAVY2})`, borderRadius: 18, padding: '44px 40px', textAlign: 'center', marginTop: 16 }}>
            <h2 style={{ color: '#fff', fontWeight: 900, fontSize: 26, margin: '0 0 10px' }}>Ready to get covered?</h2>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 15, margin: '0 0 26px' }}>Create a free account and start your enrollment today.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/register" style={{ background: GREEN, borderRadius: 10, color: '#fff', padding: '12px 26px', fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>
                Register as Individual
              </Link>
              <Link to="/broker-apply" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 10, color: '#fff', padding: '12px 26px', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>
                Apply as Broker
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
