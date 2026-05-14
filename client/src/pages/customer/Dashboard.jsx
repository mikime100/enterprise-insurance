import { useEffect, useState } from 'react';
import { Row, Col, Card, Typography, Tag, Space, Spin, Empty, Button, Progress, Divider } from 'antd';
import {
  SafetyOutlined, AlertOutlined, FileTextOutlined, ArrowRightOutlined,
  RiseOutlined, ClockCircleOutlined, CheckCircleOutlined, DollarOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const S = {
  card: { background:'#ffffff', border:'1px solid #e8edf3', borderRadius:12 },
  label: { color:'#9ca3af', fontSize:12, display:'block', marginBottom:2 },
};

const STATUS_COLORS = {
  active:'#10b981', pending:'#f59e0b', suspended:'#f97316', cancelled:'#ef4444', expired:'#9ca3af', pending_renewal:'#22c55e',
  submitted:'#22c55e', acknowledged:'#06b6d4', under_review:'#f59e0b', documentation_requested:'#8b5cf6',
  investigation:'#6366f1', assessment:'#eab308', approved:'#10b981', partially_approved:'#84cc16',
  denied:'#ef4444', settled:'#10b981', closed:'#9ca3af',
};

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

export default function CustomerDashboard() {
  const [policies, setPolicies] = useState([]);
  const [claims, setClaims]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([api.get('/policies'), api.get('/claims')])
      .then(([p, c]) => { setPolicies(p.data.policies || []); setClaims(c.data.claims || []); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display:'flex', justifyContent:'center', paddingTop:80 }}><Spin size="large" /></div>;

  const activePolicies = policies.filter(p => p.status === 'active');
  const openClaims     = claims.filter(c => !['settled','closed','denied'].includes(c.status));
  const totalCoverage  = activePolicies.reduce((s, p) => s + (p.coverageDetails?.coverageAmount || 0), 0);
  const monthlyPremium = activePolicies.reduce((s, p) => s + (p.premium?.amount || 0), 0);

  return (
    <div>
      {/* Welcome banner */}
      <div style={{
        background:'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
        border:'1px solid #bbf7d0', borderRadius:16, padding:'28px 32px', marginBottom:24,
        display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:16,
        position:'relative', overflow:'hidden',
      }}>
        <div style={{ position:'absolute', right:-40, top:-40, width:240, height:240, borderRadius:'50%', background:'radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'relative' }}>
          <Title level={4} style={{ color:'#111827', margin:0, fontWeight:800 }}>
            Good {dayjs().hour() < 12 ? 'Morning' : dayjs().hour() < 17 ? 'Afternoon' : 'Evening'}, {user?.firstName} 👋
          </Title>
          <Text style={{ color:'#9ca3af' }}>{dayjs().format('dddd, MMMM D, YYYY')} · Your insurance is active</Text>
        </div>
        <Space>
          <Button type="primary" onClick={() => navigate('/customer/quotes')} icon={<FileTextOutlined />}
            style={{ background:'#22c55e', border:'none', fontWeight:600, height:40 }}>
            Get a Quote
          </Button>
          <Button onClick={() => navigate('/customer/claims')} icon={<AlertOutlined />}
            style={{ background:'#f0f4f8', border:'1px solid #e8edf3', color:'#111827', height:40 }}>
            File a Claim
          </Button>
        </Space>
      </div>

      {/* KPI cards */}
      <Row gutter={[16, 16]} style={{ marginBottom:24 }}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard label="Active Policies" value={activePolicies.length} sub="Fully covered" icon={<SafetyOutlined />} color="#10b981" borderClass="stat-card-green" />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard label="Open Claims" value={openClaims.length} sub={openClaims.length > 0 ? 'Pending review' : 'All resolved'} icon={<AlertOutlined />} color={openClaims.length > 0 ? '#f59e0b' : '#10b981'} borderClass={openClaims.length > 0 ? 'stat-card-amber' : 'stat-card-green'} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard label="Total Coverage" value={`$${(totalCoverage/1000).toFixed(0)}K`} sub="Across all policies" icon={<CheckCircleOutlined />} color="#22c55e" borderClass="stat-card-blue" />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard label="Monthly Premium" value={`$${monthlyPremium}`} sub="Total payments" icon={<DollarOutlined />} color="#8b5cf6" borderClass="stat-card-purple" />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* Active policies */}
        <Col xs={24} lg={14}>
          <Card style={S.card} styles={{ header:{ borderBottom:'1px solid #e8edf3' } }}
            title={<Text style={{ color:'#111827', fontWeight:700 }}>Active Policies</Text>}
            extra={<Button type="link" size="small" style={{ color:'#22c55e', padding:0 }} onClick={() => navigate('/customer/policies')}>
              View all <ArrowRightOutlined />
            </Button>}>
            {activePolicies.length === 0 ? (
              <Empty description={<span style={{ color:'#9ca3af' }}>No active policies</span>} image={Empty.PRESENTED_IMAGE_SIMPLE}>
                <Button type="primary" onClick={() => navigate('/customer/quotes')}>Get Your First Quote</Button>
              </Empty>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {activePolicies.slice(0,5).map(p => {
                  const daysLeft = dayjs(p.endDate).diff(dayjs(), 'day');
                  const totalDays = dayjs(p.endDate).diff(dayjs(p.startDate), 'day');
                  const pct = Math.max(0, Math.min(100, Math.round((daysLeft / totalDays) * 100)));
                  return (
                    <div key={p._id} style={{ background:'#f8f9fc', borderRadius:10, padding:'14px 16px', border:'1px solid #e8edf3' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                        <div>
                          <Text style={{ color:'#111827', fontWeight:600 }}>{p.product?.name}</Text>
                          <div style={{ color:'#9ca3af', fontSize:12, marginTop:2 }}>{p.policyNumber}</div>
                        </div>
                        <div style={{ textAlign:'right' }}>
                          <div style={{ color:'#22c55e', fontWeight:700, fontSize:15 }}>${p.premium?.amount}<span style={{ color:'#9ca3af', fontSize:11 }}>/mo</span></div>
                          <Tag style={{ marginTop:4, background:`${STATUS_COLORS[p.status]}18`, color:STATUS_COLORS[p.status], border:`1px solid ${STATUS_COLORS[p.status]}33`, fontSize:10 }}>
                            {p.status}
                          </Tag>
                        </div>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                        <Text style={{ color:'#9ca3af', fontSize:11 }}>Coverage: ${p.coverageDetails?.coverageAmount?.toLocaleString()}</Text>
                        <Text style={{ color: daysLeft < 30 ? '#f59e0b' : '#9ca3af', fontSize:11 }}>
                          <ClockCircleOutlined style={{ marginRight:4 }} />
                          {daysLeft > 0 ? `${daysLeft} days left` : 'Expired'}
                        </Text>
                      </div>
                      <Progress percent={pct} size={['100%', 4]} showInfo={false}
                        strokeColor={daysLeft < 30 ? '#f59e0b' : '#10b981'} trailColor="#e8edf3" />
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </Col>

        {/* Recent claims */}
        <Col xs={24} lg={10}>
          <Card style={S.card} styles={{ header:{ borderBottom:'1px solid #e8edf3' } }}
            title={<Text style={{ color:'#111827', fontWeight:700 }}>Recent Claims</Text>}
            extra={<Button type="link" size="small" style={{ color:'#22c55e', padding:0 }} onClick={() => navigate('/customer/claims')}>
              View all <ArrowRightOutlined />
            </Button>}>
            {claims.length === 0 ? (
              <Empty description={<span style={{ color:'#9ca3af' }}>No claims filed</span>} image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {claims.slice(0,6).map(c => (
                  <div key={c._id} style={{
                    background:'#f8f9fc', borderRadius:10, padding:'12px 14px',
                    border:`1px solid ${['submitted','under_review'].includes(c.status) ? '#f59e0b33' : '#e8edf3'}`,
                    display:'flex', justifyContent:'space-between', alignItems:'center',
                  }}>
                    <div>
                      <Text style={{ color:'#111827', fontSize:13, fontWeight:600 }}>
                        {c.type?.replace(/_/g,' ').replace(/\b\w/g, l=>l.toUpperCase())}
                      </Text>
                      <div style={{ color:'#9ca3af', fontSize:11, marginTop:2 }}>{c.claimNumber}</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ color:'#f59e0b', fontWeight:700, fontSize:13 }}>${c.claimedAmount?.toLocaleString()}</div>
                      <div style={{ marginTop:4 }}>
                        <Tag style={{ fontSize:10, background:`${STATUS_COLORS[c.status]}18`, color:STATUS_COLORS[c.status], border:`1px solid ${STATUS_COLORS[c.status]}33` }}>
                          {c.status?.replace(/_/g,' ')}
                        </Tag>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
