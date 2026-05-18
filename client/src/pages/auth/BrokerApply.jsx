import { useState } from 'react';
import { Form, Input, Button, Typography, Alert, Result } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, PhoneOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import axios from 'axios';

const { Title, Text } = Typography;
const API = import.meta.env.VITE_API_URL || '/api';

export default function BrokerApply() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const onFinish = async (values) => {
    setLoading(true); setError('');
    try {
      const payload = { ...values };
      delete payload.confirmPassword;
      await axios.post(`${API}/auth/broker-apply`, payload, { withCredentials: true });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Application failed. Please try again.');
    } finally { setLoading(false); }
  };

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f7fa' }}>
        <Result
          icon={<CheckCircleOutlined style={{ color: '#1d4ed8' }} />}
          title="Application Submitted!"
          subTitle="Your broker application is under review. You'll receive an email once it's approved — usually within 1–2 business days."
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

        <div style={{ marginBottom: 24 }}>
          <Title level={3} style={{ color: '#111827', margin: 0, fontWeight: 700 }}>Broker Application</Title>
          <Text style={{ color: '#6b7280' }}>Fill in your details — our team will review and get back to you</Text>
        </div>

        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 20, borderRadius: 8 }} closable onClose={() => setError('')} />}

        <Form form={form} onFinish={onFinish} layout="vertical" size="large">
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
      </div>

      <style>{`@media (min-width: 900px) { .login-left-panel { display: flex !important; } }`}</style>
    </div>
  );
}
