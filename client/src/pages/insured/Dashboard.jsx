import { useEffect, useState } from 'react';
import { Table, Tag, Typography, Spin, Progress } from 'antd';
import {
  SafetyOutlined, AlertOutlined, PlusOutlined, ArrowRightOutlined,
  FileTextOutlined, BankOutlined, UserOutlined, PhoneOutlined, MailOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';

const { Text } = Typography;

const STATUS_DOT = {
  submitted: '#3b82f6', under_review: '#1d4ed8', approved: '#22c55e',
  denied: '#ef4444', settled: '#10b981', closed: '#9ca3af',
};

// ── Detect enrollment origin from user + enrollments ─────────────────────────
function getEnrollmentType(user, enrollments) {
  if (user?.registeredByBroker) return 'broker';
  if (user?.institutionId || enrollments.some(e => e.institution)) return 'institution';
  return 'individual';
}

function StatBox({ label, value, icon, color, sub }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '20px 22px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', flex: 1 }}>
      <div style={{ width: 42, height: 42, borderRadius: 10, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, fontSize: 19, marginBottom: 14 }}>{icon}</div>
      <div style={{ color: '#6b7280', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{label}</div>
      <div style={{ color: '#111827', fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

// ── Hero banners per enrollment type ─────────────────────────────────────────
function HeroBanner({ type, user, activePolicy, navigate }) {
  const broker = user?.registeredByBroker;

  const configs = {
    individual: {
      gradient: 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)',
      badge: 'Individual Plan',
      badgeBg: 'rgba(34,197,94,0.2)',
      badgeColor: '#4ade80',
      sub: activePolicy
        ? `Covered under ${activePolicy.product?.name}${activePolicy.tier?.name ? ' · ' + activePolicy.tier.name : ''}`
        : 'No active coverage — explore plans to get started',
      primaryCTA: { label: 'File a Claim', icon: <PlusOutlined />, action: () => navigate('/insured/claims'), color: '#22c55e' },
      secondaryCTA: activePolicy ? { label: 'View Coverage', action: () => navigate('/insured/coverage') } : null,
    },
    institution: {
      gradient: 'linear-gradient(135deg, #1e3a5f 0%, #0f2847 100%)',
      badge: 'Group / Corporate',
      badgeBg: 'rgba(59,130,246,0.2)',
      badgeColor: '#93c5fd',
      sub: activePolicy?.institution?.name
        ? `Your ${activePolicy.institution.name} employee benefits`
        : 'Employer-sponsored group coverage',
      primaryCTA: { label: 'File a Claim', icon: <PlusOutlined />, action: () => navigate('/insured/claims'), color: '#22c55e' },
      secondaryCTA: { label: 'View Benefits', action: () => navigate('/insured/coverage') },
    },
    broker: {
      gradient: 'linear-gradient(135deg, #312e81 0%, #1e3a5f 100%)',
      badge: 'Broker-Assisted',
      badgeBg: 'rgba(139,92,246,0.2)',
      badgeColor: '#c4b5fd',
      sub: broker
        ? `Managed by ${broker.firstName} ${broker.lastName}`
        : 'Managed by your insurance broker',
      primaryCTA: { label: 'File a Claim', icon: <PlusOutlined />, action: () => navigate('/insured/claims'), color: '#22c55e' },
      secondaryCTA: activePolicy ? { label: 'View Coverage', action: () => navigate('/insured/coverage') } : null,
    },
  };

  const cfg = configs[type];
  return (
    <div style={{ background: cfg.gradient, borderRadius: 16, padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ background: cfg.badgeBg, color: cfg.badgeColor, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{cfg.badge}</span>
          </div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 20 }}>Welcome back, {user?.firstName}!</div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 }}>{cfg.sub}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button onClick={cfg.primaryCTA.action}
          style={{ background: cfg.primaryCTA.color, border: 'none', borderRadius: 9, color: '#fff', padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
          {cfg.primaryCTA.icon} {cfg.primaryCTA.label}
        </button>
        {cfg.secondaryCTA && (
          <button onClick={cfg.secondaryCTA.action}
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 9, color: '#fff', padding: '10px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
            {cfg.secondaryCTA.label}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Unique panel per type ─────────────────────────────────────────────────────
function UniquePanel({ type, user, activePolicy, navigate }) {
  const broker = user?.registeredByBroker;

  if (type === 'individual') {
    return (
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '22px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 14 }}>Payment & Plan</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '14px', border: '1px solid #bbf7d0' }}>
            <div style={{ color: '#16a34a', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Plan Type</div>
            <div style={{ color: '#111827', fontWeight: 700 }}>Individual</div>
          </div>
          <div style={{ background: '#eff6ff', borderRadius: 10, padding: '14px', border: '1px solid #bfdbfe' }}>
            <div style={{ color: '#1d4ed8', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Premium</div>
            <div style={{ color: '#111827', fontWeight: 700 }}>
              {activePolicy ? `${(activePolicy.premium?.amount || 0).toLocaleString()} ETB/yr` : '—'}
            </div>
          </div>
        </div>
        <button onClick={() => navigate('/insured/coverage')}
          style={{ width: '100%', marginTop: 12, padding: '10px 0', background: 'none', border: '1px solid #e5e7eb', borderRadius: 9, color: '#1d4ed8', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          Manage My Plan →
        </button>
      </div>
    );
  }

  if (type === 'institution') {
    const inst = activePolicy?.institution;
    return (
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '22px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <BankOutlined style={{ color: '#1d4ed8', fontSize: 16 }} />
          <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>Your Employer Coverage</div>
        </div>
        <div style={{ background: '#eff6ff', borderRadius: 10, padding: '14px', border: '1px solid #bfdbfe', marginBottom: 10 }}>
          <div style={{ color: '#1d4ed8', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Employer</div>
          <div style={{ color: '#111827', fontWeight: 700 }}>{inst?.name || 'Your Organisation'}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px' }}>
            <div style={{ color: '#6b7280', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Employer Pays</div>
            <div style={{ color: '#111827', fontWeight: 700 }}>{activePolicy?.premium?.employerShare ? `${activePolicy.premium.employerShare.toLocaleString()} ETB` : 'Covered'}</div>
          </div>
          <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px' }}>
            <div style={{ color: '#6b7280', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Your Share</div>
            <div style={{ color: '#111827', fontWeight: 700 }}>{activePolicy?.premium?.employeeShare ? `${activePolicy.premium.employeeShare.toLocaleString()} ETB` : '—'}</div>
          </div>
        </div>
        <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 9, padding: '10px 14px', fontSize: 12, color: '#92400e' }}>
          To change your coverage tier, contact your HR department.
        </div>
      </div>
    );
  }

  // broker
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '22px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <UserOutlined style={{ color: '#8b5cf6', fontSize: 16 }} />
        <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>Your Broker</div>
      </div>
      {broker ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f5f3ff', borderRadius: 10, padding: '14px', border: '1px solid #ddd6fe', marginBottom: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: 16, flexShrink: 0 }}>
              {broker.firstName?.[0]}{broker.lastName?.[0]}
            </div>
            <div>
              <div style={{ color: '#111827', fontWeight: 700, fontSize: 15 }}>{broker.firstName} {broker.lastName}</div>
              <div style={{ color: '#6b7280', fontSize: 12 }}>Sales Broker · Enterprise Insurance</div>
            </div>
          </div>
          {broker.email && (
            <a href={`mailto:${broker.email}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb', marginBottom: 8, textDecoration: 'none' }}>
              <MailOutlined style={{ color: '#8b5cf6' }} />
              <span style={{ color: '#374151', fontSize: 13 }}>{broker.email}</span>
            </a>
          )}
          {broker.phone && (
            <a href={`tel:${broker.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb', textDecoration: 'none' }}>
              <PhoneOutlined style={{ color: '#8b5cf6' }} />
              <span style={{ color: '#374151', fontSize: 13 }}>{broker.phone}</span>
            </a>
          )}
        </>
      ) : (
        <div style={{ color: '#6b7280', fontSize: 13 }}>Broker information unavailable.</div>
      )}
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────
export default function InsuredDashboard() {
  const [enrollments, setEnrollments] = useState([]);
  const [claims, setClaims]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

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

  const activePolicy  = enrollments.find(e => e.status === 'active');
  const openClaims    = claims.filter(c => !['settled', 'closed', 'denied'].includes(c.status));
  const enrollmentType = getEnrollmentType(user, enrollments);
  const daysLeft      = activePolicy ? Math.max(0, Math.ceil((new Date(activePolicy.endDate) - new Date()) / 86400000)) : 0;
  const coveragePct   = activePolicy ? Math.min(100, Math.round((daysLeft / 365) * 100)) : 0;

  const claimColumns = [
    { title: 'Claim #', dataIndex: 'claimNumber', key: 'n', render: v => <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#6b7280' }}>{v}</span> },
    { title: 'Type', dataIndex: 'claimType', key: 't', render: v => <Tag style={{ borderRadius: 6, textTransform: 'capitalize' }}>{v?.replace(/_/g, ' ')}</Tag> },
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

      <HeroBanner type={enrollmentType} user={user} activePolicy={activePolicy} navigate={navigate} />

      {/* Stat row */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <StatBox label="Active Policies" value={enrollments.filter(e => e.status === 'active').length} icon={<SafetyOutlined />} color="#10b981" sub="Coverage active" />
        <StatBox label="Open Claims"     value={openClaims.length} icon={<AlertOutlined />} color="#f59e0b" sub={openClaims.length > 0 ? 'Awaiting resolution' : 'All resolved'} />
        <StatBox label="Total Claims"    value={claims.length} icon={<FileTextOutlined />} color="#8b5cf6" sub="Since enrollment" />
      </div>

      {/* Two-column section */}
      <div style={{ display: 'grid', gridTemplateColumns: activePolicy ? '1fr 320px' : '1fr', gap: 16, alignItems: 'start' }}>

        {/* Active coverage card */}
        {activePolicy && (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '22px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>My Active Coverage</div>
              <button onClick={() => navigate('/insured/coverage')}
                style={{ background: 'none', border: 'none', color: '#1d4ed8', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                View Details <ArrowRightOutlined style={{ fontSize: 11 }} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 18 }}>
              {[
                { label: 'Product',     value: activePolicy.product?.name || '—' },
                { label: 'Tier',        value: activePolicy.tier?.name || 'Standard' },
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
              <Progress percent={coveragePct} showInfo={false} strokeColor={daysLeft < 30 ? '#ef4444' : '#22c55e'} trailColor="#f3f4f6" strokeWidth={8} />
            </div>
          </div>
        )}

        {/* Unique panel based on enrollment type */}
        <UniquePanel type={enrollmentType} user={user} activePolicy={activePolicy} navigate={navigate} />
      </div>

      {/* Claims table */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>My Claims</div>
          <button onClick={() => navigate('/insured/claims')}
            style={{ background: '#1e3a5f', border: 'none', borderRadius: 8, color: '#fff', padding: '7px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            View All
          </button>
        </div>
        <Table dataSource={claims.slice(0, 5)} columns={claimColumns} rowKey="_id" pagination={false} size="small"
          locale={{ emptyText: <div style={{ padding: '32px 0', color: '#9ca3af' }}>No claims filed yet</div> }} />
      </div>
    </div>
  );
}
