import { useState } from 'react';
import { Input, Button, Typography, Alert } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

const { Title, Text } = Typography;
const API = import.meta.env.VITE_API_URL || '/api';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const onVerify = async () => {
    if (!email) { setError('Enter your email address'); return; }
    if (!otp || otp.length !== 6) { setError('Enter the 6-digit code from your email'); return; }
    setLoading(true); setError('');
    try {
      await axios.post(`${API}/auth/verify-email`, { email, otp }, { withCredentials: true });
      await refreshUser();
      navigate('/insured/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired code');
    } finally { setLoading(false); }
  };

  const onResend = async () => {
    if (!email) { setError('Enter your email address first'); return; }
    setResendLoading(true);
    try {
      await axios.post(`${API}/auth/resend-otp`, { email }, { withCredentials: true });
      setResendCooldown(60);
      const t = setInterval(() => setResendCooldown(c => { if (c <= 1) { clearInterval(t); return 0; } return c - 1; }), 1000);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not resend code');
    } finally { setResendLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f7fa' }}>
      <div style={{ width: '100%', maxWidth: 440, padding: '40px', background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #e8edf3' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(29,78,216,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MailOutlined style={{ fontSize: 26, color: '#1d4ed8' }} />
          </div>
        </div>

        <Title level={3} style={{ color: '#111827', textAlign: 'center', margin: 0, fontWeight: 700 }}>Verify Your Email</Title>
        <Text style={{ color: '#6b7280', display: 'block', textAlign: 'center', marginBottom: 28, marginTop: 8 }}>
          Enter the 6-digit code we sent to your email
        </Text>

        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16, borderRadius: 8 }} closable onClose={() => setError('')} />}

        <div style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 13, color: '#374151', display: 'block', marginBottom: 6 }}>Email Address</Text>
          <Input
            size="large"
            prefix={<MailOutlined style={{ color: '#9ca3af' }} />}
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{ borderColor: '#e8edf3', height: 44 }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 13, color: '#374151', display: 'block', marginBottom: 6 }}>Verification Code</Text>
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

        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <Button type="link" onClick={onResend} loading={resendLoading} disabled={resendCooldown > 0} style={{ color: resendCooldown > 0 ? '#9ca3af' : '#1d4ed8', fontSize: 13 }}>
            {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Didn't receive it? Resend code"}
          </Button>
        </div>

        <div style={{ textAlign: 'center' }}>
          <Text style={{ color: '#6b7280', fontSize: 13 }}>
            <Link to="/login" style={{ color: '#1d4ed8', fontWeight: 600 }}>Back to Sign In</Link>
          </Text>
        </div>
      </div>
    </div>
  );
}
