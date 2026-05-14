import { useEffect, useState } from 'react';
import {
  Card, Table, Typography, Tag, Space, Button, Select, Drawer,
  Descriptions, Timeline, Divider, message, Avatar, Progress,
} from 'antd';
import { EyeOutlined, CalendarOutlined, SwapOutlined } from '@ant-design/icons';
import api from '../../api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const S = { card:{ background:'#ffffff', border:'1px solid #e8edf3', borderRadius:12 } };

const STATUS_CONFIG = {
  active:          { color:'#10b981', label:'Active' },
  pending:         { color:'#f59e0b', label:'Pending' },
  suspended:       { color:'#f97316', label:'Suspended' },
  cancelled:       { color:'#ef4444', label:'Cancelled' },
  expired:         { color:'#9ca3af', label:'Expired' },
  pending_renewal: { color:'#22c55e', label:'Pending Renewal' },
};

function StatusTag({ status }) {
  const cfg = STATUS_CONFIG[status] || { color:'#9ca3af', label:status };
  return (
    <Tag style={{ background:`${cfg.color}18`, color:cfg.color, border:`1px solid ${cfg.color}33`, fontSize:11, fontWeight:500 }}>
      {cfg.label}
    </Tag>
  );
}

export default function AgentPolicies() {
  const [policies, setPolicies]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [statusFilter, setFilter]     = useState('');
  const [selected, setSelected]       = useState(null);
  const [drawerOpen, setDrawer]       = useState(false);
  const [updating, setUpdating]       = useState(false);
  const [newStatus, setNewStatus]     = useState('');

  const fetch = () => {
    const q = statusFilter ? `?status=${statusFilter}` : '';
    setLoading(true);
    api.get(`/policies${q}`).then(r => setPolicies(r.data.policies)).finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, [statusFilter]);

  const openDetail = async (p) => {
    const res = await api.get(`/policies/${p._id}`);
    setSelected(res.data.policy);
    setNewStatus(res.data.policy.status);
    setDrawer(true);
  };

  const handleStatusUpdate = async () => {
    if (!newStatus || newStatus === selected.status) return;
    setUpdating(true);
    try {
      await api.patch(`/policies/${selected._id}/status`, { status:newStatus });
      message.success('Policy status updated');
      setSelected(prev => ({ ...prev, status:newStatus }));
      setPolicies(prev => prev.map(p => p._id === selected._id ? { ...p, status:newStatus } : p));
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to update');
    } finally { setUpdating(false); }
  };

  const columns = [
    {
      title: 'Policy', width: 160,
      render: (_, r) => (
        <div>
          <Text style={{ color:'#22c55e', fontFamily:'monospace', fontSize:11 }}>{r.policyNumber}</Text>
          <div style={{ color:'#9ca3af', fontSize:11, marginTop:2 }}>{dayjs(r.startDate).format('MMM D, YYYY')}</div>
        </div>
      ),
    },
    {
      title: 'Customer',
      render: (_, r) => (
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Avatar size={30} style={{ background:'#22c55e18', color:'#22c55e', fontWeight:700, fontSize:11, border:'1px solid #22c55e33', flexShrink:0 }}>
            {r.customer?.firstName?.[0]}{r.customer?.lastName?.[0]}
          </Avatar>
          <div>
            <Text style={{ color:'#111827', fontSize:13 }}>{r.customer?.firstName} {r.customer?.lastName}</Text>
            <div style={{ color:'#9ca3af', fontSize:11 }}>{r.customer?.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Product',
      render: (_, r) => (
        <div>
          <Text style={{ color:'#111827', fontSize:13 }}>{r.product?.name}</Text>
          <div><Tag style={{ background:'#e8edf3', color:'#6b7280', border:'none', fontSize:10 }}>{r.product?.type?.toUpperCase()}</Tag></div>
        </div>
      ),
    },
    {
      title: 'Premium', width: 120,
      render: (_, r) => (
        <Text style={{ color:'#22c55e', fontWeight:700 }}>
          ${r.premium?.amount}<span style={{ color:'#9ca3af', fontSize:11 }}>/mo</span>
        </Text>
      ),
    },
    {
      title: 'Coverage', width: 120,
      render: (_, r) => <Text style={{ color:'#111827', fontWeight:600 }}>${r.coverageDetails?.coverageAmount?.toLocaleString()}</Text>,
    },
    {
      title: 'Status', width: 140,
      render: (_, r) => <StatusTag status={r.status} />,
    },
    {
      title: 'Expires', width: 110,
      render: (_, r) => {
        const soon = dayjs(r.endDate).isBefore(dayjs().add(60,'days'));
        return <Text style={{ color: soon ? '#f59e0b' : '#9ca3af', fontSize:12 }}>{dayjs(r.endDate).format('MMM D, YYYY')}</Text>;
      },
    },
    {
      title: 'Actions', width: 90,
      render: (_, r) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(r)}
          style={{ background:'#f0f4f8', border:'1px solid #e8edf3', color:'#111827' }}>
          Manage
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Title level={4} style={{ color:'#111827', marginBottom:20 }}>Policies</Title>

      <Card style={S.card}>
        <Space style={{ marginBottom:16 }} wrap>
          <Select placeholder="All statuses" allowClear value={statusFilter||undefined}
            onChange={v => setFilter(v||'')} style={{ width:190 }}
            options={Object.keys(STATUS_CONFIG).map(s=>({ value:s, label:STATUS_CONFIG[s].label }))}
          />
        </Space>

        <Table
          dataSource={policies} columns={columns} rowKey="_id" loading={loading}
          pagination={{ pageSize:12, showTotal:t=>`${t} policies` }}
          style={{ background:'#ffffff' }}
        />
      </Card>

      {/* Detail drawer */}
      <Drawer
        title={<Text style={{ color:'#111827', fontWeight:700 }}>Policy — {selected?.policyNumber}</Text>}
        open={drawerOpen} onClose={() => setDrawer(false)} width={520}
        styles={{ content:{ background:'#ffffff' }, header:{ background:'#ffffff', borderBottom:'1px solid #e8edf3' }, body:{ background:'#ffffff' } }}
        extra={
          <Space>
            <Select value={newStatus} onChange={setNewStatus} size="small" style={{ width:160 }}
              options={['active','pending','suspended','pending_renewal','cancelled'].map(s => ({ value:s, label:STATUS_CONFIG[s]?.label || s }))}
            />
            <Button type="primary" size="small" loading={updating}
              disabled={newStatus === selected?.status} onClick={handleStatusUpdate} icon={<SwapOutlined />}>
              Update
            </Button>
          </Space>
        }
      >
        {selected && (
          <>
            <Descriptions column={1} size="small" labelStyle={{ color:'#9ca3af', width:130 }} contentStyle={{ color:'#111827' }}>
              <Descriptions.Item label="Customer">{selected.customer?.firstName} {selected.customer?.lastName}</Descriptions.Item>
              <Descriptions.Item label="Email">{selected.customer?.email}</Descriptions.Item>
              <Descriptions.Item label="Product">{selected.product?.name}</Descriptions.Item>
              <Descriptions.Item label="Type"><Tag style={{ background:'#e8edf3', color:'#6b7280', border:'none' }}>{selected.product?.type?.toUpperCase()}</Tag></Descriptions.Item>
              <Descriptions.Item label="Status"><StatusTag status={selected.status} /></Descriptions.Item>
              <Descriptions.Item label="Premium">${selected.premium?.amount} ({selected.premium?.frequency})</Descriptions.Item>
              <Descriptions.Item label="Coverage">${selected.coverageDetails?.coverageAmount?.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="Start Date">{dayjs(selected.startDate).format('MMM D, YYYY')}</Descriptions.Item>
              <Descriptions.Item label="End Date">{dayjs(selected.endDate).format('MMM D, YYYY')}</Descriptions.Item>
            </Descriptions>

            {/* Coverage period */}
            <div style={{ marginTop:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <Text style={{ color:'#9ca3af', fontSize:12 }}>Coverage period remaining</Text>
                <Text style={{ color:'#9ca3af', fontSize:12 }}>
                  {Math.max(0, dayjs(selected.endDate).diff(dayjs(),'day'))} days left
                </Text>
              </div>
              <Progress
                percent={Math.max(0, Math.min(100, Math.round((dayjs(selected.endDate).diff(dayjs(),'day') / dayjs(selected.endDate).diff(dayjs(selected.startDate),'day')) * 100)))}
                size={['100%', 6]} showInfo={false} strokeColor="#22c55e" trailColor="#e8edf3"
              />
            </div>

            {selected.coverageDetails?.selectedOptions?.length > 0 && (
              <>
                <Divider style={{ borderColor:'#e8edf3', margin:'16px 0' }}>Coverage Add-ons</Divider>
                <Space wrap>
                  {selected.coverageDetails.selectedOptions.map(o => (
                    <Tag key={o} style={{ background:'#22c55e18', color:'#6b7280', border:'1px solid #e8edf3' }}>{o}</Tag>
                  ))}
                </Space>
              </>
            )}

            {selected.paymentHistory?.length > 0 && (
              <>
                <Divider style={{ borderColor:'#e8edf3', margin:'16px 0' }}>Payment History</Divider>
                <Timeline items={selected.paymentHistory.slice(-5).reverse().map(ph => ({
                  color: ph.status === 'completed' ? '#10b981' : '#ef4444',
                  children: (
                    <div>
                      <Text style={{ color:'#111827', fontWeight:600 }}>${ph.amount}</Text>
                      <span style={{ color:'#9ca3af', fontSize:12, marginLeft:8 }}>{ph.method?.replace(/_/g,' ')}</span>
                      <div style={{ color:'#9ca3af', fontSize:11 }}>
                        {dayjs(ph.date).format('MMM D, YYYY')} · {ph.transactionId}
                      </div>
                    </div>
                  ),
                }))} />
              </>
            )}
          </>
        )}
      </Drawer>
    </div>
  );
}
