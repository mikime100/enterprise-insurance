import { useState } from 'react';
import { Form, Input, Button, Typography, Alert, Steps, Row, Col } from 'antd';
import {
  UserOutlined, LockOutlined, MailOutlined, PhoneOutlined,
  SafetyOutlined, AlertOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const { Title, Text } = Typography;
const API = import.meta.env.VITE_API_URL || '/api';

const BENEFITS = [
  { icon: <SafetyOutlined />, text: 'Instant digital policy management' },
  { icon: <AlertOutlined />, text: 'Real-time claim tracking & updates' },
  { icon: <CheckCircleOutlined />, text: '24/7 dedicated support' },
];

export default function Register() {
  const [form] = Form.useForm();
  const [step, setStep] = useState(0); // 0 = form, 1 = verify OTP
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const navigate = useNavigate();

  const onRegister = async (values) => {
    setLoading(true); setError('');
    try {
      const payload = { ...values };
      delete payload.confirmPassword;
      await axios.post(`${API}/auth/register`, payload, { withCredentials: true });
      setEmail(values.email);
      setStep(1);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally { setLoading(false); }
  };

  const onVerify = async () => {
    if (!otp || otp.length !== 6) { setError('Enter the 6-digit code from your email'); return; }
    setLoading(true); setError('');
    try {
      await axios.post(`${API}/auth/verify-email`, { email, otp }, { withCredentials: true });
      navigate('/insured/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired code');
    } finally { setLoading(false); }
  };

  const onResend = async () => {
    try {
      await axios.post(`${API}/auth/resend-otp`, { email }, { withCredentials: true });
      setResendCooldown(60);
      const t = setInterval(() => setResendCooldown(c => { if (c <= 1) { clearInterval(t); return 0; } return c - 1; }), 1000);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not resend code');
    }
  };

  const panelStyle = {
    flex: 1, display: 'none', flexDirection: 'column', justifyContent: 'center',
    padding: '60px 64px', position: 'relative', overflow: 'hidden',
    background: 'linear-gradient(160deg, #0a1628 0%, #0d2040 50%, #1a3465 100%)',
    borderRight: '1px solid #1e3a6e',
  };

  return (
    <div style={{ height: '100vh', display: 'flex', background: '#ffffff', overflow: 'hidden' }}>
      {/* Left panel */}
      <div className="login-left-panel" style={panelStyle}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.05, backgroundImage: 'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 56 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 22, color: '#fff', flexShrink: 0 }}>E</div>
            <div>
              <div style={{ color: '#fff', fontSize: 20, fontWeight: 800 }}>Enterprise Insurance</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Management Platform</div>
            </div>
          </div>
          <Title level={2} style={{ color: '#fff', fontWeight: 800, fontSize: 32, marginBottom: 12 }}>
            Start Your Coverage<br/><span style={{ color: '#93c5fd' }}>Journey Today</span>
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, display: 'block', marginBottom: 48, lineHeight: 1.7 }}>
            Join thousands of customers who trust Enterprise Insurance.
          </Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {BENEFITS.map((b, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#93c5fd', fontSize: 16 }}>{b.icon}</div>
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14 }}>{b.text}</Text>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div style={{ width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', padding: '32px 40px', overflowY: 'auto', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, color: '#fff', flexShrink: 0 }}>E</div>
          <div>
            <div style={{ color: '#111827', fontSize: 14, fontWeight: 700 }}>Enterprise Insurance</div>
            <div style={{ color: '#6b7280', fontSize: 11 }}>Management Platform</div>
          </div>
        </div>

        <Steps current={step} size="small" style={{ marginBottom: 28 }} items={[{ title: 'Your Details' }, { title: 'Verify Email' }]} />

        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 20, borderRadius: 8 }} closable onClose={() => setError('')} />}

        {/* Step 0 — Registration form */}
        {step === 0 && (
          <>
            <div style={{ marginBottom: 24 }}>
              <Title level={3} style={{ color: '#111827', margin: 0, fontWeight: 700 }}>Create your account</Title>
              <Text style={{ color: '#6b7280' }}>Get covered in minutes — no paperwork</Text>
            </div>
            <Form form={form} onFinish={onRegister} layout="vertical" size="large">
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="firstName" label="First Name" rules={[{ required: true, message: 'Required' }]}>
                    <Input prefix={<UserOutlined style={{ color: '#9ca3af' }} />} placeholder="John" style={{ borderColor: '#e8edf3', height: 44 }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="lastName" label="Last Name" rules={[{ required: true, message: 'Required' }]}>
                    <Input placeholder="Doe" style={{ borderColor: '#e8edf3', height: 44 }} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="email" label="Email Address" rules={[{ required: true }, { type: 'email', message: 'Enter a valid email' }]}>
                <Input prefix={<MailOutlined style={{ color: '#9ca3af' }} />} placeholder="you@example.com" style={{ borderColor: '#e8edf3', height: 44 }} />
              </Form.Item>
              <Form.Item name="phone" label="Phone (optional)">
                <Input prefix={<PhoneOutlined style={{ color: '#9ca3af' }} />} placeholder="+251 91 000 0000" style={{ borderColor: '#e8edf3', height: 44 }} />
              </Form.Item>
              <Form.Item name="password" label="Password" rules={[{ required: true }, { min: 8, message: 'Minimum 8 characters' }]}>
                <Input.Password prefix={<LockOutlined style={{ color: '#9ca3af' }} />} placeholder="Min. 8 characters" style={{ borderColor: '#e8edf3', height: 44 }} />
              </Form.Item>
              <Form.Item name="confirmPassword" label="Confirm Password" dependencies={['password']}
                rules={[{ required: true, message: 'Please confirm your password' },
                  ({ getFieldValue }) => ({ validator(_, v) { return !v || getFieldValue('password') === v ? Promise.resolve() : Promise.reject(new Error('Passwords do not match')); } })
                ]}>
                <Input.Password prefix={<LockOutlined style={{ color: '#9ca3af' }} />} placeholder="Repeat password" style={{ borderColor: '#e8edf3', height: 44 }} />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block style={{ height: 48, fontWeight: 700, fontSize: 15, borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#1e40af)', border: 'none' }}>
                Create Account
              </Button>
            </Form>
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Text style={{ color: '#6b7280', fontSize: 13 }}>
                Already have an account? <Link to="/login" style={{ color: '#1d4ed8', fontWeight: 600 }}>Sign in</Link>
              </Text>
            </div>
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <Text style={{ color: '#6b7280', fontSize: 13 }}>
                Are you a broker? <Link to="/broker-apply" style={{ color: '#1d4ed8', fontWeight: 600 }}>Apply here</Link>
              </Text>
            </div>
          </>
        )}

        {/* Step 1 — OTP verification */}
        {step === 1 && (
          <>
            <div style={{ marginBottom: 24 }}>
              <Title level={3} style={{ color: '#111827', margin: 0, fontWeight: 700 }}>Check your email</Title>
              <Text style={{ color: '#6b7280' }}>We sent a 6-digit code to <strong>{email}</strong></Text>
            </div>
            <div style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 13, color: '#374151', display: 'block', marginBottom: 8 }}>Verification Code</Text>
              <Input
                size="large"
                maxLength={6}
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                style={{ fontSize: 28, fontWeight: 800, letterSpacing: 12, textAlign: 'center', height: 60, borderColor: '#e8edf3' }}
                onPressEnter={onVerify}
              />
            </div>
            <Button type="primary" onClick={onVerify} loading={loading} block style={{ height: 48, fontWeight: 700, fontSize: 15, borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#1e40af)', border: 'none', marginBottom: 12 }}>
              Verify & Continue
            </Button>
            <div style={{ textAlign: 'center' }}>
              <Button type="link" onClick={onResend} disabled={resendCooldown > 0} style={{ color: resendCooldown > 0 ? '#9ca3af' : '#1d4ed8', fontSize: 13 }}>
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Didn't receive it? Resend code"}
              </Button>
            </div>
          </>
        )}
      </div>

      <style>{`@media (min-width: 900px) { .login-left-panel { display: flex !important; } }`}</style>
    </div>
  );
}
