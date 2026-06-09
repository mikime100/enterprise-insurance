import { useEffect, useState, useCallback } from 'react';
import { Spin, message, Input } from 'antd';
import {
  CheckOutlined, CloseOutlined, SearchOutlined, SyncOutlined,
  UserAddOutlined, UserDeleteOutlined, SwapOutlined, InfoCircleOutlined,
  StopOutlined, CloseCircleOutlined, EyeOutlined,
} from '@ant-design/icons';
import api from '../../api';

const NAVY  = '#1e3a5f';
const GREEN = '#22c55e';

const TYPE_META = {
  tier_change:      { label: 'Tier Change',         icon: <SwapOutlined />,        color: '#2563eb', bg: '#dbeafe' },
  add_dependent:    { label: 'Add Dependent',        icon: <UserAddOutlined />,     color: '#16a34a', bg: '#dcfce7' },
  remove_dependent: { label: 'Remove Dependent',     icon: <UserDeleteOutlined />,  color: '#dc2626', bg: '#fee2e2' },
  contact_update:   { label: 'Contact Update',       icon: <InfoCircleOutlined />,  color: '#d97706', bg: '#fef3c7' },
  suspension:       { label: 'Suspension Request',   icon: <StopOutlined />,        color: '#9333ea', bg: '#f3e8ff' },
  cancellation:     { label: 'Cancellation Request', icon: <CloseCircleOutlined />, color: '#ef4444', bg: '#fee2e2' },
};

const STATUS_CFG = {
  pending:      { label: 'Pending',      color: '#d97706', bg: '#fef9c3' },
  under_review: { label: 'Under Review', color: '#2563eb', bg: '#dbeafe' },
  approved:     { label: 'Approved',     color: '#16a34a', bg: '#dcfce7' },
  rejected:     { label: 'Rejected',     color: '#dc2626', bg: '#fee2e2' },
};

function Badge({ status }) {
  const cfg = STATUS_CFG[status] || { label: status, color: '#6b7280', bg: '#f3f4f6' };
  return (
    <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 20, padding: '3px 11px', fontSize: 11, fontWeight: 700 }}>
      {cfg.label}
    </span>
  );
}

function TypeBadge({ type }) {
  const m = TYPE_META[type] || { label: type, color: '#6b7280', bg: '#f3f4f6', icon: null };
  return (
    <span style={{ background: m.bg, color: m.color, borderRadius: 20, padding: '3px 11px', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      {m.icon} {m.label}
    </span>
  );
}

function DetailView({ endorsement }) {
  const { type, details } = endorsement;
  if (!details) return <span style={{ color: '#9ca3af' }}>—</span>;

  if (type === 'tier_change') return (
    <div style={{ fontSize: 13, color: '#374151' }}>
      <div><span style={{ color: '#9ca3af' }}>Requested tier ID:</span> {details.requestedTierId}</div>
      {details.reason && <div style={{ marginTop: 4 }}><span style={{ color: '#9ca3af' }}>Reason:</span> {details.reason}</div>}
    </div>
  );

  if (type === 'add_dependent') {
    const d   = details.dependent || {};
    const ev  = details.qualifyingEvent;
    const hd  = details.healthDeclaration;
    const age = d.dateOfBirth ? Math.floor((Date.now() - new Date(d.dateOfBirth)) / 31557600000) : null;
    const docs = details.documents || [];
    return (
      <div style={{ fontSize: 13, color: '#374151', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
          {[
            ['Full Name',     `${d.firstName || ''} ${d.lastName || ''}`],
            ['Relationship',  d.relationship],
            ['Date of Birth', d.dateOfBirth ? new Date(d.dateOfBirth).toLocaleDateString() : '—'],
            ['Age',           age !== null ? `${age} yrs` : '—'],
            ['Gender',        d.gender || '—'],
            ['National ID',   d.nationalId || '—'],
          ].map(([k, v]) => (
            <div key={k}>
              <div style={{ color: '#9ca3af', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{k}</div>
              <div style={{ fontWeight: 600, color: '#111827', marginTop: 1, textTransform: k === 'Relationship' || k === 'Gender' ? 'capitalize' : 'none' }}>{v}</div>
            </div>
          ))}
        </div>
        {ev && (
          <div style={{ background: '#eff6ff', borderRadius: 8, padding: '7px 10px' }}>
            <span style={{ color: '#9ca3af', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Qualifying Event </span>
            <span style={{ fontWeight: 600, color: '#1e40af' }}>{ev.replace(/_/g, ' ')}</span>
            {details.qualifyingEventDate && <span style={{ color: '#6b7280', marginLeft: 8 }}>· {new Date(details.qualifyingEventDate).toLocaleDateString()}</span>}
          </div>
        )}
        {hd && (hd.chronicConditions?.length > 0 || hd.currentMedications) && (
          <div style={{ background: '#fef9c3', borderRadius: 8, padding: '7px 10px' }}>
            <div style={{ color: '#92400e', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Health Declaration</div>
            {hd.chronicConditions?.length > 0 && <div>Conditions: {hd.chronicConditions.join(', ')}</div>}
            {hd.currentMedications && <div>Medications: {hd.currentMedications}</div>}
            {hd.smoker && <div>Smoking: {hd.smoker}</div>}
          </div>
        )}
        {docs.length > 0 && (
          <div>
            <div style={{ color: '#9ca3af', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', marginBottom: 5 }}>Uploaded Documents ({docs.length})</div>
            {docs.map((doc, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 0', borderBottom: i < docs.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                <span style={{ fontSize: 14 }}>📄</span>
                <span style={{ fontSize: 12, color: '#374151', flex: 1 }}>{doc.originalName || doc.path?.split('/').pop()}</span>
                {doc.path && (
                  <a href={`${import.meta.env.VITE_API_URL || '/api'}/uploads/${doc.path?.split('/').pop()}`} target="_blank" rel="noreferrer"
                    style={{ color: NAVY, fontSize: 11, fontWeight: 700 }}>View</a>
                )}
              </div>
            ))}
          </div>
        )}
        {docs.length === 0 && <div style={{ color: '#ef4444', fontSize: 12, fontWeight: 600 }}>⚠ No documents uploaded by applicant</div>}
      </div>
    );
  }

  if (type === 'remove_dependent') return (
    <div style={{ fontSize: 13, color: '#374151' }}>Dependent ID: {details.dependentId}</div>
  );

  if (type === 'contact_update') return (
    <div style={{ fontSize: 13, color: '#374151' }}>
      <div>Field: <strong>{details.field}</strong></div>
      <div>New value: <strong>{details.newValue}</strong></div>
    </div>
  );

  if (type === 'suspension' || type === 'cancellation') return (
    <div style={{ fontSize: 13, color: '#374151' }}>
      <div>Reason: {details.reason}</div>
      {details.requestedDate && <div style={{ color: '#9ca3af' }}>Effective: {new Date(details.requestedDate).toLocaleDateString()}</div>}
    </div>
  );

  return <pre style={{ fontSize: 12, margin: 0 }}>{JSON.stringify(details, null, 2)}</pre>;
}

export default function PayerEndorsements() {
  const [endorsements, setEndorsements] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [detail, setDetail]             = useState(null);
  const [filter, setFilter]             = useState('pending');
  const [search, setSearch]             = useState('');
  const [reviewing, setReviewing]       = useState(null);
  const [reviewNote, setReviewNote]     = useState('');
  const [newPremium, setNewPremium]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/endorsements', { params: filter !== 'all' ? { status: filter } : {} });
      setEndorsements(res.data.endorsements || []);
    } catch { message.error('Failed to load endorsement requests'); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleReview = async (id, status) => {
    setReviewing(id + status);
    try {
      await api.patch(`/endorsements/${id}/review`, {
        status,
        reviewNote,
        ...(newPremium ? { newPremiumAmount: parseFloat(newPremium) } : {}),
      });
      message.success(status === 'approved' ? 'Endorsement approved and applied.' : status === 'rejected' ? 'Endorsement rejected.' : 'Marked as under review.');
      setDetail(null);
      setReviewNote('');
      setNewPremium('');
      load();
    } catch (err) {
      message.error(err.response?.data?.message || 'Review failed');
    } finally { setReviewing(null); }
  };

  const filtered = endorsements.filter(e => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      e.enrollment?.enrollmentNumber?.toLowerCase().includes(s) ||
      e.requestedBy?.firstName?.toLowerCase().includes(s) ||
      e.requestedBy?.lastName?.toLowerCase().includes(s) ||
      e.type?.includes(s)
    );
  });

  const pending = endorsements.filter(e => e.status === 'pending').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, color: '#111827', fontWeight: 800, fontSize: 22 }}>Policy Endorsements</h2>
          <div style={{ color: '#6b7280', fontSize: 14, marginTop: 3 }}>Mid-term change requests from policyholders</div>
        </div>
        {pending > 0 && (
          <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 10, padding: '8px 16px', color: '#92400e', fontWeight: 700, fontSize: 13 }}>
            {pending} pending review{pending > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {['pending', 'under_review', 'approved', 'rejected', 'all'].map(s => {
          const cfg = STATUS_CFG[s] || { label: 'All', color: NAVY, bg: '#f1f5f9' };
          const active = filter === s;
          return (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding: '7px 16px', borderRadius: 20, border: `1.5px solid ${active ? cfg.color : '#e5e7eb'}`,
              background: active ? cfg.bg : '#fff', color: active ? cfg.color : '#6b7280',
              fontWeight: active ? 700 : 500, fontSize: 13, cursor: 'pointer',
            }}>
              {s === 'all' ? 'All' : cfg.label}
            </button>
          );
        })}
        <Input
          prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
          placeholder="Search by name or policy number"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 260, borderRadius: 20 }}
          allowClear
        />
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : filtered.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '48px 24px', textAlign: 'center' }}>
          <SyncOutlined style={{ fontSize: 40, color: '#d1d5db', marginBottom: 12 }} />
          <div style={{ color: '#6b7280', fontSize: 15 }}>No endorsement requests{filter !== 'all' ? ` with status "${filter}"` : ''}.</div>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden' }}>
          {/* Table head */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.4fr 1fr 80px 100px', gap: 0, background: '#f8fafc', borderBottom: '1px solid #e5e7eb', padding: '10px 20px' }}>
            {['Policy', 'Requested By', 'Change Type', 'Date', 'Status', ''].map((h, i) => (
              <div key={i} style={{ color: '#6b7280', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</div>
            ))}
          </div>

          {filtered.map((e, idx) => (
            <div key={e._id} style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1.4fr 1fr 80px 100px',
              gap: 0, padding: '14px 20px', borderBottom: idx < filtered.length - 1 ? '1px solid #f3f4f6' : 'none',
              background: detail?._id === e._id ? '#f8fafc' : '#fff', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontWeight: 700, color: '#111827', fontSize: 13 }}>{e.enrollment?.enrollmentNumber || '—'}</div>
                <div style={{ color: '#9ca3af', fontSize: 11 }}>{e.enrollment?.product?.name}</div>
              </div>
              <div>
                <div style={{ color: '#374151', fontSize: 13 }}>{e.requestedBy?.firstName} {e.requestedBy?.lastName}</div>
                <div style={{ color: '#9ca3af', fontSize: 11 }}>{e.requestedBy?.email}</div>
              </div>
              <TypeBadge type={e.type} />
              <div style={{ color: '#6b7280', fontSize: 12 }}>{new Date(e.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
              <Badge status={e.status} />
              <button onClick={() => { setDetail(e === detail ? null : e); setReviewNote(''); }}
                style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', color: NAVY, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                <EyeOutlined /> Review
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Detail / review panel */}
      {detail && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '24px 28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 800, color: '#111827', fontSize: 16, marginBottom: 4 }}>
                Endorsement Request — {detail.enrollment?.enrollmentNumber}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <TypeBadge type={detail.type} />
                <Badge status={detail.status} />
              </div>
            </div>
            <button onClick={() => setDetail(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 18 }}>
              <CloseOutlined />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ color: '#9ca3af', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Request Details</div>
              <DetailView endorsement={detail} />
            </div>
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ color: '#9ca3af', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Policyholder</div>
              <div style={{ fontSize: 13, color: '#374151' }}>
                <div style={{ fontWeight: 700 }}>{detail.requestedBy?.firstName} {detail.requestedBy?.lastName}</div>
                <div>{detail.requestedBy?.email}</div>
                <div style={{ marginTop: 6, color: '#9ca3af' }}>Policy: {detail.enrollment?.product?.name} · {detail.enrollment?.tier?.name}</div>
                <div style={{ color: '#9ca3af' }}>Submitted: {new Date(detail.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
              </div>
            </div>
          </div>

          {!['approved','rejected'].includes(detail.status) && (
            <div>
              <div style={{ fontWeight: 600, color: '#374151', fontSize: 13, marginBottom: 8 }}>Review Note (optional)</div>
              <Input.TextArea
                rows={2}
                placeholder="Add a note for the policyholder…"
                value={reviewNote}
                onChange={e => setReviewNote(e.target.value)}
                style={{ marginBottom: 14, borderRadius: 10 }}
              />
              {['add_dependent','remove_dependent'].includes(detail.type) && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontWeight: 600, color: '#374151', fontSize: 13, marginBottom: 6 }}>
                    Revised Annual Premium (ETB) <span style={{ color: '#9ca3af', fontWeight: 400 }}>— leave blank to keep current premium</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    placeholder={`Current: ETB ${detail.enrollment?.tier?.annualPremium?.toLocaleString() ?? '—'}`}
                    value={newPremium}
                    onChange={e => setNewPremium(e.target.value)}
                    style={{ width: '100%', padding: '10px 13px', border: '1.5px solid #e5e7eb', borderRadius: 9, fontSize: 13, boxSizing: 'border-box' }}
                  />
                  {newPremium && (
                    <div style={{ marginTop: 5, fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
                      New premium ETB {parseFloat(newPremium).toLocaleString()} / yr (≈ ETB {Math.round(parseFloat(newPremium)/12).toLocaleString()} / mo) will be applied on approval.
                    </div>
                  )}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => handleReview(detail._id, 'under_review')}
                  disabled={!!reviewing}
                  style={{ padding: '9px 20px', borderRadius: 9, border: '1px solid #e5e7eb', background: '#f8fafc', color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                  Mark Under Review
                </button>
                <button
                  onClick={() => handleReview(detail._id, 'rejected')}
                  disabled={!!reviewing}
                  style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: '#fee2e2', color: '#dc2626', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CloseOutlined /> Reject
                </button>
                <button
                  onClick={() => handleReview(detail._id, 'approved')}
                  disabled={!!reviewing}
                  style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: NAVY, color: '#fff', fontWeight: 700, fontSize: 13, cursor: reviewing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: reviewing ? 0.7 : 1 }}>
                  <CheckOutlined /> Approve &amp; Apply
                </button>
              </div>
            </div>
          )}

          {detail.reviewNote && (
            <div style={{ marginTop: 16, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ color: '#0369a1', fontSize: 12, fontWeight: 700, marginBottom: 3 }}>Review Note</div>
              <div style={{ color: '#0c4a6e', fontSize: 13 }}>{detail.reviewNote}</div>
              {detail.reviewedBy && (
                <div style={{ color: '#7dd3fc', fontSize: 11, marginTop: 4 }}>
                  — {detail.reviewedBy.firstName} {detail.reviewedBy.lastName} · {detail.reviewedAt ? new Date(detail.reviewedAt).toLocaleDateString() : ''}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
