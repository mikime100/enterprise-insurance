import { useState } from 'react';
import { Form, Input, Button, Typography, Alert } from 'antd';
import { LockOutlined, KeyOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api';

const { Title, Text } = Typography;

export default function ForceChangePassword() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const onFinish = async ({ newPassword }) => {
    setLoading(true); setError('');
    try {
      await api.post('/auth/set-password', { newPassword });
      const updated = await refreshUser();
      // Redirect to appropriate portal after password change
      const PAYER_ROLES = ['payer_admin', 'underwriter', 'claims_officer', 'finance_officer', 'customer_support'];
      const role = updated?.role || user?.role;
      if (role === 'superadmin') navigate('/admin/dashboard');
      else if (role === 'sales_broker') navigate('/broker/dashboard');
      else if (PAYER_ROLES.includes(role)) navigate('/payer/dashboard');
      else if (role === 'provider_admin') navigate('/provider/dashboard');
      else if (role === 'institution_admin') navigate('/institution/dashboard');
      else navigate('/insured/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update password. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f7fa' }}>
      <div style={{ width: '100%', maxWidth: 440, padding: '40px', background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #e8edf3' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(29,78,216,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <KeyOutlined style={{ fontSize: 26, color: '#1d4ed8' }} />
          </div>
        </div>

        <Title level={3} style={{ color: '#111827', textAlign: 'center', margin: 0, fontWeight: 700 }}>Set Your Password</Title>
        <Text style={{ color: '#6b7280', display: 'block', textAlign: 'center', marginBottom: 8, marginTop: 8 }}>
          {user?.firstName ? `Welcome, ${user.firstName}!` : 'Welcome!'} You must create a new password before continuing.
        </Text>
        <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 8, padding: '10px 14px', marginBottom: 24, textAlign: 'center' }}>
          <Text style={{ color: '#92400e', fontSize: 13 }}>Your account was created with a temporary password. Please set a permanent one.</Text>
        </div>

        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16, borderRadius: 8 }} closable onClose={() => setError('')} />}

        <Form form={form} onFinish={onFinish} layout="vertical" size="large">
          <Form.Item
            name="newPassword"
            label="New Password"
            rules={[{ required: true, message: 'Please enter a new password' }, { min: 8, message: 'Minimum 8 characters' }]}
            style={{ marginBottom: 12 }}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#9ca3af' }} />}
              placeholder="Min. 8 characters"
              style={{ borderColor: '#e8edf3', height: 44 }}
            />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="Confirm New Password"
            dependencies={['newPassword']}
            style={{ marginBottom: 20 }}
            rules={[
              { required: true, message: 'Please confirm your password' },
              ({ getFieldValue }) => ({
                validator(_, v) {
                  return !v || getFieldValue('newPassword') === v
                    ? Promise.resolve()
                    : Promise.reject(new Error('Passwords do not match'));
                }
              })
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#9ca3af' }} />}
              placeholder="Repeat your new password"
              style={{ borderColor: '#e8edf3', height: 44 }}
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block style={{ height: 48, fontWeight: 700, fontSize: 15, borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#1e40af)', border: 'none' }}>
            Set Password & Continue
          </Button>
        </Form>
      </div>
    </div>
  );
}
