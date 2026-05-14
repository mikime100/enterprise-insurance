import { useState } from 'react';
import { Form, Input, Button, Typography, Alert, Divider, Space } from 'antd';
import { LockOutlined, MailOutlined, SecurityScanOutlined, SafetyOutlined, FileTextOutlined, AlertOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text, Paragraph } = Typography;

const DEMOS = [
  { role: 'Admin',    email: 'admin@insurance.com',       password: 'Admin@123',    color: '#ec4899', desc: 'Full system access' },
  { role: 'Agent',    email: 'sarah.agent@insurance.com', password: 'Agent@123',    color: '#8b5cf6', desc: 'Agent portal' },
  { role: 'Customer', email: 'michael@customer.com',      password: 'Customer@123', color: '#22c55e', desc: 'Customer portal' },
];

const FEATURES = [
  { icon: <SafetyOutlined />,   title: 'Smart Policy Management', desc: 'Manage all your insurance policies in one unified dashboard.' },
  { icon: <AlertOutlined />,    title: 'Real-Time Claims',        desc: 'File and track claims with live status updates and workflow.' },
  { icon: <FileTextOutlined />, title: 'Instant Quotes',          desc: 'Compare coverage options and get instant pricing in minutes.' },
];

export default function Login() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const { login }  = useAuth();
  const navigate   = useNavigate();

  const onFinish = async ({ email, password }) => {
    setLoading(true); setError('');
    try {
      const user = await login(email, password);
      navigate(user.role === 'admin' ? '/admin/dashboard' : user.role === 'agent' ? '/agent/dashboard' : '/customer/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#ffffff' }}>

      {/* ── Left panel ── */}
      <div style={{
        flex: 1, display: 'none', flexDirection: 'column', justifyContent: 'center',
        padding: '60px 64px', position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, #0d3320 0%, #14532d 50%, #166534 100%)',
        borderRight: '1px solid #166534',
      }}
        className="login-left-panel"
      >
        {/* Grid overlay */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.06,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

        {/* Glow orbs */}
        <div style={{ position:'absolute', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(34,197,94,0.25) 0%, transparent 70%)', top:-100, right:-100, pointerEvents:'none' }} />
        <div style={{ position:'absolute', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)', bottom:-50, left:-50, pointerEvents:'none' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Logo */}
          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:56 }}>
            <div style={{
              width:52, height:52, borderRadius:14,
              background:'rgba(255,255,255,0.15)',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 8px 32px rgba(0,0,0,0.2)',
              border: '1px solid rgba(255,255,255,0.2)',
            }}>
              <SecurityScanOutlined style={{ color:'#fff', fontSize:26 }} />
            </div>
            <div>
              <div style={{ color:'#ffffff', fontSize:20, fontWeight:800, lineHeight:1.1 }}>Enterprise</div>
              <div style={{ color:'rgba(255,255,255,0.7)', fontSize:12, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase' }}>Insurance Platform</div>
            </div>
          </div>

          <Title level={2} style={{ color:'#ffffff', fontWeight:800, lineHeight:1.2, marginBottom:12, fontSize:32 }}>
            The Modern Way to<br/>
            <span style={{ color:'rgba(255,255,255,0.8)' }}>
              Manage Insurance
            </span>
          </Title>
          <Paragraph style={{ color:'rgba(255,255,255,0.65)', fontSize:15, marginBottom:48, lineHeight:1.7 }}>
            Streamline policies, claims, and customer relationships in one powerful enterprise platform.
          </Paragraph>

          {/* Features */}
          <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{ display:'flex', gap:16, alignItems:'flex-start' }}>
                <div style={{
                  width:40, height:40, borderRadius:10, flexShrink:0,
                  background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.2)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color:'#ffffff', fontSize:17,
                }}>
                  {f.icon}
                </div>
                <div>
                  <div style={{ color:'#ffffff', fontWeight:600, fontSize:14, marginBottom:3 }}>{f.title}</div>
                  <div style={{ color:'rgba(255,255,255,0.6)', fontSize:13, lineHeight:1.5 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div style={{
        width: '100%', maxWidth: 460, margin: '0 auto',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '28px 36px',
      }}>
        {/* Mobile logo */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:22 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg, #22c55e, #16a34a)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 14px rgba(34,197,94,0.3)' }}>
            <SecurityScanOutlined style={{ color:'#fff', fontSize:18 }} />
          </div>
          <div>
            <div style={{ color:'#111827', fontSize:14, fontWeight:700 }}>Enterprise Insurance</div>
            <div style={{ color:'#6b7280', fontSize:11 }}>Platform</div>
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <Title level={3} style={{ color:'#111827', margin:0, fontWeight:700 }}>Welcome back</Title>
          <Text style={{ color:'#6b7280' }}>Sign in to access your portal</Text>
        </div>

        {error && <Alert message={error} type="error" showIcon style={{ marginBottom:14, borderRadius:8 }} />}

        <Form form={form} onFinish={onFinish} layout="vertical" size="large">
          <Form.Item name="email" label="Email address" rules={[{required:true,message:'Email is required'},{type:'email',message:'Enter a valid email'}]} style={{ marginBottom:14 }}>
            <Input prefix={<MailOutlined style={{color:'#9ca3af'}} />} placeholder="you@example.com"
              style={{ background:'#ffffff', borderColor:'#e8edf3', height:42 }} />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{required:true,message:'Password is required'}]} style={{ marginBottom:14 }}>
            <Input.Password prefix={<LockOutlined style={{color:'#9ca3af'}} />} placeholder="Your password"
              style={{ background:'#ffffff', borderColor:'#e8edf3', height:42 }} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block style={{
            height:44, fontWeight:700, fontSize:14, borderRadius:10, marginTop:2,
            background:'linear-gradient(135deg, #22c55e, #16a34a)',
            border:'none', boxShadow:'0 4px 14px rgba(34,197,94,0.3)',
          }}>
            Sign In to Portal
          </Button>
        </Form>

        <div style={{ textAlign:'center', marginTop:12 }}>
          <Text style={{ color:'#6b7280', fontSize:12 }}>
            New customer?{' '}
            <Link to="/register" style={{ color:'#22c55e', fontWeight:600 }}>Create an account</Link>
          </Text>
        </div>

        <Divider style={{ borderColor:'#e8edf3', color:'#9ca3af', fontSize:11, margin:'12px 0' }}>Quick Demo Access</Divider>

        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {DEMOS.map(d => (
            <div key={d.role}
              onClick={() => form.setFieldsValue({ email: d.email, password: d.password })}
              style={{
                border:`1px solid ${d.color}33`, borderRadius:8, padding:'7px 12px',
                cursor:'pointer', background:`${d.color}0a`, display:'flex', alignItems:'center', gap:10,
                transition:'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = `${d.color}18`; e.currentTarget.style.borderColor = `${d.color}66`; }}
              onMouseLeave={e => { e.currentTarget.style.background = `${d.color}0a`; e.currentTarget.style.borderColor = `${d.color}33`; }}
            >
              <div style={{ width:28, height:28, borderRadius:6, background:d.color, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:11, flexShrink:0 }}>
                {d.role[0]}
              </div>
              <div>
                <div style={{ color:'#111827', fontWeight:600, fontSize:12 }}>{d.role} Demo</div>
                <div style={{ color:'#6b7280', fontSize:10 }}>{d.desc} · Click to fill</div>
              </div>
              <div style={{ marginLeft:'auto', color:d.color, fontSize:10, fontWeight:600 }}>USE →</div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (min-width: 900px) { .login-left-panel { display: flex !important; } }
      `}</style>
    </div>
  );
}
