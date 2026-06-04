import { useEffect, useState } from 'react';
import { Table, Tag, Button, Typography, Spin, Progress } from 'antd';
import { SafetyOutlined, AlertOutlined, PlusOutlined, ArrowRightOutlined, CalendarOutlined, FileTextOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';

const { Text } = Typography;

const STATUS_COLOR  = { submitted: 'blue', under_review: 'processing', approved: 'green', denied: 'red', settled: 'success', closed: 'default' };
const STATUS_DOT    = { submitted: '#3b82f6', under_review: '#1d4ed8', approved: '#22c55e', denied: '#ef4444', settled: '#10b981', closed: '#9ca3af' };

function StatBox({ label, value, icon, color, sub }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '20px 22px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ width: 42, height: 42, borderRadius: 10, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, fontSize: 19 }}>{icon}</div>
      </div>
      <div style={{ color: '#6b7280', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{label}</div>
      <div style={{ color: '#111827', fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

export default function InsuredDashboard() {
  const [enrollments, setEnrollments] = useState([]);
  const [claims, setClaims]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const navigate   = useNavigate();
  const { user }   = useAuth();

  useEffect(() => {
    Promise.all([api.get('/enrollments'), api.get('/claims')])
      .then(([e, c]) => {
        setEnrollments(Array.isArray(e.data.enrollments) ? e.data.enrollments : []);
        setClaims(Array.isArray(c.data.claims) ? c.data.claims : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>;

  const activePolicy = enrollments.find(e => e.status === 'active');
  const openClaims   = claims.filter(c => !['settled', 'closed', 'denied'].includes(c.status));
  const daysLeft     = activePolicy ? Math.max(0, Math.ceil((new Date(activePolicy.endDate) - new Date()) / 86400000)) : 0;
  const coveragePct  = activePolicy ? Math.min(100, Math.round((daysLeft / 365) * 100)) : 0;

  const claimColumns = [
    { title: 'Claim #', dataIndex: 'claimNumber', key: 'n', render: v => <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#6b7280' }}>{v}</span> },
    { title: 'Type', dataIndex: 'claimType', key: 't', render: v => <Tag style={{ borderRadius: 6 }}>{v?.replace(/_/g, ' ')}</Tag> },
    { title: 'Amount (ETB)', dataIndex: 'claimedAmount', key: 'a', render: v => <span style={{ fontWeight: 600 }}>{v?.toLocaleString()}</span> },
    {
      title: 'Status', dataIndex: 'status', key: 's',
      render: v => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS_DOT[v] || '#9ca3af', display: 'inline-block' }} />
          <span style={{ fontSize: 13, textTransform: 'capitalize' }}>{v?.replace(/_/g, ' ')}</span>
        </span>
      ),
    },
    { title: 'Filed', dataIndex: 'createdAt', key: 'd', render: v => new Date(v).toLocaleDateString() },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Welcome hero ── */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)', borderRadius: 16, padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 20 }}>Welcome back, {user?.firstName}!</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 }}>
              {activePolicy
                ? `Covered under ${activePolicy.product?.name}${activePolicy.tier?.name ? ' · ' + activePolicy.tier.name : ''}`
                : 'No active coverage — explore plans to get started'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/insured/claims')} style={{ background: '#22c55e', border: 'none', borderRadius: 9, color: '#fff', padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
            <PlusOutlined /> File a Claim
          </button>
          {activePolicy && (
            <button onClick={() => navigate('/insured/coverage')} style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 9, color: '#fff', padding: '10px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
              View Coverage
            </button>
          )}
        </div>
      </div>

      {/* ── Stat row ── */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <StatBox label="Active Policies" value={enrollments.filter(e => e.status === 'active').length} icon={<SafetyOutlined />} color="#10b981" sub="Coverage active" />
        <StatBox label="Open Claims"     value={openClaims.length} icon={<AlertOutlined />} color="#f59e0b" sub={openClaims.length > 0 ? 'Awaiting resolution' : 'All resolved'} />
        <StatBox label="Total Claims"    value={claims.length} icon={<FileTextOutlined />} color="#8b5cf6" sub="Since enrollment" />
      </div>

      {/* ── Active coverage card ── */}
      {activePolicy && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '22px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>My Active Coverage</div>
            <button onClick={() => navigate('/insured/coverage')} style={{ background: 'none', border: 'none', color: '#1d4ed8', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              View Details <ArrowRightOutlined style={{ fontSize: 11 }} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Product',    value: activePolicy.product?.name || '—' },
              { label: 'Tier',       value: activePolicy.tier?.name || 'Standard' },
              { label: 'Valid Until', value: new Date(activePolicy.endDate).toLocaleDateString() },
              { label: 'Annual Premium', value: `${(activePolicy.premium?.amount || 0).toLocaleString()} ETB` },
            ].map(f => (
              <div key={f.label} style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ color: '#9ca3af', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{f.label}</div>
                <div style={{ color: '#111827', fontWeight: 700, fontSize: 14 }}>{f.value}</div>
              </div>
            ))}
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: '#6b7280', fontSize: 12 }}>Coverage remaining</span>
              <span style={{ color: daysLeft < 30 ? '#ef4444' : '#22c55e', fontWeight: 700, fontSize: 12 }}>{daysLeft} days left</span>
            </div>
            <Progress percent={coveragePct} showInfo={false} strokeColor={daysLeft < 30 ? '#ef4444' : '#22c55e'} trailColor="#f3f4f6" strokeWidth={8} style={{ marginBottom: 0 }} />
          </div>
        </div>
      )}

      {/* ── Claims table ── */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>My Claims</div>
          <button onClick={() => navigate('/insured/claims')} style={{ background: '#1e3a5f', border: 'none', borderRadius: 8, color: '#fff', padding: '7px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            View All
          </button>
        </div>
        <Table dataSource={claims.slice(0, 5)} columns={claimColumns} rowKey="_id" pagination={false} size="small"
          locale={{ emptyText: <div style={{ padding: '32px 0', color: '#9ca3af' }}>No claims filed yet</div> }} />
      </div>

    </div>
  );
}
