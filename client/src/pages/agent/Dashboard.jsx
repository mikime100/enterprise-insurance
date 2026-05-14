import { useEffect, useState } from 'react';
import { Row, Col, Card, Typography, Tag, Space, Spin, Button, Badge, Avatar } from 'antd';
import { TeamOutlined, SafetyOutlined, AlertOutlined, ArrowRightOutlined, DollarOutlined, FireOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const S = { card: { background:'#ffffff', border:'1px solid #e8edf3', borderRadius:12 } };

const PRIORITY_CONFIG = { urgent:{color:'#ef4444',bg:'#ef444418'}, high:{color:'#f97316',bg:'#f9731618'}, medium:{color:'#22c55e',bg:'#22c55e18'}, low:{color:'#9ca3af',bg:'#4f627218'} };
const STATUS_COLORS = { submitted:'#22c55e', acknowledged:'#06b6d4', under_review:'#f59e0b', documentation_requested:'#8b5cf6', investigation:'#6366f1', assessment:'#eab308', approved:'#10b981', partially_approved:'#84cc16', denied:'#ef4444', settled:'#10b981', closed:'#9ca3af' };

function StatCard({ label, value, sub, icon, color, borderClass }) {
  return (
    <Card className={`ei-card-hover ${borderClass}`} style={S.card} styles={{ body: { padding: '20px 22px' } }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <Text style={{ color:'#9ca3af', fontSize:12, fontWeight:500, textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:10 }}>{label}</Text>
          <div style={{ color:'#111827', fontSize:28, fontWeight:800, lineHeight:1 }}>{value}</div>
          {sub && <div style={{ color:'#9ca3af', fontSize:12, marginTop:6 }}>{sub}</div>}
        </div>
        <div style={{ width:44, height:44, borderRadius:12, background:`${color}18`, border:`1px solid ${color}33`, display:'flex', alignItems:'center', justifyContent:'center', color, fontSize:20 }}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

export default function AgentDashboard() {
  const [summary, setSummary]           = useState(null);
  const [recentClaims, setRecentClaims] = useState([]);
  const [loading, setLoading]           = useState(true);
  const { user } = useAuth();
  const navigate  = useNavigate();

  useEffect(() => {
    Promise.all([api.get('/reports/summary'), api.get('/reports/recent-claims')])
      .then(([s, r]) => { setSummary(s.data); setRecentClaims(r.data.claims); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display:'flex', justifyContent:'center', paddingTop:80 }}><Spin size="large" /></div>;

  const actionNeeded = recentClaims.filter(c => ['submitted','documentation_requested'].includes(c.status));

  return (
    <div>
      {/* Banner */}
      <div style={{ background:'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', border:'1px solid #bfdbfe', borderRadius:16, padding:'24px 28px', marginBottom:24, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', right:-30, top:-30, width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle, rgba(29,78,216,0.12) 0%, transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'relative' }}>
          <Title level={4} style={{ color:'#111827', margin:0, fontWeight:800 }}>Agent Dashboard</Title>
          <Text style={{ color:'#9ca3af' }}>Welcome back, {user?.firstName}. You have {actionNeeded.length} items needing attention.</Text>
        </div>
      </div>

      {/* KPI */}
      <Row gutter={[16, 16]} style={{ marginBottom:24 }}>
        <Col xs={24} sm={12} lg={6}><StatCard label="My Customers" value={summary?.totalCustomers||0} sub="Assigned accounts" icon={<TeamOutlined />} color="#22c55e" borderClass="stat-card-blue" /></Col>
        <Col xs={24} sm={12} lg={6}><StatCard label="Active Policies" value={summary?.activePolicies||0} sub="Live coverage" icon={<SafetyOutlined />} color="#10b981" borderClass="stat-card-green" /></Col>
        <Col xs={24} sm={12} lg={6}><StatCard label="Open Claims" value={summary?.openClaims||0} sub={actionNeeded.length > 0 ? `${actionNeeded.length} need action` : 'All reviewed'} icon={<AlertOutlined />} color={summary?.openClaims > 0 ? '#f59e0b' : '#10b981'} borderClass={summary?.openClaims > 0 ? 'stat-card-amber' : 'stat-card-green'} /></Col>
        <Col xs={24} sm={12} lg={6}><StatCard label="Monthly Revenue" value={`$${(summary?.monthlyRevenue||0).toFixed(0)}`} sub="Active premiums" icon={<DollarOutlined />} color="#8b5cf6" borderClass="stat-card-purple" /></Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* Action needed */}
        <Col xs={24} lg={9}>
          <Card style={S.card} styles={{ header:{ borderBottom:'1px solid #e8edf3' } }}
            title={
              <Space>
                <Text style={{ color:'#111827', fontWeight:700 }}>Action Required</Text>
                {actionNeeded.length > 0 && (
                  <div style={{ background:'#ef444418', border:'1px solid #ef444433', borderRadius:20, padding:'1px 9px', color:'#ef4444', fontSize:12, fontWeight:700 }}>
                    {actionNeeded.length}
                  </div>
                )}
              </Space>
            }
            extra={<Button type="link" size="small" style={{ color:'#1d4ed8', padding:0 }} onClick={() => navigate('/agent/claims')}>Manage <ArrowRightOutlined /></Button>}
          >
            {actionNeeded.length === 0 ? (
              <div style={{ textAlign:'center', padding:'32px 0' }}>
                <CheckCircleOutlined style={{ fontSize:40, color:'#10b981', display:'block', marginBottom:12 }} />
                <Text style={{ color:'#9ca3af' }}>You're all caught up!</Text>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {actionNeeded.map(c => {
                  const pc = PRIORITY_CONFIG[c.priority] || PRIORITY_CONFIG.medium;
                  return (
                    <div key={c._id} style={{ background:'#f8f9fc', borderRadius:10, padding:'12px 14px', border:'1px solid #e8edf3', cursor:'pointer' }}
                      onClick={() => navigate('/agent/claims')}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                        <div>
                          <Text style={{ color:'#111827', fontSize:13, fontWeight:600 }}>
                            {c.type?.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}
                          </Text>
                          <div style={{ color:'#9ca3af', fontSize:11, marginTop:2 }}>
                            {c.customer?.firstName} {c.customer?.lastName} · {c.claimNumber}
                          </div>
                        </div>
                        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                          <Tag style={{ fontSize:10, background:pc.bg, color:pc.color, border:`1px solid ${pc.color}33` }}>{c.priority}</Tag>
                          <div style={{ color:'#f59e0b', fontSize:12, fontWeight:600 }}>${c.claimedAmount?.toLocaleString()}</div>
                        </div>
                      </div>
                      <div style={{ marginTop:8 }}>
                        <Tag style={{ fontSize:10, background:`${STATUS_COLORS[c.status]}18`, color:STATUS_COLORS[c.status], border:`1px solid ${STATUS_COLORS[c.status]}33` }}>
                          {c.status?.replace(/_/g,' ')}
                        </Tag>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </Col>

        {/* Recent claims */}
        <Col xs={24} lg={15}>
          <Card style={S.card} styles={{ header:{ borderBottom:'1px solid #e8edf3' } }}
            title={<Text style={{ color:'#111827', fontWeight:700 }}>Recent Claims</Text>}
            extra={<Button type="link" size="small" style={{ color:'#1d4ed8', padding:0 }} onClick={() => navigate('/agent/claims')}>View all <ArrowRightOutlined /></Button>}
          >
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {recentClaims.slice(0,8).map(c => {
                const pc = PRIORITY_CONFIG[c.priority] || PRIORITY_CONFIG.medium;
                return (
                  <div key={c._id} style={{
                    background:'#f8f9fc', borderRadius:10, padding:'12px 16px', border:'1px solid #e8edf3',
                    display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10,
                  }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <Avatar size={34} style={{ background:STATUS_COLORS[c.status]+'33', color:STATUS_COLORS[c.status], fontSize:12, fontWeight:700 }}>
                        {c.customer?.firstName?.[0]}{c.customer?.lastName?.[0]}
                      </Avatar>
                      <div>
                        <Text style={{ color:'#111827', fontWeight:600, fontSize:13 }}>{c.customer?.firstName} {c.customer?.lastName}</Text>
                        <div style={{ color:'#9ca3af', fontSize:11 }}>{c.claimNumber} · {c.type?.replace(/_/g,' ')}</div>
                      </div>
                    </div>
                    <Space>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ color:'#f59e0b', fontWeight:700 }}>${c.claimedAmount?.toLocaleString()}</div>
                        <div style={{ color:'#9ca3af', fontSize:11 }}>{dayjs(c.createdAt).format('MMM D')}</div>
                      </div>
                      <Tag style={{ fontSize:10, background:pc.bg, color:pc.color, border:`1px solid ${pc.color}33` }}>{c.priority}</Tag>
                      <Tag style={{ fontSize:10, background:`${STATUS_COLORS[c.status]}18`, color:STATUS_COLORS[c.status], border:`1px solid ${STATUS_COLORS[c.status]}33` }}>
                        {c.status?.replace(/_/g,' ')}
                      </Tag>
                    </Space>
                  </div>
                );
              })}
              {recentClaims.length === 0 && <div style={{ textAlign:'center', color:'#9ca3af', padding:24 }}>No claims yet</div>}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
