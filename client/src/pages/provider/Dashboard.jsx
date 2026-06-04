import { useEffect, useState } from 'react';
import { Table, Tag, Typography, Spin } from 'antd';
import { AlertOutlined, FileAddOutlined, CheckCircleOutlined, DollarOutlined, ArrowRightOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';

const { Text } = Typography;

const STATUS_DOT = { submitted: '#3b82f6', under_review: '#1d4ed8', pending_finance_approval: '#f97316', approved: '#22c55e', settled: '#10b981', denied: '#ef4444', closed: '#9ca3af' };

function StatBox({ label, value, icon, color, sub }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '20px 22px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', flex: 1, minWidth: 160 }}>
      <div style={{ width: 42, height: 42, borderRadius: 10, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, fontSize: 19, marginBottom: 14 }}>{icon}</div>
      <div style={{ color: '#6b7280', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{label}</div>
      <div style={{ color: '#111827', fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

export default function ProviderDashboard() {
  const [claims, setClaims]         = useState([]);
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading]       = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    Promise.all([api.get('/claims'), api.get('/agreements')])
      .then(([c, a]) => {
        setClaims(Array.isArray(c.data.claims) ? c.data.claims : []);
        setAgreements(Array.isArray(a.data.agreements) ? a.data.agreements : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>;

  const openClaims       = claims.filter(c => !['settled', 'closed', 'denied'].includes(c.status));
  const settledClaims    = claims.filter(c => c.status === 'settled');
  const activeAgreements = agreements.filter(a => a.status === 'active');
  const totalSettled     = settledClaims.reduce((s, c) => s + (c.approvedAmount || c.claimedAmount || 0), 0);
  const pendingFinance   = claims.filter(c => c.status === 'pending_finance_approval').length;

  const fmtAmt = v => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}K`;
    return v.toLocaleString();
  };

  const columns = [
    { title: 'Claim #', dataIndex: 'claimNumber', key: 'n', render: v => <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#6b7280' }}>{v}</span> },
    { title: 'Patient', key: 'p', render: (_, r) => <span style={{ fontWeight: 600 }}>{r.insuredPerson?.firstName || ''} {r.insuredPerson?.lastName || ''}</span> },
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

      {/* ── Hero ── */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #164e63 100%)', borderRadius: 16, padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Provider Portal</div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 20 }}>Welcome back, {user?.firstName}!</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 }}>
            {activeAgreements.length} active agreement{activeAgreements.length !== 1 ? 's' : ''} · {openClaims.length} open claim{openClaims.length !== 1 ? 's' : ''}
            {pendingFinance > 0 && <span style={{ color: '#fbbf24', marginLeft: 8 }}>· {pendingFinance} pending finance approval</span>}
          </div>
        </div>
        <button onClick={() => navigate('/provider/submit-claim')}
          style={{ background: '#22c55e', border: 'none', borderRadius: 9, color: '#fff', padding: '11px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <PlusOutlined /> Submit Claim
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <StatBox label="Open Claims"       value={openClaims.length}       icon={<AlertOutlined />}        color="#f59e0b" sub="Awaiting resolution" />
        <StatBox label="Settled Claims"    value={settledClaims.length}    icon={<CheckCircleOutlined />}  color="#22c55e" sub="Fully processed" />
        <StatBox label="Active Agreements" value={activeAgreements.length} icon={<FileAddOutlined />}      color="#1e3a5f" sub="Network agreements" />
        <StatBox label="Total Settled ETB" value={`${fmtAmt(totalSettled)}`} icon={<DollarOutlined />}    color="#8b5cf6" sub="Lifetime payments" />
      </div>

      {/* ── Active agreements ── */}
      {activeAgreements.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '22px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 14 }}>Active Agreements</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activeAgreements.slice(0, 3).map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f9fafb', borderRadius: 10, padding: '12px 16px' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{a.payer?.name || 'Enterprise Insurance'}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{a.agreementNumber || '—'} · Expires {new Date(a.endDate || Date.now()).toLocaleDateString()}</div>
                </div>
                <span style={{ background: '#dcfce7', color: '#16a34a', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>ACTIVE</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recent claims ── */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>Recent Claims</div>
          <button onClick={() => navigate('/provider/claims')}
            style={{ background: 'none', border: 'none', color: '#1d4ed8', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            View All <ArrowRightOutlined style={{ fontSize: 11 }} />
          </button>
        </div>
        <Table dataSource={claims.slice(0, 8)} columns={columns} rowKey="_id" pagination={false} size="small"
          locale={{ emptyText: <div style={{ padding: '32px 0', color: '#9ca3af' }}>No claims submitted yet</div> }} />
      </div>

    </div>
  );
}
