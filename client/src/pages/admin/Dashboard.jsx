import { useEffect, useState } from 'react';
import { Row, Col, Card, Typography, Spin, Table, Tag, Progress } from 'antd';
import { TeamOutlined, SafetyOutlined, AlertOutlined, UserOutlined, DollarOutlined, RiseOutlined } from '@ant-design/icons';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import api from '../../api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const S = { card: { background:'#ffffff', border:'1px solid #e8edf3', borderRadius:12 } };
const TYPE_COLORS  = ['#22c55e','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#ec4899','#84cc16'];
const STATUS_COLORS= { submitted:'#22c55e', acknowledged:'#06b6d4', under_review:'#f59e0b', documentation_requested:'#8b5cf6', investigation:'#6366f1', assessment:'#eab308', approved:'#10b981', partially_approved:'#84cc16', denied:'#ef4444', settled:'#10b981', closed:'#9ca3af' };
const TT_STYLE     = { contentStyle:{ background:'#f0f4f8', border:'1px solid #e8edf3', borderRadius:8 }, labelStyle:{ color:'#111827' }, itemStyle:{ color:'#6b7280' } };

function StatCard({ label, value, sub, icon, color, borderClass }) {
  return (
    <Card className={`ei-card-hover ${borderClass}`} style={S.card} styles={{ body:{ padding:'20px 22px' } }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <Text style={{ color:'#9ca3af', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.07em', display:'block', marginBottom:10 }}>{label}</Text>
          <div style={{ color:'#111827', fontSize:26, fontWeight:800, lineHeight:1 }}>{value}</div>
          {sub && <div style={{ color:'#9ca3af', fontSize:11, marginTop:6 }}>{sub}</div>}
        </div>
        <div style={{ width:42, height:42, borderRadius:12, background:`${color}18`, border:`1px solid ${color}33`, display:'flex', alignItems:'center', justifyContent:'center', color, fontSize:19 }}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

export default function AdminDashboard() {
  const [summary, setSummary]           = useState(null);
  const [claimsByStatus, setByStatus]   = useState([]);
  const [policiesByType, setByType]     = useState([]);
  const [claimsTrend, setTrend]         = useState([]);
  const [recentClaims, setRecent]       = useState([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/reports/summary'),
      api.get('/reports/claims-by-status'),
      api.get('/reports/policies-by-type'),
      api.get('/reports/claims-trend'),
      api.get('/reports/recent-claims'),
    ]).then(([s,cs,pt,tr,rc]) => {
      setSummary(s.data);
      setByStatus(cs.data.data);
      setByType(pt.data.data);
      setTrend(tr.data.data.map(d => ({ month: dayjs(`${d._id.year}-${d._id.month}-1`).format('MMM'), claims: d.count, amount: Math.round(d.totalClaimed/1000) })));
      setRecent(rc.data.claims);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display:'flex', justifyContent:'center', paddingTop:80 }}><Spin size="large" /></div>;

  const totalC = claimsByStatus.reduce((s,c) => s+c.count, 0);

  return (
    <div>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', border:'1px solid #bbf7d0', borderRadius:16, padding:'22px 28px', marginBottom:24 }}>
        <Title level={4} style={{ color:'#111827', margin:0, fontWeight:800 }}>System Dashboard</Title>
        <Text style={{ color:'#9ca3af' }}>Full platform overview · {dayjs().format('MMMM D, YYYY')}</Text>
      </div>

      {/* KPI row */}
      <Row gutter={[14, 14]} style={{ marginBottom:20 }}>
        <Col xs={24} sm={12} xl={4}><StatCard label="Customers" value={summary?.totalCustomers||0} sub="Registered" icon={<TeamOutlined />} color="#22c55e" borderClass="stat-card-blue" /></Col>
        <Col xs={24} sm={12} xl={4}><StatCard label="Agents" value={summary?.totalAgents||0} sub="Active" icon={<UserOutlined />} color="#8b5cf6" borderClass="stat-card-purple" /></Col>
        <Col xs={24} sm={12} xl={4}><StatCard label="Policies" value={summary?.activePolicies||0} sub={`of ${summary?.totalPolicies||0} total`} icon={<SafetyOutlined />} color="#10b981" borderClass="stat-card-green" /></Col>
        <Col xs={24} sm={12} xl={4}><StatCard label="Open Claims" value={summary?.openClaims||0} sub="Pending" icon={<AlertOutlined />} color="#f59e0b" borderClass="stat-card-amber" /></Col>
        <Col xs={24} sm={12} xl={4}><StatCard label="Total Claims" value={summary?.totalClaims||0} sub="All time" icon={<AlertOutlined />} color="#06b6d4" borderClass="stat-card-cyan" /></Col>
        <Col xs={24} sm={12} xl={4}><StatCard label="MRR" value={`$${(summary?.monthlyRevenue||0).toFixed(0)}`} sub="Monthly recurring" icon={<DollarOutlined />} color="#ec4899" borderClass="stat-card-pink" /></Col>
      </Row>

      {/* Charts row 1 */}
      <Row gutter={[16, 16]} style={{ marginBottom:16 }}>
        <Col xs={24} lg={16}>
          <Card style={S.card} title={<Text style={{ color:'#111827', fontWeight:700 }}>Claims Volume — 6 Months</Text>}>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={claimsTrend} margin={{ top:10, right:20, bottom:5, left:-10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8edf3" />
                <XAxis dataKey="month" tick={{ fill:'#9ca3af', fontSize:12 }} />
                <YAxis tick={{ fill:'#9ca3af', fontSize:11 }} />
                <Tooltip {...TT_STYLE} />
                <Legend wrapperStyle={{ color:'#9ca3af', fontSize:12 }} />
                <Line type="monotone" dataKey="claims" stroke="#22c55e" strokeWidth={2} dot={{ fill:'#22c55e', r:4 }} name="Claims" />
                <Line type="monotone" dataKey="amount" stroke="#8b5cf6" strokeWidth={2} dot={{ fill:'#8b5cf6', r:4 }} name="Value ($K)" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card style={S.card} title={<Text style={{ color:'#111827', fontWeight:700 }}>Policies by Type</Text>}>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={policiesByType} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={90} innerRadius={45}>
                  {policiesByType.map((_,i) => <Cell key={i} fill={TYPE_COLORS[i%TYPE_COLORS.length]} />)}
                </Pie>
                <Tooltip {...TT_STYLE} />
                <Legend wrapperStyle={{ color:'#9ca3af', fontSize:11 }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Charts row 2 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card style={S.card} title={<Text style={{ color:'#111827', fontWeight:700 }}>Revenue by Product Type</Text>}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={policiesByType} margin={{ top:10, right:10, bottom:5, left:-10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8edf3" />
                <XAxis dataKey="type" tick={{ fill:'#9ca3af', fontSize:11 }} />
                <YAxis tick={{ fill:'#9ca3af', fontSize:11 }} tickFormatter={v=>`$${v}`} />
                <Tooltip {...TT_STYLE} formatter={v=>[`$${v?.toLocaleString()}`,'Revenue']} />
                <Bar dataKey="revenue" radius={[6,6,0,0]}>
                  {policiesByType.map((_,i) => <Cell key={i} fill={TYPE_COLORS[i%TYPE_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card style={S.card} title={<Text style={{ color:'#111827', fontWeight:700 }}>Claims Status Distribution</Text>}>
            <div style={{ display:'flex', flexDirection:'column', gap:10, maxHeight:220, overflowY:'auto' }}>
              {claimsByStatus.map(c => (
                <div key={c.status}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <Text style={{ color:'#111827', fontSize:12 }}>{c.status.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}</Text>
                    <Text style={{ color:'#9ca3af', fontSize:12 }}>{c.count} ({totalC ? Math.round((c.count/totalC)*100) : 0}%)</Text>
                  </div>
                  <Progress percent={totalC ? Math.round((c.count/totalC)*100) : 0} size={['100%',5]} showInfo={false}
                    strokeColor={STATUS_COLORS[c.status]||'#9ca3af'} trailColor="#e8edf3" />
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
