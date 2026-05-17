import { useState } from 'react';
import { Form, Input, Button, Typography, Alert, Divider } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text } = Typography;

const DEMOS = [
  { role: 'Super Admin',    email: 'admin@nileinsurance.com',         password: 'Admin@123',       color: '#22c55e', desc: 'Full system access' },
  { role: 'Payer Admin',    email: 'payer.admin@nileinsurance.com',   password: 'Payer@123',       color: '#1e3a5f', desc: 'Nile Insurance staff' },
  { role: 'Underwriter',    email: 'underwriter@nileinsurance.com',   password: 'Under@123',       color: '#8b5cf6', desc: 'Quote & underwriting' },
  { role: 'Claims Officer', email: 'claims@nileinsurance.com',        password: 'Claims@123',      color: '#f59e0b', desc: 'Claims processing' },
  { role: 'Provider',       email: 'billing@stgabriel.com',           password: 'Provider@123',    color: '#ec4899', desc: 'St. Gabriel Hospital' },
  { role: 'Institution HR', email: 'hr@ethiotelecom.et',              password: 'Institution@123', color: '#f97316', desc: 'Ethio Telecom HR' },
  { role: 'Insured Person', email: 'biruk@ethiotelecom.et',           password: 'Insured@123',     color: '#06b6d4', desc: 'Employee portal' },
];

const FEATURES = [
  { title: 'Multi-Stakeholder Portals', desc: 'Separate dashboards for payers, providers, institutions, and insured persons.' },
  { title: 'End-to-End Claims Workflow', desc: 'Submit, track, assess, and settle claims with full audit trail.' },
  { title: 'Quote & Enrollment Engine', desc: 'Dynamic underwriting, scenario pricing, and digital policy issuance.' },
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
      if (user.mustChangePassword) { navigate('/change-password'); return; }
      const PAYER_ROLES = ['payer_admin', 'underwriter', 'claims_officer', 'finance_officer', 'customer_support'];
      if (user.role === 'superadmin')        navigate('/admin/dashboard');
      else if (user.role === 'sales_broker') navigate('/broker/dashboard');
      else if (PAYER_ROLES.includes(user.role)) navigate('/payer/dashboard');
      else if (user.role === 'provider_admin') navigate('/provider/dashboard');
      else if (user.role === 'institution_admin') navigate('/institution/dashboard');
      else navigate('/insured/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', background: '#ffffff', overflow: 'hidden' }}>

      {/* ── Left panel ── */}
      <div style={{
        flex: 1, display: 'none', flexDirection: 'column', justifyContent: 'center',
        padding: '36px 52px', position: 'relative', overflow: 'hidden',
        background: '#111111',
      }}
        className="login-left-panel"
      >
        {/* Subtle grid */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.04,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

        {/* Glow orb */}
        <div style={{ position:'absolute', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(34,197,94,0.15) 0%, transparent 70%)', top:-100, right:-100, pointerEvents:'none' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Logo */}
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:32 }}>
            <div style={{ width:42, height:42, borderRadius:10, background:'#22c55e', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:20, color:'#fff', flexShrink:0 }}>E</div>
            <div>
              <div style={{ color:'#ffffff', fontSize:17, fontWeight:800, lineHeight:1.1 }}>Enterprise Insurance</div>
              <div style={{ color:'#4b5563', fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase' }}>Management Platform</div>
            </div>
          </div>

          <Title level={2} style={{ color:'#ffffff', fontWeight:800, lineHeight:1.25, marginBottom:10, fontSize:28 }}>
            Insurance Operations,<br/>
            <span style={{ color:'#22c55e' }}>Fully Digitized</span>
          </Title>
          <Text style={{ color:'#6b7280', fontSize:13, display:'block', marginBottom:28, lineHeight:1.65 }}>
            One platform connecting payers, providers, institutions, and insured persons across the full insurance lifecycle.
          </Text>

          {/* Features */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                <div style={{ width:8, height:8, borderRadius:'50%', flexShrink:0, marginTop:5, background:'#22c55e' }} />
                <div>
                  <div style={{ color:'#ffffff', fontWeight:600, fontSize:13, marginBottom:2 }}>{f.title}</div>
                  <div style={{ color:'#6b7280', fontSize:12, lineHeight:1.5 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div style={{
        width: '100%', maxWidth: 460,
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-start',
        padding: '32px 36px', overflowY: 'auto', flexShrink: 0,
      }}>
        {/* Logo (shown on mobile / when left panel is hidden) */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:'#22c55e', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:15, color:'#fff' }}>E</div>
          <div>
            <div style={{ color:'#111827', fontSize:13, fontWeight:700 }}>Enterprise Insurance</div>
            <div style={{ color:'#6b7280', fontSize:10 }}>Management Platform</div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Title level={3} style={{ color:'#111827', margin:0, fontWeight:700 }}>Welcome back</Title>
          <Text style={{ color:'#6b7280' }}>Sign in to access your portal</Text>
        </div>

        {error && <Alert message={error} type="error" showIcon style={{ marginBottom:12, borderRadius:8 }} />}

        <Form form={form} onFinish={onFinish} layout="vertical" size="large">
          <Form.Item name="email" label="Email address" rules={[{required:true,message:'Email is required'},{type:'email',message:'Enter a valid email'}]} style={{ marginBottom:12 }}>
            <Input prefix={<MailOutlined style={{color:'#9ca3af'}} />} placeholder="you@example.com"
              style={{ background:'#ffffff', borderColor:'#e5e7eb', height:40 }} />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{required:true,message:'Password is required'}]} style={{ marginBottom:12 }}>
            <Input.Password prefix={<LockOutlined style={{color:'#9ca3af'}} />} placeholder="Your password"
              style={{ background:'#ffffff', borderColor:'#e5e7eb', height:40 }} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block style={{
            height:42, fontWeight:700, fontSize:14, borderRadius:8, marginTop:2,
            background:'#1e3a5f', border:'none',
            boxShadow:'0 2px 8px rgba(30,58,95,0.3)',
          }}>
            Sign In to Portal
          </Button>
        </Form>

        <Divider style={{ borderColor:'#e5e7eb', color:'#9ca3af', fontSize:11, margin:'12px 0 8px' }}>Quick Demo Access</Divider>

        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          {DEMOS.map(d => (
            <div key={d.role}
              onClick={() => form.setFieldsValue({ email: d.email, password: d.password })}
              style={{
                border:`1px solid ${d.color}33`, borderRadius:8, padding:'6px 12px',
                cursor:'pointer', background:`${d.color}08`, display:'flex', alignItems:'center', gap:10,
                transition:'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = `${d.color}15`; e.currentTarget.style.borderColor = `${d.color}55`; }}
              onMouseLeave={e => { e.currentTarget.style.background = `${d.color}08`; e.currentTarget.style.borderColor = `${d.color}33`; }}
            >
              <div style={{ width:24, height:24, borderRadius:6, background:d.color, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:10, flexShrink:0 }}>
                {d.role[0]}
              </div>
              <div>
                <div style={{ color:'#111827', fontWeight:600, fontSize:12 }}>{d.role}</div>
                <div style={{ color:'#6b7280', fontSize:10 }}>{d.desc} · Click to fill</div>
              </div>
              <div style={{ marginLeft:'auto', color:d.color, fontSize:10, fontWeight:700 }}>USE →</div>
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
