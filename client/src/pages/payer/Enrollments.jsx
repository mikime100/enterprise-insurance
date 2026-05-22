import { useEffect, useState } from 'react';
import { Table, Tag, Button, Space, Modal, Spin, Avatar } from 'antd';
import { PlusOutlined, CheckCircleOutlined, EyeOutlined } from '@ant-design/icons';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';

const D = {
  bg:     '#0d1117',
  card:   '#161b22',
  card2:  '#1c2128',
  border: 'rgba(255,255,255,0.08)',
  text:   '#f0f6fc',
  sec:    '#8b949e',
  link:   '#58a6ff',
  green:  '#22c55e',
  blue:   '#1d4ed8',
  red:    '#ef4444',
  amber:  '#f59e0b',
};

const STATUS_STYLE = {
  active:          { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)'  },
  approved:        { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)'  },
  pending:         { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)' },
  pending_renewal: { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.25)' },
  expired:         { color: '#8b949e', bg: 'rgba(139,148,158,0.1)', border: 'rgba(139,148,158,0.25)' },
  cancelled:       { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)'  },
  suspended:       { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.expired;
  return (
    <span style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

const FILTER_TABS = [
  { key: 'all',            label: 'All' },
  { key: 'active',         label: 'Active' },
  { key: 'pending_renewal',label: 'Renewals' },
  { key: 'expired',        label: 'Expired' },
  { key: 'cancelled',      label: 'Cancelled' },
];

export default function PayerEnrollments() {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [detail, setDetail]           = useState(null);
  const [search, setSearch]           = useState('');
  const [activeTab, setActiveTab]     = useState('all');
  const { user } = useAuth();

  const load = () => {
    setLoading(true);
    api.get('/enrollments')
      .then(r => setEnrollments(Array.isArray(r.data.enrollments) ? r.data.enrollments : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openDetail = (e) => api.get(`/enrollments/${e._id}`).then(r => setDetail(r.data.enrollment));
  const activate   = async (e) => { await api.patch(`/enrollments/${e._id}/status`, { status: 'active', notes: 'Activated by payer admin' }); load(); };

  const counts = {
    active:   enrollments.filter(e => e.status === 'active').length,
    renewals: enrollments.filter(e => e.status === 'pending_renewal').length,
    totalPremium: enrollments.reduce((sum, e) => sum + (e.premium?.amount || 0), 0),
  };

  const filtered = enrollments.filter(e => {
    if (activeTab !== 'all' && e.status !== activeTab) return false;
    if (search) {
      const s = search.toLowerCase();
      const name = (e.institution?.name || 'Individual').toLowerCase();
      const num  = (e.enrollmentNumber || '').toLowerCase();
      if (!name.includes(s) && !num.includes(s)) return false;
    }
    return true;
  });

  const fmtPremium = (v) => {
    if (!v) return '—';
    if (v >= 1_000_000_000) return `ETB ${(v / 1_000_000_000).toFixed(2)}B`;
    if (v >= 1_000_000)     return `ETB ${(v / 1_000_000).toFixed(2)}M`;
    return `ETB ${v.toLocaleString()}`;
  };

  const columns = [
    {
      title: 'POLICY #', key: 'num',
      render: (_, r) => <span style={{ color: D.sec, fontFamily: 'monospace', fontSize: 13 }}>{r.enrollmentNumber}</span>,
    },
    {
      title: 'INSTITUTION', key: 'inst',
      render: (_, r) => (
        <div>
          <div style={{ color: D.text, fontWeight: 600, fontSize: 14 }}>{r.institution?.name || 'Individual'}</div>
          {r.tier && <div style={{ color: D.sec, fontSize: 11, marginTop: 2 }}>{r.tier.name}</div>}
        </div>
      ),
    },
    {
      title: 'EFFECTIVE', key: 'eff',
      render: (_, r) => <span style={{ color: D.sec, fontSize: 13 }}>{r.startDate ? new Date(r.startDate).toLocaleDateString() : '—'}</span>,
    },
    {
      title: 'RENEWAL', key: 'ren',
      render: (_, r) => <span style={{ color: D.sec, fontSize: 13 }}>{r.endDate ? new Date(r.endDate).toLocaleDateString() : '—'}</span>,
    },
    {
      title: 'ANNUAL PREMIUM', key: 'prem', align: 'right',
      render: (_, r) => (
        <span style={{ color: D.text, fontWeight: 600, fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>
          ETB {(r.premium?.amount || 0).toLocaleString()}
        </span>
      ),
    },
    {
      title: 'STATUS', key: 'status', width: 150,
      render: (_, r) => <StatusBadge status={r.status} />,
    },
    {
      title: '', key: 'actions', width: 100,
      render: (_, r) => (
        <Space size={6}>
          <button onClick={() => openDetail(r)} style={iconBtn}>
            <EyeOutlined />
          </button>
          {['payer_admin', 'superadmin'].includes(user?.role) && r.status === 'pending' && (
            <button onClick={() => activate(r)} style={{ ...iconBtn, color: D.green }}>
              <CheckCircleOutlined />
            </button>
          )}
        </Space>
      ),
    },
  ];

  const iconBtn = {
    background: 'rgba(255,255,255,0.06)',
    border: `1px solid ${D.border}`,
    borderRadius: 7,
    color: D.sec,
    padding: '5px 9px',
    cursor: 'pointer',
    fontSize: 13,
    display: 'inline-flex',
    alignItems: 'center',
  };

  return (
    <div style={{ background: D.bg, minHeight: '100%', margin: -24, padding: 28 }}>
      <style>{`
        .pol-table .ant-table                              { background: transparent !important; }
        .pol-table .ant-table-thead > tr > th             { background: rgba(255,255,255,0.03) !important; color: ${D.sec} !important; border-bottom: 1px solid ${D.border} !important; font-size: 11px; letter-spacing: .08em; font-weight: 700; padding: 10px 16px !important; }
        .pol-table .ant-table-tbody > tr > td             { border-bottom: 1px solid rgba(255,255,255,0.05) !important; background: transparent !important; padding: 14px 16px !important; }
        .pol-table .ant-table-tbody > tr:hover > td       { background: rgba(255,255,255,0.03) !important; }
        .pol-table .ant-pagination .ant-pagination-item   { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); }
        .pol-table .ant-pagination .ant-pagination-item a { color: ${D.sec}; }
        .pol-table .ant-pagination .ant-pagination-item-active          { background: ${D.blue}; border-color: ${D.blue}; }
        .pol-table .ant-pagination .ant-pagination-item-active a        { color: #fff; }
        .pol-table .ant-pagination .ant-pagination-prev button,
        .pol-table .ant-pagination .ant-pagination-next button          { color: ${D.sec}; background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); }
        .pol-table .ant-empty-description { color: ${D.sec}; }
        .pol-table .ant-spin-dot-item     { background: ${D.green} !important; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ color: D.text, fontWeight: 800, fontSize: 22, margin: 0 }}>Institutional Policies</h1>
          <p style={{ color: D.sec, fontSize: 13, margin: '4px 0 0' }}>Active directory and historical archive of enterprise risk portfolios.</p>
        </div>
        {['payer_admin', 'superadmin'].includes(user?.role) && (
          <button style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 10, color: D.text, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <PlusOutlined /> New Policy Draft
          </button>
        )}
      </div>

      {/* ── 3 stat cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: 16, marginBottom: 24 }}>
        {[
          {
            label: 'ACTIVE VOLUME',
            value: counts.active,
            sub: `+${Math.max(0, counts.active - 230)} this quarter`,
            color: D.link,
            icon: '🏢',
          },
          {
            label: 'TOTAL PREMIUM (ETB)',
            value: fmtPremium(counts.totalPremium),
            sub: 'Current fiscal year',
            color: D.text,
            icon: '💰',
          },
          {
            label: 'PENDING RENEWALS',
            value: counts.renewals,
            sub: counts.renewals > 0 ? 'Requires immediate audit' : 'All renewals current',
            color: counts.renewals > 0 ? D.amber : D.green,
            icon: '📅',
          },
        ].map(s => (
          <div key={s.label} style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: '24px 28px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: 20, top: 20, fontSize: 30, opacity: 0.06 }}>{s.icon}</div>
            <div style={{ color: D.sec, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 12 }}>{s.label}</div>
            <div style={{ fontSize: 38, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ color: s.label === 'PENDING RENEWALS' && counts.renewals > 0 ? D.amber : D.sec, fontSize: 12, marginTop: 8, fontWeight: counts.renewals > 0 && s.label === 'PENDING RENEWALS' ? 600 : 400 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Table card ── */}
      <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, overflow: 'hidden' }}>

        {/* Search + filter bar */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${D.border}`, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: D.sec, fontSize: 14 }}>🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search Institution or Policy #..."
              style={{ width: '100%', background: D.card2, border: `1px solid ${D.border}`, borderRadius: 8, color: D.text, padding: '8px 12px 8px 36px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 2, background: D.card2, borderRadius: 8, padding: 3, border: `1px solid ${D.border}` }}>
            {FILTER_TABS.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                style={{ background: activeTab === t.key ? D.blue : 'transparent', border: 'none', borderRadius: 6, color: activeTab === t.key ? '#fff' : D.sec, padding: '6px 14px', fontSize: 12, fontWeight: activeTab === t.key ? 700 : 400, cursor: 'pointer', transition: 'all 0.15s' }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="pol-table" style={{ padding: '0 4px' }}>
          {loading
            ? <div style={{ padding: 60, textAlign: 'center' }}><Spin /></div>
            : <Table dataSource={filtered} columns={columns} rowKey="_id" pagination={{ pageSize: 10, style: { padding: '12px 20px' }, showTotal: (total, range) => <span style={{ color: D.sec }}>Showing {range[0]}–{range[1]} of {total} records</span> }} size="small" />
          }
        </div>
      </div>

      {/* ── Detail Modal ── */}
      <Modal
        title={null}
        open={!!detail}
        onCancel={() => setDetail(null)}
        footer={null}
        width={720}
        styles={{ content: { background: D.card, border: `1px solid ${D.border}`, borderRadius: 16, padding: 0 }, mask: { backdropFilter: 'blur(4px)' } }}
      >
        {detail && (
          <div>
            {/* Modal header */}
            <div style={{ padding: '20px 28px', borderBottom: `1px solid ${D.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ color: D.text, fontWeight: 800, margin: 0, fontSize: 18 }}>{detail.institution?.name || 'Individual Policy'}</h3>
                  <span style={{ color: D.sec, fontSize: 13 }}>{detail.enrollmentNumber}</span>
                </div>
                <StatusBadge status={detail.status} />
              </div>
            </div>

            {/* Policy details */}
            <div style={{ padding: '20px 28px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                {[
                  { label: 'Product',          value: detail.product?.name || '—' },
                  { label: 'Tier',             value: detail.tier?.name || '—' },
                  { label: 'Annual Premium',   value: `${(detail.premium?.amount || 0).toLocaleString()} ETB` },
                  { label: 'Employer Share',   value: detail.premium?.employerShare ? `${detail.premium.employerShare.toLocaleString()} ETB` : '—' },
                  { label: 'Employee Share',   value: detail.premium?.employeeShare ? `${detail.premium.employeeShare.toLocaleString()} ETB` : '—' },
                  { label: 'Coverage Period',  value: `${new Date(detail.startDate).toLocaleDateString()} – ${new Date(detail.endDate).toLocaleDateString()}` },
                ].map(f => (
                  <div key={f.label} style={{ background: D.card2, borderRadius: 8, padding: 14 }}>
                    <div style={{ color: D.sec, fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', marginBottom: 5 }}>{f.label.toUpperCase()}</div>
                    <div style={{ color: D.text, fontWeight: 600, fontSize: 14 }}>{f.value}</div>
                  </div>
                ))}
              </div>

              {/* Insured members */}
              {detail.insuredPersons?.length > 0 && (
                <div>
                  <div style={{ color: D.sec, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 10 }}>INSURED MEMBERS ({detail.insuredPersons.length})</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
                    {detail.insuredPersons.map((p, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: D.card2, borderRadius: 8, padding: '10px 14px' }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: D.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 13, flexShrink: 0 }}>
                          {p.firstName?.[0]}{p.lastName?.[0]}
                        </div>
                        <div>
                          <div style={{ color: D.text, fontWeight: 600, fontSize: 14 }}>{p.firstName} {p.lastName}</div>
                          <div style={{ color: D.sec, fontSize: 12 }}>{p.email || '—'} · {p.dependents?.length || 0} dependents</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Activate button */}
              {['payer_admin', 'superadmin'].includes(user?.role) && detail.status === 'pending' && (
                <button onClick={() => { activate(detail); setDetail(null); }}
                  style={{ width: '100%', marginTop: 16, padding: 14, background: D.green, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                  ✓ Activate Policy
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
