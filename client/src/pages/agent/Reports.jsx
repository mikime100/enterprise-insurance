import { useEffect, useState } from 'react';
import { Card, Row, Col, Typography, Spin, Progress, Tag } from 'antd';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  TeamOutlined, SafetyOutlined, AlertOutlined, DollarOutlined,
} from '@ant-design/icons';
import api from '../../api';

const { Title, Text } = Typography;

const S = { card:{ background:'#ffffff', border:'1px solid #e8edf3', borderRadius:12 } };
const TT = { contentStyle:{ background:'#f0f4f8', border:'1px solid #e8edf3', borderRadius:8 }, labelStyle:{ color:'#111827' }, itemStyle:{ color:'#6b7280' } };

const STATUS_COLORS = {
  submitted:'#22c55e', acknowledged:'#06b6d4', under_review:'#f59e0b',
  documentation_requested:'#8b5cf6', investigation:'#6366f1', assessment:'#eab308',
  approved:'#10b981', partially_approved:'#84cc16', denied:'#ef4444',
  settled:'#10b981', closed:'#9ca3af',
};
const TYPE_COLORS = ['#22c55e','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#ec4899','#84cc16'];

function StatCard({ label, value, sub, icon, color }) {
  return (
    <Card style={S.card} styles={{ body:{ padding:'20px 22px' } }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <Text style={{ color:'#9ca3af', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.07em', display:'block', marginBottom:8 }}>{label}</Text>
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

export default function AgentReports() {
  const [summary, setSummary]               = useState(null);
  const [claimsByStatus, setClaimsByStatus] = useState([]);
  const [policiesByType, setPoliciesByType] = useState([]);
  const [loading, setLoading]               = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/reports/summary'),
      api.get('/reports/claims-by-status'),
      api.get('/reports/policies-by-type'),
    ]).then(([sr, cr, pr]) => {
      setSummary(sr.data);
      setClaimsByStatus(cr.data.data);
      setPoliciesByType(pr.data.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display:'flex', justifyContent:'center', paddingTop:80 }}><Spin size="large" /></div>;

  const totalClaims = claimsByStatus.reduce((s, c) => s + c.count, 0);

  return (
    <div>
      <div style={{ background:'linear-gradient(135deg, #0a1e3d 0%, #091628 100%)', border:'1px solid #1a3a60', borderRadius:16, padding:'22px 28px', marginBottom:24 }}>
        <Title level={4} style={{ color:'#111827', margin:0, fontWeight:800 }}>Reports & Analytics</Title>
        <Text style={{ color:'#9ca3af' }}>Your portfolio performance overview</Text>
      </div>

      {/* KPIs */}
      <Row gutter={[14, 14]} style={{ marginBottom:20 }}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard label="My Customers" value={summary?.totalCustomers||0} sub="Assigned accounts" icon={<TeamOutlined />} color="#22c55e" />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard label="Active Policies" value={summary?.activePolicies||0} sub="Live coverage" icon={<SafetyOutlined />} color="#10b981" />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard label="Open Claims" value={summary?.openClaims||0} sub="Pending action" icon={<AlertOutlined />} color="#f59e0b" />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard label="Monthly Revenue" value={`$${(summary?.monthlyRevenue||0).toFixed(0)}`} sub="Active premiums" icon={<DollarOutlined />} color="#8b5cf6" />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom:16 }}>
        {/* Policies by type bar chart */}
        <Col xs={24} lg={14}>
          <Card style={S.card} styles={{ header:{ borderBottom:'1px solid #e8edf3' } }}
            title={<Text style={{ color:'#111827', fontWeight:700 }}>Policies by Product Type</Text>}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={policiesByType} margin={{ top:10, right:10, bottom:5, left:-10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8edf3" />
                <XAxis dataKey="type" tick={{ fill:'#9ca3af', fontSize:11 }} />
                <YAxis tick={{ fill:'#9ca3af', fontSize:11 }} />
                <Tooltip {...TT} />
                <Bar dataKey="count" name="Policies" radius={[6,6,0,0]}>
                  {policiesByType.map((_,i) => <Cell key={i} fill={TYPE_COLORS[i%TYPE_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Claims by status donut */}
        <Col xs={24} lg={10}>
          <Card style={S.card} styles={{ header:{ borderBottom:'1px solid #e8edf3' } }}
            title={<Text style={{ color:'#111827', fontWeight:700 }}>Claims by Status</Text>}>
            {claimsByStatus.length === 0 ? (
              <div style={{ textAlign:'center', color:'#9ca3af', padding:'60px 0' }}>No claims data</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={claimsByStatus} dataKey="count" nameKey="status"
                    cx="50%" cy="50%" outerRadius={95} innerRadius={50}>
                    {claimsByStatus.map((e,i) => <Cell key={i} fill={STATUS_COLORS[e.status]||'#9ca3af'} />)}
                  </Pie>
                  <Tooltip {...TT} formatter={(v,n,p) => [v, p.payload.status?.replace(/_/g,' ')]} />
                  <Legend wrapperStyle={{ color:'#9ca3af', fontSize:11 }} formatter={v=>v?.replace(/_/g,' ')} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>
      </Row>

      {/* Claims status breakdown table-style */}
      <Card style={S.card} styles={{ header:{ borderBottom:'1px solid #e8edf3' } }}
        title={<Text style={{ color:'#111827', fontWeight:700 }}>Claims Status Distribution</Text>}>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {claimsByStatus.map(c => {
            const sc = STATUS_COLORS[c.status] || '#9ca3af';
            const pct = totalClaims ? Math.round((c.count/totalClaims)*100) : 0;
            return (
              <div key={c.status}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:10, height:10, borderRadius:'50%', background:sc, flexShrink:0 }} />
                    <Text style={{ color:'#111827', fontSize:13 }}>
                      {c.status.replace(/_/g,' ').replace(/\b\w/g, l=>l.toUpperCase())}
                    </Text>
                  </div>
                  <Text style={{ color:'#9ca3af', fontSize:12 }}>{c.count} ({pct}%)</Text>
                </div>
                <Progress percent={pct} size={['100%', 6]} showInfo={false} strokeColor={sc} trailColor="#e8edf3" />
              </div>
            );
          })}
          {claimsByStatus.length === 0 && (
            <div style={{ textAlign:'center', color:'#9ca3af', padding:'20px 0' }}>No claims data</div>
          )}
        </div>
      </Card>
    </div>
  );
}
