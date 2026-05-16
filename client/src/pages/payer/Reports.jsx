import { useEffect, useState } from 'react';
import { Row, Col, Card, Typography, Button, Spin } from 'antd';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DownloadOutlined } from '@ant-design/icons';
import { DollarOutlined, AuditOutlined, AlertOutlined, TeamOutlined, SafetyOutlined, RiseOutlined } from '@ant-design/icons';
import api from '../../api';
import StatCard from '../../components/ui/StatCard';

const { Title, Text } = Typography;
const COLORS = ['#1e3a5f','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16'];

export default function PayerReports() {
  const [summary, setSummary]             = useState(null);
  const [claimsByStatus, setClaimsByStatus] = useState([]);
  const [byType, setByType]               = useState([]);
  const [trend, setTrend]                 = useState([]);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/reports/summary'),
      api.get('/reports/claims-by-status'),
      api.get('/reports/enrollments-by-type'),
      api.get('/reports/claims-trend'),
    ]).then(([s, cs, bt, t]) => {
      setSummary(s.data);
      setClaimsByStatus(cs.data.data || []);
      setByType(bt.data.data || []);
      setTrend((t.data.data || []).map(d => ({
        month: `${d._id.year}-${String(d._id.month).padStart(2,'0')}`,
        count: d.count,
        total: Math.round(d.totalClaimed / 1000),
      })));
    }).catch(err => console.error('Reports load failed:', err)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#111827' }}>Analytics & Reports</Title>
          <Text style={{ color: '#6b7280' }}>Performance insights across policies, claims, and revenue.</Text>
        </div>
        <Button icon={<DownloadOutlined />} style={{ borderRadius: 8, height: 38, background: '#1e3a5f', borderColor: '#1e3a5f', color: '#fff' }}>
          Export Report
        </Button>
      </div>

      {/* KPI stat cards */}
      <Row gutter={[16, 16]}>
        <Col xs={12} lg={4}><StatCard title="Annual Revenue (ETB)" value={summary?.annualRevenue ?? 0} icon={<DollarOutlined />} color="#22c55e" trend={8} /></Col>
        <Col xs={12} lg={4}><StatCard title="Active Enrollments" value={summary?.activeEnrollments ?? 0} icon={<AuditOutlined />} color="#1e3a5f" trend={12} /></Col>
        <Col xs={12} lg={4}><StatCard title="Total Claims" value={summary?.totalClaims ?? 0} icon={<AlertOutlined />} color="#f59e0b" /></Col>
        <Col xs={12} lg={4}><StatCard title="Open Claims" value={summary?.openClaims ?? 0} icon={<AlertOutlined />} color="#ef4444" trend={-3} /></Col>
        <Col xs={12} lg={4}><StatCard title="Insured Persons" value={summary?.totalInsuredPersons ?? 0} icon={<TeamOutlined />} color="#8b5cf6" /></Col>
        <Col xs={12} lg={4}><StatCard title="Partner Providers" value={summary?.totalProviders ?? 0} icon={<RiseOutlined />} color="#06b6d4" trend={2} /></Col>
      </Row>

      {/* Charts */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title={<span style={{ fontWeight: 700 }}>Claims by Status</span>}
            style={{ borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={claimsByStatus} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="status" width={155} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#1e3a5f" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title={<span style={{ fontWeight: 700 }}>Policies by Product Type</span>}
            style={{ borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={byType} dataKey="count" nameKey="type" outerRadius={90}
                  label={({ type, percent }) => `${type} ${(percent * 100).toFixed(0)}%`}>
                  {byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24}>
          <Card title={<span style={{ fontWeight: 700 }}>Claims Trend — Last 6 Months</span>}
            style={{ borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="count" stroke="#1e3a5f" name="Claims Count" strokeWidth={2} dot={{ r: 4 }} />
                <Line yAxisId="right" type="monotone" dataKey="total" stroke="#22c55e" name="Total Claimed (K ETB)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
