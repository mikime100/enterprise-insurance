import { useEffect, useState } from 'react';
import { Table, Modal, Form, Input, InputNumber, Spin, Button } from 'antd';
import { CheckOutlined, CloseOutlined, WarningOutlined, CheckCircleOutlined, BankOutlined } from '@ant-design/icons';
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

const STATUS_DOT = {
  draft:        '#8b949e',
  submitted:    '#f59e0b',
  under_review: '#3b82f6',
  approved:     '#22c55e',
  rejected:     '#ef4444',
  expired:      '#6b7280',
};

const RISK_LABEL = s => s >= 7 ? ['HIGH', D.red] : s >= 4 ? ['MED', D.amber] : ['LOW', D.green];

function RiskBar({ score = 5 }) {
  const [label, color] = RISK_LABEL(score);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 70, height: 5, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${(score / 10) * 100}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: '0.05em' }}>{label}</span>
    </div>
  );
}

export default function PayerQuotes() {
  const [quotes, setQuotes]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [detail, setDetail]       = useState(null);
  const [rationale, setRationale] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [uwModal, setUwModal]     = useState({ open: false, quote: null });
  const [uwForm]                  = Form.useForm();
  const { user } = useAuth();

  const load = () => {
    setLoading(true);
    api.get('/quotes')
      .then(r => setQuotes(Array.isArray(r.data.quotes) ? r.data.quotes : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openDetail = async (q) => {
    setRationale('');
    setDetail({ ...q });
    try {
      const r = await api.get(`/quotes/${q._id}`);
      setDetail(r.data.quote);
    } catch (_) {}
  };

  const takeOwnership = async (q) => {
    await api.patch(`/quotes/${q._id}/underwrite`, { note: 'Underwriter assigned and review started.' });
    load();
    openDetail(q);
  };

  const handleDecide = async (approved) => {
    const vals = await uwForm.validateFields();
    await api.patch(`/quotes/${uwModal.quote._id}/status`, {
      status: approved ? 'approved' : 'rejected',
      finalPremium: vals.finalPremium,
      note: vals.note || rationale,
    });
    setUwModal({ open: false, quote: null });
    setDetail(null);
    load();
  };

  const counts = {
    pending:   quotes.filter(q => q.status === 'submitted').length,
    inReview:  quotes.filter(q => q.status === 'under_review').length,
    approved:  quotes.filter(q => q.status === 'approved').length,
    rejected:  quotes.filter(q => q.status === 'rejected').length,
  };
  const sla = 98;
  const dailyDone = counts.approved + counts.rejected;
  const pendingRisks = counts.inReview;

  const filtered = filterStatus === 'all' ? quotes : quotes.filter(q => q.status === filterStatus);

  const clientName = r => r.institution?.name || `${r.insuredPerson?.firstName ?? ''} ${r.insuredPerson?.lastName ?? ''}`.trim();
  const quoteAmount = r => r.scenarios?.[0]?.annualPremium || r.finalPremium || 0;
  const daysOld = r => r.createdAt ? Math.floor((Date.now() - new Date(r.createdAt)) / 86400000) : 0;

  const columns = [
    {
      title: '', key: 'pri', width: 36,
      render: (_, r) => {
        const s = r.riskFactors?.riskScore || 3;
        return s >= 7
          ? <WarningOutlined style={{ color: D.red, fontSize: 15 }} />
          : <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${D.sec}`, margin: '0 auto' }} />;
      },
    },
    {
      title: 'INSTITUTION', key: 'inst',
      render: (_, r) => (
        <span style={{ color: D.link, fontWeight: 600, cursor: 'pointer', fontSize: 14 }} onClick={() => openDetail(r)}>
          {clientName(r)}
        </span>
      ),
    },
    {
      title: 'PRODUCT', key: 'prod',
      render: (_, r) => <span style={{ color: D.sec, fontSize: 13 }}>{r.product?.name || '—'}</span>,
    },
    {
      title: 'QUOTE AMOUNT (ETB)', key: 'amt', align: 'right',
      render: (_, r) => (
        <span style={{ color: D.text, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          ETB {quoteAmount(r).toLocaleString()}
        </span>
      ),
    },
    {
      title: 'DAYS', key: 'days', width: 70, align: 'center',
      render: (_, r) => {
        const d = daysOld(r);
        return <span style={{ color: d > 14 ? D.red : D.text, fontWeight: 700 }}>{d}</span>;
      },
    },
    {
      title: 'STATUS', key: 'status', width: 160,
      render: (_, r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS_DOT[r.status] || D.sec, display: 'inline-block', flexShrink: 0 }} />
          <span style={{ color: D.text, fontSize: 13, textTransform: 'capitalize' }}>{r.status?.replace(/_/g, ' ')}</span>
        </div>
      ),
    },
    {
      title: 'RISK LEVEL', key: 'risk', width: 150,
      render: (_, r) => <RiskBar score={r.riskFactors?.riskScore || 4} />,
    },
    {
      title: '', key: 'actions', width: 110,
      render: (_, r) => (
        <div style={{ display: 'flex', gap: 6 }}>
          {['underwriter', 'payer_admin', 'superadmin'].includes(user?.role) && r.status === 'submitted' && (
            <btn onClick={() => takeOwnership(r)} style={btnStyle(D.blue)}>Take</btn>
          )}
          {['underwriter', 'payer_admin', 'superadmin'].includes(user?.role) && r.status === 'under_review' && (
            <btn onClick={() => { uwForm.resetFields(); setUwModal({ open: true, quote: r }); }} style={btnStyle(D.green)}>Decide</btn>
          )}
          <btn onClick={() => openDetail(r)} style={btnStyle('rgba(255,255,255,0.07)', D.sec, `1px solid ${D.border}`)}>View</btn>
        </div>
      ),
    },
  ];

  const btnStyle = (bg, color = '#fff', border = 'none') => ({
    background: bg, border, borderRadius: 6, color, padding: '4px 10px',
    fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
  });

  return (
    <div style={{ background: D.bg, minHeight: '100%', margin: -24, padding: 28 }}>
      <style>{`
        .uw-table .ant-table                              { background: transparent !important; }
        .uw-table .ant-table-thead > tr > th             { background: rgba(255,255,255,0.03) !important; color: ${D.sec} !important; border-bottom: 1px solid ${D.border} !important; font-size: 11px; letter-spacing: .08em; font-weight: 700; padding: 10px 16px !important; }
        .uw-table .ant-table-tbody > tr > td             { border-bottom: 1px solid rgba(255,255,255,0.05) !important; background: transparent !important; padding: 14px 16px !important; }
        .uw-table .ant-table-tbody > tr:hover > td       { background: rgba(255,255,255,0.03) !important; }
        .uw-table .ant-pagination .ant-pagination-item   { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); }
        .uw-table .ant-pagination .ant-pagination-item a { color: ${D.sec}; }
        .uw-table .ant-pagination .ant-pagination-item-active           { background: ${D.blue}; border-color: ${D.blue}; }
        .uw-table .ant-pagination .ant-pagination-item-active a         { color: #fff; }
        .uw-table .ant-pagination .ant-pagination-prev button,
        .uw-table .ant-pagination .ant-pagination-next button           { color: ${D.sec}; background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); }
        .uw-table .ant-empty-description { color: ${D.sec}; }
        .uw-table .ant-spin-dot-item     { background: ${D.green} !important; }
      `}</style>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ color: D.text, fontWeight: 800, fontSize: 22, margin: 0 }}>Underwriting Portal</h1>
          <p style={{ color: D.sec, fontSize: 13, margin: '4px 0 0' }}>Review and process incoming insurance applications.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Chip color={D.green} bg="rgba(34,197,94,0.1)" border="rgba(34,197,94,0.25)">SLA: {sla}%</Chip>
          <Chip color={D.text} bg="rgba(255,255,255,0.05)" border={D.border}>Daily Target: {dailyDone}/{dailyDone + counts.pending + counts.inReview}</Chip>
          {pendingRisks > 0 && <Chip color={D.red} bg="rgba(239,68,68,0.1)" border="rgba(239,68,68,0.25)">⚠ Pending Risks: {pendingRisks}</Chip>}
        </div>
      </div>

      {/* ── 3 stat cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px,1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'PENDING DECISIONS', value: counts.pending + counts.inReview, sub: 'quotes awaiting action', color: '#58a6ff' },
          { label: 'PRIORITY RISKS',    value: pendingRisks, sub: 'require immediate review', color: D.red },
          { label: 'SLA COMPLIANCE',    value: `${sla} %`, sub: `↑ +2.1% vs last month`, color: D.green },
        ].map(s => (
          <div key={s.label} style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: '24px 28px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ color: D.sec, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 12 }}>{s.label}</div>
            <div style={{ fontSize: 40, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ color: D.sec, fontSize: 12, marginTop: 8 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Queue table card ── */}
      <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${D.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <span style={{ color: D.text, fontWeight: 700, fontSize: 15 }}>Pending Quotes Queue</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              style={{ background: D.card2, border: `1px solid ${D.border}`, borderRadius: 8, color: D.text, padding: '7px 12px', fontSize: 12, cursor: 'pointer', outline: 'none' }}>
              <option value="all">All Products</option>
              <option value="submitted">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <button style={{ background: D.card2, border: `1px solid ${D.border}`, borderRadius: 8, color: D.sec, padding: '7px 14px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              ⇅ Sort by Priority
            </button>
          </div>
        </div>
        <div className="uw-table" style={{ padding: '0 4px' }}>
          {loading
            ? <div style={{ padding: 60, textAlign: 'center' }}><Spin /></div>
            : <Table dataSource={filtered} columns={columns} rowKey="_id" pagination={{ pageSize: 8, style: { padding: '12px 20px' } }} size="small" />
          }
        </div>
      </div>

      {/* ── Quote Detail Overlay ── */}
      {detail && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 20, overflowY: 'auto', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setDetail(null); }}
        >
          <div style={{ background: D.bg, border: `1px solid ${D.border}`, borderRadius: 16, width: '100%', maxWidth: 1120, marginBottom: 20 }}>

            {/* Detail topbar */}
            <div style={{ padding: '18px 28px', borderBottom: `1px solid ${D.border}`, background: D.card, borderRadius: '16px 16px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{
                  background: detail.product?.type === 'health' ? 'rgba(34,197,94,0.15)' : 'rgba(59,130,246,0.15)',
                  color: detail.product?.type === 'health' ? D.green : '#58a6ff',
                  borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
                }}>{detail.product?.type || 'CORPORATE'}</span>
                <span style={{ color: D.sec, fontSize: 13 }}>{detail.quoteNumber}</span>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {detail.validUntil && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: D.sec, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Decision Deadline</div>
                    <div style={{ color: D.red, fontWeight: 700 }}>{new Date(detail.validUntil).toLocaleDateString()}</div>
                  </div>
                )}
                <button onClick={() => setDetail(null)} style={{ background: 'rgba(255,255,255,0.07)', border: `1px solid ${D.border}`, borderRadius: 8, color: D.sec, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}>✕ Close</button>
              </div>
            </div>

            <div style={{ padding: '20px 28px 0' }}>
              <h2 style={{ color: D.text, fontWeight: 800, fontSize: 28, margin: 0 }}>
                {clientName(detail)}
              </h2>
            </div>

            {/* Two-column body */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, padding: 28 }}>

              {/* Left */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Institutional profile */}
                <Section title="Institutional Profile" icon={<BankOutlined style={{ color: D.green }} />}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 10 }}>
                    {[
                      { label: 'PRODUCT',          value: detail.product?.name || '—' },
                      { label: 'MEMBERS COVERED',  value: (detail.memberCount || 0).toLocaleString() },
                      { label: 'RISK SCORE',        value: `${detail.riskFactors?.riskScore || '—'} / 10` },
                    ].map(f => (
                      <div key={f.label} style={{ background: D.card2, borderRadius: 8, padding: 14 }}>
                        <div style={{ color: D.sec, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 6 }}>{f.label}</div>
                        <div style={{ color: D.text, fontWeight: 600, fontSize: 15 }}>{f.value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: D.card2, borderRadius: 8, padding: 14 }}>
                    <div style={{ color: D.sec, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 6 }}>ASSIGNED UNDERWRITER</div>
                    <div style={{ color: D.text, fontWeight: 600 }}>
                      {detail.assignedUnderwriter
                        ? `${detail.assignedUnderwriter.firstName} ${detail.assignedUnderwriter.lastName}`
                        : <span style={{ color: D.amber }}>Unassigned</span>}
                    </div>
                  </div>
                </Section>

                {/* Risk factors */}
                <Section title="Risk Factors" icon={<span style={{ fontSize: 15 }}>🛡</span>}>
                  {(detail.riskFactors?.riskScore || 0) >= 7 && (
                    <RiskItem icon={<WarningOutlined />} color={D.red} bg="rgba(239,68,68,0.08)" border="rgba(239,68,68,0.2)"
                      title="High Risk Score" desc={`Score ${detail.riskFactors.riskScore}/10 — requires senior review`} />
                  )}
                  <RiskItem icon={<CheckCircleOutlined />} color={D.green} bg="rgba(34,197,94,0.08)" border="rgba(34,197,94,0.2)"
                    title="Application Complete" desc="All required documentation submitted" />
                  {detail.notes?.map((n, i) => (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '10px 14px', marginTop: 8 }}>
                      <div style={{ color: D.text, fontSize: 13 }}>{n.content}</div>
                      <div style={{ color: D.sec, fontSize: 11, marginTop: 4 }}>{n.author?.firstName} {n.author?.lastName} · {new Date(n.timestamp).toLocaleString()}</div>
                    </div>
                  ))}
                </Section>

                {/* Underwriter rationale */}
                <Section title="Underwriter Rationale" icon={<span style={{ fontSize: 15 }}>📝</span>}>
                  <textarea value={rationale} onChange={e => setRationale(e.target.value)}
                    placeholder="Enter justification for final decision..."
                    rows={5}
                    style={{ width: '100%', background: D.card2, border: `1px solid ${D.border}`, borderRadius: 8, color: D.text, padding: '12px 14px', fontSize: 14, resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </Section>
              </div>

              {/* Right */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Premium breakdown */}
                <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: 20 }}>
                  <div style={{ color: D.sec, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 10 }}>PROPOSED ANNUAL PREMIUM</div>
                  <div style={{ fontSize: 30, fontWeight: 900, color: D.text, lineHeight: 1, marginBottom: 16 }}>
                    ETB {quoteAmount(detail).toLocaleString()}
                  </div>
                  {detail.scenarios?.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                      {detail.scenarios.map((s, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderTop: `1px solid ${D.border}` }}>
                          <span style={{ color: D.sec, fontSize: 13 }}>{s.name}</span>
                          <span style={{ color: D.text, fontWeight: 600, fontSize: 13 }}>{s.annualPremium?.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Coverage summary */}
                <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <span style={{ fontSize: 15 }}>🛡</span>
                    <span style={{ color: D.text, fontWeight: 700 }}>Coverage Summary</span>
                  </div>
                  {[
                    { label: 'Valid Until',   value: detail.validUntil ? new Date(detail.validUntil).toLocaleDateString() : '—' },
                    { label: 'Member Count',  value: detail.memberCount?.toLocaleString() || '—' },
                    { label: 'Risk Score',    value: `${detail.riskFactors?.riskScore ?? '—'} / 10` },
                    { label: 'Status',        value: detail.status?.replace(/_/g, ' ') },
                  ].map(f => (
                    <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${D.border}` }}>
                      <span style={{ color: D.sec, fontSize: 13 }}>{f.label}</span>
                      <span style={{ color: D.text, fontWeight: 600, fontSize: 13, textTransform: 'capitalize' }}>{f.value}</span>
                    </div>
                  ))}
                </div>

                {/* Action buttons */}
                {['underwriter', 'payer_admin', 'superadmin'].includes(user?.role) && detail.status === 'under_review' && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={() => { uwForm.resetFields(); uwForm.setFieldValue('note', rationale); setUwModal({ open: true, quote: detail }); }}
                      style={{ flex: 1, padding: 14, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, color: D.red, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                      ✕ Reject
                    </button>
                    <button
                      onClick={() => { uwForm.resetFields(); uwForm.setFieldValue('note', rationale); setUwModal({ open: true, quote: detail }); }}
                      style={{ flex: 1, padding: 14, background: D.green, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                      ✓ Approve Quote
                    </button>
                  </div>
                )}
                {['underwriter', 'payer_admin', 'superadmin'].includes(user?.role) && detail.status === 'submitted' && (
                  <button onClick={() => takeOwnership(detail)}
                    style={{ width: '100%', padding: 14, background: D.blue, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                    Take Ownership
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Decision confirm modal ── */}
      <Modal
        title={`Underwriting Decision — ${uwModal.quote?.quoteNumber}`}
        open={uwModal.open}
        onCancel={() => setUwModal({ open: false, quote: null })}
        footer={[
          <Button key="r" danger onClick={() => handleDecide(false)} icon={<CloseOutlined />}>Reject</Button>,
          <Button key="a" style={{ background: D.green, borderColor: D.green, color: '#fff' }} onClick={() => handleDecide(true)} icon={<CheckOutlined />}>Approve</Button>,
        ]}
      >
        <Form form={uwForm} layout="vertical">
          <Form.Item name="finalPremium" label="Final Annual Premium (ETB)" rules={[{ required: true, message: 'Enter final premium' }]}>
            <InputNumber style={{ width: '100%' }} min={0} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
          </Form.Item>
          <Form.Item name="note" label="Underwriting Note">
            <Input.TextArea rows={3} placeholder="Reasoning, conditions, or notes..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ── Helper components ─────────────────────────────────────────────────────────

function Section({ title, icon, children }) {
  return (
    <div style={{ background: '#161b22', border: 'rgba(255,255,255,0.08) 1px solid', borderRadius: 12, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        {icon}
        <span style={{ color: '#f0f6fc', fontWeight: 700, fontSize: 15 }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function RiskItem({ icon, color, bg, border, title, desc }) {
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: '12px 16px', marginBottom: 8, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <span style={{ color, marginTop: 1 }}>{icon}</span>
      <div>
        <div style={{ color: '#f0f6fc', fontWeight: 600, fontSize: 14 }}>{title}</div>
        <div style={{ color: '#8b949e', fontSize: 13, marginTop: 2 }}>{desc}</div>
      </div>
    </div>
  );
}
