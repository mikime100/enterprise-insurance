import { useState } from 'react';
import { Form, Input, Button, Typography, Alert, Card, Result } from 'antd';
import { UserOutlined, MailOutlined, PhoneOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import api from '../../api';

const { Title, Text } = Typography;

export default function BrokerRegisterCustomer() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registered, setRegistered] = useState(null);

  const onFinish = async (values) => {
    setLoading(true); setError('');
    try {
      const res = await api.post('/broker/register-customer', values);
      setRegistered(res.data);
      form.resetFields();
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally { setLoading(false); }
  };

  if (registered) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#111827' }}>Register Customer</Title>
          <Text style={{ color: '#6b7280' }}>Add a new insurance customer to your portfolio</Text>
        </div>
        <Card style={{ borderRadius: 12, border: '1px solid #e5e7eb' }}>
          <Result
            icon={<CheckCircleOutlined style={{ color: '#10b981' }} />}
            title="Customer Registered!"
            subTitle={`${registered.user?.firstName} ${registered.user?.lastName} has been registered. A login invitation email has been sent to ${registered.user?.email} with their temporary password.`}
            extra={[
              <Button key="another" type="primary" onClick={() => setRegistered(null)} style={{ background: '#1d4ed8', border: 'none', borderRadius: 8 }}>
                Register Another
              </Button>,
              <Link key="list" to="/broker/customers">
                <Button style={{ borderRadius: 8 }}>View All Customers</Button>
              </Link>,
            ]}
          />
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#111827' }}>Register Customer</Title>
          <Text style={{ color: '#6b7280' }}>The customer will receive an email with a temporary login password</Text>
        </div>
        <Link to="/broker/customers">
          <Button style={{ borderRadius: 8 }}>← Back to Customers</Button>
        </Link>
      </div>

      <Card style={{ borderRadius: 12, border: '1px solid #e5e7eb', maxWidth: 560 }}>
        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 20, borderRadius: 8 }} closable onClose={() => setError('')} />}

        <Form form={form} onFinish={onFinish} layout="vertical" size="large">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="firstName" label="First Name" rules={[{ required: true, message: 'Required' }]} style={{ marginBottom: 12 }}>
              <Input prefix={<UserOutlined style={{ color: '#9ca3af' }} />} placeholder="First name" style={{ borderColor: '#e8edf3' }} />
            </Form.Item>
            <Form.Item name="lastName" label="Last Name" rules={[{ required: true, message: 'Required' }]} style={{ marginBottom: 12 }}>
              <Input placeholder="Last name" style={{ borderColor: '#e8edf3' }} />
            </Form.Item>
          </div>

          <Form.Item
            name="email"
            label="Email Address"
            rules={[{ required: true, message: 'Email is required' }, { type: 'email', message: 'Enter a valid email' }]}
            style={{ marginBottom: 12 }}
          >
            <Input prefix={<MailOutlined style={{ color: '#9ca3af' }} />} placeholder="customer@example.com" style={{ borderColor: '#e8edf3' }} />
          </Form.Item>

          <Form.Item name="phone" label="Phone (optional)" style={{ marginBottom: 20 }}>
            <Input prefix={<PhoneOutlined style={{ color: '#9ca3af' }} />} placeholder="+251 91 000 0000" style={{ borderColor: '#e8edf3' }} />
          </Form.Item>

          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '12px 14px', marginBottom: 20 }}>
            <Text style={{ color: '#1e40af', fontSize: 13 }}>
              A temporary password will be generated and emailed to the customer. They will be required to change it on their first login.
            </Text>
          </div>

          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            block
            style={{ height: 48, fontWeight: 700, fontSize: 15, borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#1e40af)', border: 'none' }}
          >
            Register & Send Invitation
          </Button>
        </Form>
      </Card>
    </div>
  );
}
