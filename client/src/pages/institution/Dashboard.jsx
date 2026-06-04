import { useEffect, useState } from 'react';
import { Table, Tag, Button, Typography, Spin } from 'antd';
import { TeamOutlined, SafetyOutlined, AlertOutlined, DollarOutlined, ArrowRightOutlined, UserAddOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';

const { Text } = Typography;

const STATUS_DOT = { submitted: '#3b82f6', under_review: '#1d4ed8', approved: '#22c55e', denied: '#ef4444', settled: '#10b981', pending_finance_approval: '#f97316', closed: '#9ca3af' };

function StatBox({ label, value, icon, color, sub, alert }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${alert ? '#fecaca' : '#e5e7eb'}`, borderRadius: 14, padding: '20px 22px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', flex: 1, minWidth: 160 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ width: 42, height: 42, borderRadius: 10, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, fontSize: 19 }}>{icon}</div>
        {alert && <span style={{ background: '#fef2f2', color: '#ef4444', borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>Action needed</span>}
      </div>
      <div style={{ color: '#6b7280', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{label}</div>
      <div style={{ color: '#111827', fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

export default function InstitutionDashboard() {
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

  const activeEnrollment = enrollments.find(e => e.status === 'active');
  const totalMembers     = activeEnrollment?.insuredPersons?.length || 0;
  const openClaims       = claims.filter(c => !['settled', 'closed', 'denied'].includes(c.status));
  const totalPremium     = enrollments.filter(e => e.status === 'active').reduce((s, e) => s + (e.premium?.amount || 0), 0);
  const pendingClaims    = claims.filter(c => c.status === 'pending_finance_approval').length;

  const fmtPremium = v => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M ETB`;
    if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}K ETB`;
    return `${v.toLocaleString()} ETB`;
  };

  const claimColumns = [
    { title: 'Claim #', dataIndex: 'claimNumber', key: 'n', render: v => <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#6b7280' }}>{v}</span> },
    { title: 'Employee', key: 'e', render: (_, r) => <span style={{ fontWeight: 600 }}>{r.insuredPerson?.firstName || ''} {r.insuredPerson?.lastName || ''}</span> },
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
    { title: 'Date', dataIndex: 'createdAt', key: 'd', render: v => new Date(v).toLocaleDateString() },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Hero header ── */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2847 100%)', borderRadius: 16, padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Institution HR Portal</div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 20 }}>Welcome back, {user?.firstName}!</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 }}>
            {activeEnrollment ? `${activeEnrollment.product?.name} · ${totalMembers} members enrolled` : 'No active group policy'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/institution/employees')}
            style={{ background: '#22c55e', border: 'none', borderRadius: 9, color: '#fff', padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
            <UserAddOutlined /> Manage Employees
          </button>
          <button onClick={() => navigate('/institution/claims')}
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 9, color: '#fff', padding: '10px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
            View Claims
          </button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <StatBox label="Enrolled Employees" value={totalMembers}  icon={<TeamOutlined />}   color="#3b82f6" sub="Active members" />
        <StatBox label="Active Policies"    value={enrollments.filter(e => e.status === 'active').length} icon={<SafetyOutlined />} color="#10b981" sub="Group coverage" />
        <StatBox label="Open Claims"        value={openClaims.length} icon={<AlertOutlined />} color="#f59e0b" sub="Pending resolution" alert={pendingClaims > 0} />
        <StatBox label="Annual Premium"     value={fmtPremium(totalPremium)} icon={<DollarOutlined />} color="#8b5cf6" sub="Total cost this year" />
      </div>

      {/* ── Active policy summary ── */}
      {activeEnrollment && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '22px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>Group Policy Overview</div>
            <button onClick={() => navigate('/institution/policy')}
              style={{ background: 'none', border: 'none', color: '#1d4ed8', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              View Policy <ArrowRightOutlined style={{ fontSize: 11 }} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
            {[
              { label: 'Product',       value: activeEnrollment.product?.name || '—' },
              { label: 'Tier',          value: activeEnrollment.tier?.name || 'Standard' },
              { label: 'Policy #',      value: activeEnrollment.enrollmentNumber || '—' },
              { label: 'Renewal Date',  value: new Date(activeEnrollment.endDate).toLocaleDateString() },
              { label: 'Total Premium', value: fmtPremium(activeEnrollment.premium?.amount || 0) },
              { label: 'Members',       value: totalMembers.toLocaleString() },
            ].map(f => (
              <div key={f.label} style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ color: '#9ca3af', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{f.label}</div>
                <div style={{ color: '#111827', fontWeight: 700, fontSize: 14 }}>{f.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recent employee claims ── */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>Recent Employee Claims</div>
          <button onClick={() => navigate('/institution/claims')}
            style={{ background: 'none', border: 'none', color: '#1d4ed8', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            View All <ArrowRightOutlined style={{ fontSize: 11 }} />
          </button>
        </div>
        <Table dataSource={claims.slice(0, 6)} columns={claimColumns} rowKey="_id" pagination={false} size="small"
          locale={{ emptyText: <div style={{ padding: '32px 0', color: '#9ca3af' }}>No employee claims yet</div> }} />
      </div>

    </div>
  );
}
