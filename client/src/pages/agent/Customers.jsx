import { useEffect, useState } from 'react';
import {
  Card, Table, Typography, Tag, Space, Button, Input, Avatar,
  Drawer, Descriptions, Divider, Spin, Row, Col,
} from 'antd';
import {
  SearchOutlined, EyeOutlined, UserOutlined, SafetyOutlined,
  AlertOutlined, PhoneOutlined, MailOutlined, EnvironmentOutlined,
} from '@ant-design/icons';
import api from '../../api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const S = { card:{ background:'#ffffff', border:'1px solid #e8edf3', borderRadius:12 } };

const STATUS_COLORS_CLAIM = {
  submitted:'#22c55e', acknowledged:'#06b6d4', under_review:'#f59e0b',
  documentation_requested:'#8b5cf6', investigation:'#6366f1', assessment:'#eab308',
  approved:'#10b981', partially_approved:'#84cc16', denied:'#ef4444',
  settled:'#10b981', closed:'#9ca3af',
};
const STATUS_COLORS_POLICY = {
  active:'#10b981', pending:'#f59e0b', suspended:'#f97316',
  cancelled:'#ef4444', expired:'#9ca3af', pending_renewal:'#22c55e',
};

export default function AgentCustomers() {
  const [customers, setCustomers]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [selected, setSelected]       = useState(null);
  const [policies, setPolicies]       = useState([]);
  const [claims, setClaims]           = useState([]);
  const [drawerOpen, setDrawer]       = useState(false);
  const [loadingDetail, setLoadDetail]= useState(false);

  useEffect(() => {
    api.get('/users/customers').then(r => setCustomers(r.data.customers)).finally(() => setLoading(false));
  }, []);

  const openDetail = async (customer) => {
    setSelected(customer);
    setDrawer(true);
    setLoadDetail(true);
    try {
      const [pr, cr] = await Promise.all([
        api.get(`/policies?customerId=${customer._id}`),
        api.get(`/claims?customerId=${customer._id}`),
      ]);
      setPolicies(pr.data.policies || []);
      setClaims(cr.data.claims || []);
    } finally { setLoadDetail(false); }
  };

  const filtered = customers.filter(c => {
    const q = search.toLowerCase();
    return !q || `${c.firstName} ${c.lastName} ${c.email}`.toLowerCase().includes(q);
  });

  const columns = [
    {
      title: 'Customer', width: 240,
      render: (_, r) => (
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Avatar size={36} style={{ background:'#22c55e18', color:'#22c55e', fontWeight:700, fontSize:12, border:'1px solid #22c55e33', flexShrink:0 }}>
            {r.firstName[0]}{r.lastName[0]}
          </Avatar>
          <div>
            <Text style={{ color:'#111827', fontWeight:600, fontSize:13 }}>{r.firstName} {r.lastName}</Text>
            <div style={{ color:'#9ca3af', fontSize:11 }}>{r.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Phone', width: 140,
      render: (_, r) => <Text style={{ color:'#6b7280', fontSize:12 }}>{r.phone || '—'}</Text>,
    },
    {
      title: 'Location', width: 160,
      render: (_, r) => (
        <Text style={{ color:'#6b7280', fontSize:12 }}>
          {r.address?.city ? `${r.address.city}, ${r.address.state}` : '—'}
        </Text>
      ),
    },
    {
      title: 'Joined', width: 120,
      render: (_, r) => <Text style={{ color:'#9ca3af', fontSize:11 }}>{dayjs(r.createdAt).format('MMM D, YYYY')}</Text>,
    },
    {
      title: 'Status', width: 100,
      render: (_, r) => (
        <Tag style={{ background: r.isActive ? '#10b98118' : '#ef444418', color: r.isActive ? '#10b981' : '#ef4444', border:`1px solid ${r.isActive ? '#10b98133' : '#ef444433'}`, fontSize:11 }}>
          {r.isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Actions', width: 100,
      render: (_, r) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(r)}
          style={{ background:'#f0f4f8', border:'1px solid #e8edf3', color:'#111827' }}>
          View
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Title level={4} style={{ color:'#111827', marginBottom:20 }}>My Customers</Title>

      <Card style={S.card}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:12 }}>
          <Input
            prefix={<SearchOutlined style={{ color:'#9ca3af' }} />}
            placeholder="Search by name or email..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ maxWidth:320, background:'#f8f9fc', borderColor:'#e8edf3' }}
            allowClear
          />
          <Text style={{ color:'#9ca3af', fontSize:13 }}>{filtered.length} customers</Text>
        </div>

        <Table
          dataSource={filtered} columns={columns} rowKey="_id" loading={loading}
          pagination={{ pageSize:12, showTotal:t=>`${t} customers` }}
          style={{ background:'#ffffff' }}
        />
      </Card>

      {/* Customer detail drawer */}
      <Drawer
        title={
          selected && (
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <Avatar size={38} style={{ background:'#22c55e18', color:'#22c55e', fontWeight:700, border:'1px solid #22c55e33' }}>
                {selected.firstName?.[0]}{selected.lastName?.[0]}
              </Avatar>
              <div>
                <Text style={{ color:'#111827', fontWeight:700, display:'block' }}>{selected.firstName} {selected.lastName}</Text>
                <Text style={{ color:'#9ca3af', fontSize:12 }}>{selected.email}</Text>
              </div>
            </div>
          )
        }
        open={drawerOpen} onClose={() => setDrawer(false)} width={560}
        styles={{ content:{ background:'#ffffff' }, header:{ background:'#ffffff', borderBottom:'1px solid #e8edf3' }, body:{ background:'#ffffff' } }}
      >
        {loadingDetail ? (
          <div style={{ display:'flex', justifyContent:'center', paddingTop:40 }}><Spin /></div>
        ) : selected && (
          <>
            {/* Contact info */}
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
              {[
                { icon:<MailOutlined />, label:'Email',   value:selected.email },
                { icon:<PhoneOutlined />, label:'Phone',  value:selected.phone || 'Not provided' },
                { icon:<EnvironmentOutlined />, label:'Address', value: selected.address?.street ? `${selected.address.street}, ${selected.address.city}, ${selected.address.state} ${selected.address.zip}` : 'Not provided' },
              ].map(item => (
                <div key={item.label} style={{ display:'flex', gap:10, alignItems:'flex-start', background:'#f8f9fc', borderRadius:8, padding:'10px 14px', border:'1px solid #e8edf3' }}>
                  <div style={{ width:28, height:28, borderRadius:6, background:'#e8edf3', display:'flex', alignItems:'center', justifyContent:'center', color:'#9ca3af', fontSize:13, flexShrink:0, marginTop:1 }}>
                    {item.icon}
                  </div>
                  <div>
                    <Text style={{ color:'#9ca3af', fontSize:11 }}>{item.label}</Text>
                    <div style={{ color:'#111827', fontSize:13, marginTop:1 }}>{item.value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Policies */}
            <Divider style={{ borderColor:'#e8edf3', margin:'16px 0' }}>
              <Text style={{ color:'#9ca3af', fontSize:12 }}>Policies ({policies.length})</Text>
            </Divider>
            {policies.length === 0 ? (
              <div style={{ textAlign:'center', color:'#9ca3af', padding:'16px 0', fontSize:13 }}>No policies</div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {policies.map(p => {
                  const sc = STATUS_COLORS_POLICY[p.status] || '#9ca3af';
                  return (
                    <div key={p._id} style={{ background:'#f8f9fc', borderRadius:8, padding:'12px 14px', border:'1px solid #e8edf3', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <Text style={{ color:'#111827', fontWeight:600, fontSize:13 }}>{p.product?.name}</Text>
                        <div style={{ color:'#9ca3af', fontSize:11, marginTop:2, fontFamily:'monospace' }}>{p.policyNumber}</div>
                      </div>
                      <Space>
                        <Text style={{ color:'#22c55e', fontWeight:700 }}>${p.premium?.amount}/mo</Text>
                        <Tag style={{ background:`${sc}18`, color:sc, border:`1px solid ${sc}33`, fontSize:11 }}>{p.status}</Tag>
                      </Space>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Claims */}
            <Divider style={{ borderColor:'#e8edf3', margin:'16px 0' }}>
              <Text style={{ color:'#9ca3af', fontSize:12 }}>Claims ({claims.length})</Text>
            </Divider>
            {claims.length === 0 ? (
              <div style={{ textAlign:'center', color:'#9ca3af', padding:'16px 0', fontSize:13 }}>No claims</div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {claims.map(c => {
                  const sc = STATUS_COLORS_CLAIM[c.status] || '#9ca3af';
                  return (
                    <div key={c._id} style={{ background:'#f8f9fc', borderRadius:8, padding:'12px 14px', border:'1px solid #e8edf3', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <Text style={{ color:'#111827', fontWeight:600, fontSize:13 }}>
                          {c.type?.replace(/_/g,' ').replace(/\b\w/g, l=>l.toUpperCase())}
                        </Text>
                        <div style={{ color:'#9ca3af', fontSize:11, marginTop:2, fontFamily:'monospace' }}>{c.claimNumber}</div>
                      </div>
                      <Space>
                        <Text style={{ color:'#f59e0b', fontWeight:700 }}>${c.claimedAmount?.toLocaleString()}</Text>
                        <Tag style={{ background:`${sc}18`, color:sc, border:`1px solid ${sc}33`, fontSize:11 }}>
                          {c.status?.replace(/_/g,' ')}
                        </Tag>
                      </Space>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </Drawer>
    </div>
  );
}
