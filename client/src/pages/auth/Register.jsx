import { useState } from 'react';
import { Form, Input, Button, Typography, Alert, DatePicker, Row, Col, Divider } from 'antd';
import {
  UserOutlined, LockOutlined, MailOutlined, PhoneOutlined,
  SecurityScanOutlined, CheckCircleOutlined, SafetyOutlined, AlertOutlined,
} from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const BENEFITS = [
  { icon: <SafetyOutlined />, text: 'Instant digital policy management' },
  { icon: <AlertOutlined />, text: 'Real-time claim tracking & updates' },
  { icon: <CheckCircleOutlined />, text: '24/7 dedicated agent support' },
];

export default function Register() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true); setError('');
    try {
      const payload = { ...values, dateOfBirth: values.dateOfBirth?.toISOString() };
      delete payload.confirmPassword;
      await register(payload);
      navigate('/customer/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', background:'#060e1a' }}>

      {/* Left branding panel */}
      <div className="login-left-panel" style={{
        flex:1, display:'none', flexDirection:'column', justifyContent:'center',
        padding:'60px 64px', position:'relative', overflow:'hidden',
        background:'linear-gradient(135deg, #060e1a 0%, #091628 40%, #0a1e3d 100%)',
        borderRight:'1px solid #1a2d45',
      }}>
        <div style={{ position:'absolute', inset:0, opacity:0.04, backgroundImage:'linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)', backgroundSize:'40px 40px' }} />
        <div style={{ position:'absolute', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)', top:-100, right:-100, pointerEvents:'none' }} />
        <div style={{ position:'absolute', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)', bottom:-50, left:-50, pointerEvents:'none' }} />

        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:56 }}>
            <div style={{ width:52, height:52, borderRadius:14, background:'linear-gradient(135deg, #3b82f6, #1d4ed8)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 8px 32px rgba(59,130,246,0.4)' }}>
              <SecurityScanOutlined style={{ color:'#fff', fontSize:26 }} />
            </div>
            <div>
              <div style={{ color:'#e2e8f0', fontSize:20, fontWeight:800, lineHeight:1.1 }}>Enterprise</div>
              <div style={{ color:'#3b82f6', fontSize:12, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase' }}>Insurance Platform</div>
            </div>
          </div>

          <Title level={2} style={{ color:'#e2e8f0', fontWeight:800, lineHeight:1.2, marginBottom:12, fontSize:32 }}>
            Start Your Coverage<br/>
            <span style={{ background:'linear-gradient(90deg, #3b82f6, #8b5cf6)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
              Journey Today
            </span>
          </Title>
          <Text style={{ color:'#4f6272', fontSize:15, display:'block', marginBottom:48, lineHeight:1.7 }}>
            Join thousands of customers who trust Enterprise Insurance for complete protection of what matters most.
          </Text>

          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            {BENEFITS.map((b, i) => (
              <div key={i} style={{ display:'flex', gap:14, alignItems:'center' }}>
                <div style={{ width:36, height:36, borderRadius:10, flexShrink:0, background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.2)', display:'flex', alignItems:'center', justifyContent:'center', color:'#3b82f6', fontSize:16 }}>
                  {b.icon}
                </div>
                <Text style={{ color:'#8b9ab0', fontSize:14 }}>{b.text}</Text>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div style={{ width:'100%', maxWidth:520, margin:'0 auto', display:'flex', flexDirection:'column', justifyContent:'center', padding:'40px 40px', overflowY:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:36 }}>
          <div style={{ width:38, height:38, borderRadius:10, background:'linear-gradient(135deg, #3b82f6,#1d4ed8)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 6px 20px rgba(59,130,246,0.4)' }}>
            <SecurityScanOutlined style={{ color:'#fff', fontSize:19 }} />
          </div>
          <div>
            <div style={{ color:'#e2e8f0', fontSize:15, fontWeight:700 }}>Enterprise Insurance</div>
            <div style={{ color:'#4f6272', fontSize:12 }}>Platform</div>
          </div>
        </div>

        <div style={{ marginBottom:28 }}>
          <Title level={3} style={{ color:'#e2e8f0', margin:0, fontWeight:700 }}>Create your account</Title>
          <Text style={{ color:'#4f6272' }}>Get covered in minutes — no paperwork</Text>
        </div>

        {error && <Alert message={error} type="error" showIcon style={{ marginBottom:20, borderRadius:8 }} />}

        <Form form={form} onFinish={onFinish} layout="vertical" size="large">
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="firstName" label="First Name" rules={[{ required:true, message:'Required' }]}>
                <Input prefix={<UserOutlined style={{ color:'#4f6272' }} />} placeholder="John"
                  style={{ background:'#060e1a', borderColor:'#1a2d45', height:44 }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="lastName" label="Last Name" rules={[{ required:true, message:'Required' }]}>
                <Input placeholder="Doe" style={{ background:'#060e1a', borderColor:'#1a2d45', height:44 }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="email" label="Email Address" rules={[{ required:true },{ type:'email', message:'Enter a valid email' }]}>
            <Input prefix={<MailOutlined style={{ color:'#4f6272' }} />} placeholder="you@example.com"
              style={{ background:'#060e1a', borderColor:'#1a2d45', height:44 }} />
          </Form.Item>

          <Row gutter={12}>
            <Col span={14}>
              <Form.Item name="phone" label="Phone (optional)">
                <Input prefix={<PhoneOutlined style={{ color:'#4f6272' }} />} placeholder="555-123-4567"
                  style={{ background:'#060e1a', borderColor:'#1a2d45', height:44 }} />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="dateOfBirth" label="Date of Birth">
                <DatePicker style={{ width:'100%', background:'#060e1a', borderColor:'#1a2d45', height:44 }}
                  disabledDate={d => d && d > dayjs().subtract(18,'years')} placeholder="MM/DD/YYYY" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="password" label="Password" rules={[{ required:true },{ min:8, message:'Minimum 8 characters' }]}>
            <Input.Password prefix={<LockOutlined style={{ color:'#4f6272' }} />} placeholder="Min. 8 characters"
              style={{ background:'#060e1a', borderColor:'#1a2d45', height:44 }} />
          </Form.Item>

          <Form.Item name="confirmPassword" label="Confirm Password" dependencies={['password']}
            rules={[
              { required:true, message:'Please confirm your password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) return Promise.resolve();
                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]}>
            <Input.Password prefix={<LockOutlined style={{ color:'#4f6272' }} />} placeholder="Repeat password"
              style={{ background:'#060e1a', borderColor:'#1a2d45', height:44 }} />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={loading} block style={{
            height:48, fontWeight:700, fontSize:15, borderRadius:10, marginTop:4,
            background:'linear-gradient(135deg, #3b82f6, #1d4ed8)', border:'none',
            boxShadow:'0 6px 20px rgba(59,130,246,0.4)',
          }}>
            Create Account
          </Button>
        </Form>

        <div style={{ textAlign:'center', marginTop:20 }}>
          <Text style={{ color:'#4f6272', fontSize:13 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color:'#3b82f6', fontWeight:600 }}>Sign in</Link>
          </Text>
        </div>
      </div>

      <style>{`
        @media (min-width: 900px) { .login-left-panel { display: flex !important; } }
      `}</style>
    </div>
  );
}
