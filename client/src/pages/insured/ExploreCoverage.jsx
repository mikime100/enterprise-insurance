import { useEffect, useState } from 'react';
import { Spin } from 'antd';
import {
  CheckCircleOutlined, InfoCircleOutlined, ArrowRightOutlined,
  FileTextOutlined, SearchOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

const GREEN = '#22c55e';
const NAVY  = '#1e3a5f';
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

function ProductCard({ product, onApply }) {
  const meta         = typeMeta(product.productType);
  const tiers        = product.tiers || [];
  const minPrice     = tiers.length ? Math.min(...tiers.map(t => t.annualPremium)) : null;
  const maxPrice     = tiers.length > 1 ? Math.max(...tiers.map(t => t.annualPremium)) : null;
  const keyBenefits  = (tiers[0]?.coverages || []).slice(0, 4);

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
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
              {product.description.slice(0, 90)}{product.description.length > 90 ? '…' : ''}
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
        {minPrice != null && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb', borderRadius: 10, padding: '10px 14px' }}>
            <span style={{ color: '#6b7280', fontSize: 12, fontWeight: 600 }}>Annual premium</span>
            <span style={{ fontWeight: 800, color: NAVY, fontSize: 15 }}>
              ETB {minPrice.toLocaleString()}{maxPrice ? ` – ${maxPrice.toLocaleString()}` : ''}
            </span>
          </div>
        )}

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
              {(tiers[0]?.coverages?.length || 0) > 4 && (
                <div style={{ color: '#9ca3af', fontSize: 12, marginLeft: 19 }}>+ {tiers[0].coverages.length - 4} more benefits</div>
              )}
            </div>
          </div>
        )}

        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 9, padding: '9px 12px', fontSize: 12, color: '#1e40af', display: 'flex', gap: 7, alignItems: 'flex-start' }}>
          <InfoCircleOutlined style={{ marginTop: 1, flexShrink: 0 }} />
          <span>No commitment yet — submitting an application starts the underwriting review. An underwriter will send you a personalised offer within 1–3 business days.</span>
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
          <button
            onClick={onViewDetails}
            style={{ flex: 1, padding: '11px 0', background: '#fff', border: `2px solid ${NAVY}`, borderRadius: 10, color: NAVY, fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.12s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f0f6ff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
          >
            View Details
          </button>
          <button
            onClick={onApply}
            style={{ flex: 2, padding: '11px 0', background: NAVY, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, transition: 'background 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#1a3356'; }}
            onMouseLeave={e => { e.currentTarget.style.background = NAVY; }}
          >
            <FileTextOutlined /> Apply <ArrowRightOutlined />
          </button>
        </div>
      </div>
    </div>
  );
}

const TYPE_FILTERS = [
  { key: 'all',      label: 'All' },
  { key: 'health',   label: '🏥 Health' },
  { key: 'auto',     label: '🚗 Auto' },
  { key: 'life',     label: '🛡️ Life' },
  { key: 'home',     label: '🏠 Home' },
  { key: 'travel',   label: '✈️ Travel' },
  { key: 'business', label: '🏢 Business' },
];

export default function ExploreCoverage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('all');
  const [search, setSearch]     = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/products', { params: { withTiers: 'true' } })
      .then(r => setProducts(r.data.products || r.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const visible = products.filter(p => {
    if (p.isActive === false) return false;
    if (filter !== 'all' && p.productType !== filter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !(p.description || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div>
        <h2 style={{ margin: 0, color: '#111827', fontWeight: 800, fontSize: 22 }}>Explore Coverage Plans</h2>
        <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
          Browse all insurance products we offer. Select a plan and submit an application — no payment until you accept an approved offer.
        </p>
      </div>

      {/* How it works */}
      <div style={{ background: '#f0f6ff', border: '1px solid #bfdbfe', borderRadius: 14, padding: '18px 22px' }}>
        <div style={{ fontWeight: 700, color: '#1e40af', fontSize: 14, marginBottom: 12 }}>How the application process works</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
          {[
            { step: '1', icon: '👆', label: 'Choose a Plan', desc: 'Click Apply on any plan below' },
            { step: '2', icon: '📝', label: 'Fill Application', desc: 'Complete the detailed quote form' },
            { step: '3', icon: '🔍', label: 'Underwriting', desc: 'We review within 1–3 business days' },
            { step: '4', icon: '✅', label: 'Accept & Pay', desc: 'Accept the offer and pay via Chapa' },
          ].map(s => (
            <div key={s.step} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: BLUE, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{s.step}</div>
              <div>
                <div style={{ fontWeight: 700, color: '#1e40af', fontSize: 13 }}>{s.icon} {s.label}</div>
                <div style={{ color: '#3b82f6', fontSize: 12, marginTop: 1 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
          {TYPE_FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${filter === f.key ? NAVY : '#e5e7eb'}`,
              background: filter === f.key ? NAVY : '#fff', color: filter === f.key ? '#fff' : '#374151',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.12s',
            }}>{f.label}</button>
          ))}
        </div>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <SearchOutlined style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 13 }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search plans…"
            style={{ padding: '7px 12px 7px 30px', border: '1.5px solid #e5e7eb', borderRadius: 20, fontSize: 13, outline: 'none', width: 180 }}
          />
        </div>
      </div>

      {/* Products grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : visible.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: '#9ca3af' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#374151', marginBottom: 6 }}>No plans match your filter</div>
          <div style={{ fontSize: 14 }}>Try a different category or clear the search.</div>
        </div>
      ) : (
        <>
          <div style={{ color: '#6b7280', fontSize: 13 }}>{visible.length} plan{visible.length !== 1 ? 's' : ''} available</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 18 }}>
            {visible.map(p => (
              <ProductCard
                key={p._id}
                product={p}
                onApply={() => navigate(`/insured/quotes?productId=${p._id}`)}
                onViewDetails={() => navigate(`/insured/explore/${p._id}`)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
