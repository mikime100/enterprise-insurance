import { useState } from 'react';
import { Form, Input, Button, Typography, Alert, Steps, Result } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, PhoneOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import axios from 'axios';

const { Title, Text } = Typography;
const API = import.meta.env.VITE_API_URL || '/api';

export default function BrokerApply() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(0); // 0=form, 1=verify-otp, 2=pending-approval
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const onSubmit = async (values) => {
    setLoading(true); setError('');
    try {
      const payload = { ...values };
      delete payload.confirmPassword;
      await axios.post(`${API}/auth/broker-apply`, payload, { withCredentials: true });
      setEmail(values.email);
      setStep(1);
    } catch (err) {
      setError(err.response?.data?.message || 'Application failed. Please try again.');
    } finally { setLoading(false); }
  };

  const onVerify = async () => {
    if (!otp || otp.length !== 6) { setError('Enter the 6-digit code from your email'); return; }
    setLoading(true); setError('');
    try {
      await axios.post(`${API}/auth/verify-email`, { email, otp }, { withCredentials: true });
      setStep(2);
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

  if (step === 2) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f7fa' }}>
        <Result
          icon={<ClockCircleOutlined style={{ color: '#1d4ed8', fontSize: 56 }} />}
          title="Email Verified — Application Under Review"
          subTitle="Your email has been confirmed. Our team will review your broker application and notify you by email once approved — usually within 1–2 business days."
          extra={<Link to="/login"><Button type="primary" style={{ background: '#1d4ed8', border: 'none', borderRadius: 8 }}>Back to Login</Button></Link>}
        />
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', background: '#ffffff', overflow: 'hidden' }}>
      {/* Left panel */}
      <div className="login-left-panel" style={{
        flex: 1, display: 'none', flexDirection: 'column', justifyContent: 'center',
        padding: '60px 64px', position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(160deg, #0a1628 0%, #0d2040 50%, #1a3465 100%)',
        borderRight: '1px solid #1e3a6e',
      }}>
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
            Become a<br /><span style={{ color: '#93c5fd' }}>Sales Broker</span>
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, display: 'block', marginBottom: 48, lineHeight: 1.7 }}>
            Partner with Enterprise Insurance to offer coverage to your clients and earn commissions.
          </Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {['Competitive commission structure', 'Digital tools to manage your clients', 'Dedicated broker support team'].map((text, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#93c5fd', fontSize: 16, flexShrink: 0 }}>✓</div>
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14 }}>{text}</Text>
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

        <Steps current={step} size="small" style={{ marginBottom: 24 }} items={[{ title: 'Your Details' }, { title: 'Verify Email' }]} />

        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16, borderRadius: 8 }} closable onClose={() => setError('')} />}

        {/* Step 0 — Application form */}
        {step === 0 && (
          <>
            <div style={{ marginBottom: 20 }}>
              <Title level={3} style={{ color: '#111827', margin: 0, fontWeight: 700 }}>Broker Application</Title>
              <Text style={{ color: '#6b7280' }}>Fill in your details — our team will review and approve your account</Text>
            </div>
            <Form form={form} onFinish={onSubmit} layout="vertical" size="large">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Form.Item name="firstName" label="First Name" rules={[{ required: true, message: 'Required' }]} style={{ marginBottom: 12 }}>
                  <Input prefix={<UserOutlined style={{ color: '#9ca3af' }} />} placeholder="John" style={{ borderColor: '#e8edf3', height: 44 }} />
                </Form.Item>
                <Form.Item name="lastName" label="Last Name" rules={[{ required: true, message: 'Required' }]} style={{ marginBottom: 12 }}>
                  <Input placeholder="Doe" style={{ borderColor: '#e8edf3', height: 44 }} />
                </Form.Item>
              </div>
              <Form.Item name="email" label="Email Address" rules={[{ required: true }, { type: 'email', message: 'Enter a valid email' }]} style={{ marginBottom: 12 }}>
                <Input prefix={<MailOutlined style={{ color: '#9ca3af' }} />} placeholder="you@example.com" style={{ borderColor: '#e8edf3', height: 44 }} />
              </Form.Item>
              <Form.Item name="phone" label="Phone (optional)" style={{ marginBottom: 12 }}>
                <Input prefix={<PhoneOutlined style={{ color: '#9ca3af' }} />} placeholder="+251 91 000 0000" style={{ borderColor: '#e8edf3', height: 44 }} />
              </Form.Item>
              <Form.Item name="password" label="Password" rules={[{ required: true }, { min: 8, message: 'Minimum 8 characters' }]} style={{ marginBottom: 12 }}>
                <Input.Password prefix={<LockOutlined style={{ color: '#9ca3af' }} />} placeholder="Min. 8 characters" style={{ borderColor: '#e8edf3', height: 44 }} />
              </Form.Item>
              <Form.Item name="confirmPassword" label="Confirm Password" dependencies={['password']} style={{ marginBottom: 16 }}
                rules={[{ required: true, message: 'Please confirm your password' },
                  ({ getFieldValue }) => ({ validator(_, v) { return !v || getFieldValue('password') === v ? Promise.resolve() : Promise.reject(new Error('Passwords do not match')); } })
                ]}>
                <Input.Password prefix={<LockOutlined style={{ color: '#9ca3af' }} />} placeholder="Repeat password" style={{ borderColor: '#e8edf3', height: 44 }} />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block style={{ height: 48, fontWeight: 700, fontSize: 15, borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#1e40af)', border: 'none' }}>
                Submit Application
              </Button>
            </Form>
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Text style={{ color: '#6b7280', fontSize: 13 }}>
                Already have an account? <Link to="/login" style={{ color: '#1d4ed8', fontWeight: 600 }}>Sign in</Link>
              </Text>
            </div>
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <Text style={{ color: '#6b7280', fontSize: 13 }}>
                Looking for individual coverage? <Link to="/register" style={{ color: '#1d4ed8', fontWeight: 600 }}>Register here</Link>
              </Text>
            </div>
          </>
        )}

        {/* Step 1 — OTP verification */}
        {step === 1 && (
          <>
            <div style={{ marginBottom: 20 }}>
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
              Verify Email
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
