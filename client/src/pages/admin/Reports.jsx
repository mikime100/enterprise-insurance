import { useEffect, useState } from 'react';
import { Card, Row, Col, Typography, Spin, Progress } from 'antd';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts';
import {
  DollarOutlined, SafetyOutlined, CheckCircleOutlined, AlertOutlined,
} from '@ant-design/icons';
import api from '../../api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const S = { card:{ background:'#0d1a2d', border:'1px solid #1a2d45', borderRadius:12 } };
const TT = { contentStyle:{ background:'#122036', border:'1px solid #1a2d45', borderRadius:8 }, labelStyle:{ color:'#e2e8f0' }, itemStyle:{ color:'#8b9ab0' } };

const TYPE_COLORS  = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#ec4899','#84cc16'];
const STATUS_COLORS = {
  submitted:'#3b82f6', acknowledged:'#06b6d4', under_review:'#f59e0b',
  documentation_requested:'#8b5cf6', investigation:'#6366f1', assessment:'#eab308',
  approved:'#10b981', partially_approved:'#84cc16', denied:'#ef4444',
  settled:'#10b981', closed:'#4f6272',
};

function StatCard({ label, value, sub, icon, color }) {
  return (
    <Card style={S.card} styles={{ body:{ padding:'20px 22px' } }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <Text style={{ color:'#4f6272', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.07em', display:'block', marginBottom:8 }}>{label}</Text>
          <div style={{ color:'#e2e8f0', fontSize:26, fontWeight:800, lineHeight:1 }}>{value}</div>
          {sub && <div style={{ color:'#4f6272', fontSize:11, marginTop:6 }}>{sub}</div>}
        </div>
        <div style={{ width:42, height:42, borderRadius:12, background:`${color}18`, border:`1px solid ${color}33`, display:'flex', alignItems:'center', justifyContent:'center', color, fontSize:19 }}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

export default function AdminReports() {
  const [summary, setSummary]               = useState(null);
  const [claimsByStatus, setClaimsByStatus] = useState([]);
  const [policiesByType, setPoliciesByType] = useState([]);
  const [claimsTrend, setClaimsTrend]       = useState([]);
  const [loading, setLoading]               = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/reports/summary'),
      api.get('/reports/claims-by-status'),
      api.get('/reports/policies-by-type'),
      api.get('/reports/claims-trend'),
    ]).then(([sr, cr, pr, tr]) => {
      setSummary(sr.data);
      setClaimsByStatus(cr.data.data);
      setPoliciesByType(pr.data.data);
      setClaimsTrend(tr.data.data.map(d => ({
        month: dayjs(`${d._id.year}-${d._id.month}-1`).format('MMM YY'),
        claims: d.count,
        claimedAmount: Math.round(d.totalClaimed / 1000),
      })));
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display:'flex', justifyContent:'center', paddingTop:80 }}><Spin size="large" /></div>;

  const totalClaims    = claimsByStatus.reduce((s, c) => s+c.count, 0);
  const resolvedClaims = claimsByStatus.filter(c => ['approved','partially_approved','denied','settled','closed'].includes(c.status)).reduce((s,c)=>s+c.count,0);
  const resolutionRate = totalClaims ? Math.round((resolvedClaims/totalClaims)*100) : 0;
  const utilizationRate = summary?.totalPolicies ? Math.round((summary.activePolicies/summary.totalPolicies)*100) : 0;

  return (
    <div>
      <div style={{ background:'linear-gradient(135deg, #0a2040 0%, #091628 100%)', border:'1px solid #1a3a60', borderRadius:16, padding:'22px 28px', marginBottom:24 }}>
        <Title level={4} style={{ color:'#e2e8f0', margin:0, fontWeight:800 }}>System Reports & Analytics</Title>
        <Text style={{ color:'#4f6272' }}>Full platform performance · {dayjs().format('MMMM D, YYYY')}</Text>
      </div>

      {/* Top KPIs */}
      <Row gutter={[14, 14]} style={{ marginBottom:20 }}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard label="Monthly Revenue" value={`$${(summary?.monthlyRevenue||0).toFixed(0)}`} sub="Recurring premiums" icon={<DollarOutlined />} color="#10b981" />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard label="Policy Utilization" value={`${utilizationRate}%`} sub={`${summary?.activePolicies||0} of ${summary?.totalPolicies||0} active`} icon={<SafetyOutlined />} color="#3b82f6" />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard label="Claim Resolution" value={`${resolutionRate}%`} sub={`${resolvedClaims} of ${totalClaims} resolved`} icon={<CheckCircleOutlined />} color="#8b5cf6" />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard label="Open Claims" value={summary?.openClaims||0} sub="Pending review" icon={<AlertOutlined />} color="#f59e0b" />
        </Col>
      </Row>

      {/* Charts row 1 */}
      <Row gutter={[16, 16]} style={{ marginBottom:16 }}>
        <Col xs={24} lg={16}>
          <Card style={S.card} styles={{ header:{ borderBottom:'1px solid #1a2d45' } }}
            title={<Text style={{ color:'#e2e8f0', fontWeight:700 }}>Claims Volume & Value (6 Months)</Text>}>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={claimsTrend} margin={{ top:10, right:30, bottom:5, left:-10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a2d45" />
                <XAxis dataKey="month" tick={{ fill:'#4f6272', fontSize:12 }} />
                <YAxis yAxisId="left" tick={{ fill:'#4f6272', fontSize:11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill:'#4f6272', fontSize:11 }} tickFormatter={v=>`$${v}K`} />
                <Tooltip {...TT} formatter={(v,n) => n==='claimedAmount' ? [`$${v}K`,'Claimed Value'] : [v,'# Claims']} />
                <Legend wrapperStyle={{ color:'#4f6272', fontSize:12 }} />
                <Line yAxisId="left" type="monotone" dataKey="claims" stroke="#3b82f6" strokeWidth={2} dot={{ fill:'#3b82f6', r:4 }} name="# Claims" />
                <Line yAxisId="right" type="monotone" dataKey="claimedAmount" stroke="#f59e0b" strokeWidth={2} dot={{ fill:'#f59e0b', r:4 }} name="Value ($K)" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card style={S.card} styles={{ header:{ borderBottom:'1px solid #1a2d45' } }}
            title={<Text style={{ color:'#e2e8f0', fontWeight:700 }}>Policies by Type</Text>}>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={policiesByType} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={90} innerRadius={45}>
                  {policiesByType.map((_,i) => <Cell key={i} fill={TYPE_COLORS[i%TYPE_COLORS.length]} />)}
                </Pie>
                <Tooltip {...TT} />
                <Legend wrapperStyle={{ color:'#4f6272', fontSize:11 }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Charts row 2 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card style={S.card} styles={{ header:{ borderBottom:'1px solid #1a2d45' } }}
            title={<Text style={{ color:'#e2e8f0', fontWeight:700 }}>Revenue by Product Type</Text>}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={policiesByType} margin={{ top:10, right:10, bottom:5, left:-10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a2d45" />
                <XAxis dataKey="type" tick={{ fill:'#4f6272', fontSize:11 }} />
                <YAxis tick={{ fill:'#4f6272', fontSize:11 }} tickFormatter={v=>`$${v}`} />
                <Tooltip {...TT} formatter={v=>[`$${v?.toLocaleString()}`,'Revenue']} />
                <Bar dataKey="revenue" radius={[6,6,0,0]}>
                  {policiesByType.map((_,i) => <Cell key={i} fill={TYPE_COLORS[i%TYPE_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card style={S.card} styles={{ header:{ borderBottom:'1px solid #1a2d45' } }}
            title={<Text style={{ color:'#e2e8f0', fontWeight:700 }}>Claims Status Distribution</Text>}>
            <div style={{ display:'flex', flexDirection:'column', gap:10, maxHeight:220, overflowY:'auto' }}>
              {claimsByStatus.map(c => {
                const sc = STATUS_COLORS[c.status] || '#4f6272';
                const pct = totalClaims ? Math.round((c.count/totalClaims)*100) : 0;
                return (
                  <div key={c.status}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <div style={{ width:8, height:8, borderRadius:'50%', background:sc, flexShrink:0 }} />
                        <Text style={{ color:'#e2e8f0', fontSize:12 }}>{c.status.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}</Text>
                      </div>
                      <Text style={{ color:'#4f6272', fontSize:12 }}>{c.count} ({pct}%)</Text>
                    </div>
                    <Progress percent={pct} size={['100%',5]} showInfo={false} strokeColor={sc} trailColor="#1a2d45" />
                  </div>
                );
              })}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
