import { useEffect, useState } from 'react';
import { Tag, Typography, Spin, Divider } from 'antd';
import { ArrowRightOutlined, CheckCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import api from '../../api';

const { Text } = Typography;
const GREEN = '#22c55e';
const BLUE  = '#1d4ed8';
const NAVY  = '#1e3a5f';

function barColor(pct) {
  return pct >= 80 ? '#ef4444' : pct >= 50 ? '#f59e0b' : GREEN;
}

function UsageBar({ label, used, limit, sub }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
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

export default function InsuredCoverage() {
  const [enrollments, setEnrollments] = useState([]);
  const [claims, setClaims]           = useState([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/enrollments').then(async r => {
        const list = Array.isArray(r.data.enrollments) ? r.data.enrollments : [];
        return Promise.all(list.map(e => api.get(`/enrollments/${e._id}`).then(d => d.data.enrollment)));
      }),
      api.get('/claims'),
    ])
      .then(([details, claimsRes]) => {
        setEnrollments(details);
        setClaims(Array.isArray(claimsRes.data.claims) ? claimsRes.data.claims : []);
      })
      .catch(err => console.error('Coverage load failed:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>;

  if (!enrollments.length) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: NAVY, borderRadius: 16, padding: '40px 32px', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🛡</div>
        <div style={{ color: '#fff', fontWeight: 800, fontSize: 22, marginBottom: 8 }}>No Active Coverage</div>
        <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 15, marginBottom: 24 }}>
          You are not currently enrolled in any active policy.
        </div>
        <Link to="/plans" style={{ background: GREEN, borderRadius: 10, color: '#fff', padding: '12px 28px', fontWeight: 700, fontSize: 15, textDecoration: 'none', display: 'inline-block' }}>
          Browse Available Plans →
        </Link>
      </div>
    </div>
  );

  // Build claim usage map
  const claimUsage = {};
  claims.filter(c => ['approved', 'settled', 'partially_approved'].includes(c.status)).forEach(c => {
    const key = (c.claimType || '').toLowerCase().replace(/[_ ]/g, '');
    claimUsage[key] = (claimUsage[key] || 0) + (c.approvedAmount || c.claimedAmount || 0);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ margin: 0, color: '#111827', fontWeight: 800, fontSize: 22 }}>My Benefits & Coverage</h2>
          <Text style={{ color: '#6b7280', fontSize: 14 }}>Active coverage details, benefit limits, and usage this year.</Text>
        </div>
        <Link to="/plans" style={{ background: NAVY, borderRadius: 9, color: '#fff', padding: '9px 18px', fontWeight: 600, fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
          <ArrowRightOutlined /> Explore More Plans
        </Link>
      </div>

      {enrollments.map(enrollment => {
        const now       = new Date();
        const start     = new Date(enrollment.startDate);
        const end       = new Date(enrollment.endDate);
        const totalDays = Math.max(1, Math.ceil((end - start) / 86400000));
        const usedDays  = Math.max(0, Math.ceil((now - start) / 86400000));
        const daysLeft  = Math.max(0, Math.ceil((end - now) / 86400000));
        const timePct   = Math.min(100, Math.round((usedDays / totalDays) * 100));

        const coverageBars = (enrollment.tier?.coverages || []).map(tc => {
          const cov   = tc.coverage;
          const limit = tc.customLimit || cov?.limits?.annual || 0;
          const key   = (cov?.name || '').toLowerCase().replace(/[_ ]/g, '');
          return { name: cov?.name || '—', desc: cov?.description, limit, used: claimUsage[key] || 0,
            perClaim: cov?.limits?.perClaim, deductible: cov?.deductible, copaymentPct: cov?.copaymentPct };
        }).filter(c => c.limit > 0);

        return (
          <div key={enrollment._id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>

            {/* Policy header */}
            <div style={{ background: NAVY, padding: '20px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  <span style={{ background: 'rgba(34,197,94,0.2)', color: '#4ade80', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                    {enrollment.tier?.name || 'Standard'}
                  </span>
                  <span style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', borderRadius: 20, padding: '2px 10px', fontSize: 11 }}>
                    {enrollment.enrollmentNumber}
                  </span>
                </div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>{enrollment.product?.name}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Valid until</div>
                <div style={{ color: daysLeft < 30 ? '#fbbf24' : '#fff', fontWeight: 700, fontSize: 15 }}>
                  {end.toLocaleDateString()} · {daysLeft} days left
                </div>
              </div>
            </div>

            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>

              {/* Policy period bar */}
              <div>
                <div style={{ fontWeight: 700, color: '#111827', fontSize: 15, marginBottom: 14 }}>Policy Period</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: '#6b7280', fontSize: 13 }}>Time elapsed</span>
                  <span style={{ color: daysLeft < 30 ? '#ef4444' : '#374151', fontWeight: 600, fontSize: 13 }}>
                    {timePct}% · {daysLeft} days remaining
                  </span>
                </div>
                <div style={{ height: 12, background: '#f3f4f6', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${timePct}%`, background: daysLeft < 30 ? '#ef4444' : BLUE, borderRadius: 10, transition: 'width 0.8s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ color: '#9ca3af', fontSize: 11 }}>{start.toLocaleDateString()}</span>
                  <span style={{ color: '#9ca3af', fontSize: 11 }}>{end.toLocaleDateString()}</span>
                </div>
              </div>

              <Divider style={{ margin: 0 }} />

              {/* Coverage usage bars */}
              {coverageBars.length > 0 ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                    <div style={{ fontWeight: 700, color: '#111827', fontSize: 15 }}>Coverage Usage This Year</div>
                    <span style={{ background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: 20, padding: '2px 9px', fontSize: 11 }}>
                      <InfoCircleOutlined style={{ marginRight: 4 }} />Based on approved claims
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {coverageBars.map((c, i) => (
                      <UsageBar key={i} label={c.name} used={c.used} limit={c.limit} sub={c.desc} />
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <CheckCircleOutlined style={{ color: GREEN, fontSize: 20 }} />
                  <div>
                    <div style={{ fontWeight: 700, color: '#15803d' }}>Full coverage available</div>
                    <div style={{ color: '#6b7280', fontSize: 13 }}>No claims have been made this policy year — all your benefits are unused.</div>
                  </div>
                </div>
              )}

              <Divider style={{ margin: 0 }} />

              {/* Coverage details grid */}
              <div>
                <div style={{ fontWeight: 700, color: '#111827', fontSize: 15, marginBottom: 14 }}>Covered Services</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                  {(enrollment.tier?.coverages || []).map((tc, i) => {
                    const cov   = tc.coverage;
                    const limit = tc.customLimit || cov?.limits?.annual || 0;
                    const key   = (cov?.name || '').toLowerCase().replace(/[_ ]/g, '');
                    const used  = claimUsage[key] || 0;
                    const pct   = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
                    const color = barColor(pct);
                    return (
                      <div key={i} style={{ background: '#f9fafb', borderRadius: 12, padding: '16px', border: '1px solid #e5e7eb' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                          <div style={{ fontWeight: 700, color: '#111827', fontSize: 14 }}>{cov?.name}</div>
                          {pct > 0 && (
                            <span style={{ background: `${color}15`, color, borderRadius: 20, padding: '1px 8px', fontSize: 10, fontWeight: 700 }}>{pct}%</span>
                          )}
                        </div>
                        {cov?.description && <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 10 }}>{cov.description}</div>}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {limit > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#6b7280', fontSize: 12 }}>Annual limit</span>
                              <span style={{ fontWeight: 600, color: '#111827', fontSize: 12 }}>{limit.toLocaleString()} ETB</span>
                            </div>
                          )}
                          {cov?.limits?.perClaim && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#6b7280', fontSize: 12 }}>Per claim</span>
                              <span style={{ color: '#374151', fontSize: 12 }}>{cov.limits.perClaim.toLocaleString()} ETB</span>
                            </div>
                          )}
                          {cov?.deductible > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#6b7280', fontSize: 12 }}>Deductible</span>
                              <span style={{ color: '#374151', fontSize: 12 }}>{cov.deductible.toLocaleString()} ETB</span>
                            </div>
                          )}
                          {cov?.copaymentPct > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#6b7280', fontSize: 12 }}>Your co-pay</span>
                              <span style={{ color: '#374151', fontSize: 12 }}>{cov.copaymentPct}%</span>
                            </div>
                          )}
                        </div>
                        {limit > 0 && (
                          <div style={{ marginTop: 10, height: 5, background: '#e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 10 }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        );
      })}
    </div>
  );
}
