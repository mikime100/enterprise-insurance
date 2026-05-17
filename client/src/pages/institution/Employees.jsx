import { useEffect, useState } from 'react';
import { Card, Table, Tag, Typography, Space, Spin, Avatar, Modal, Button, Form, Input, Select, Upload, message, Tabs, Alert } from 'antd';
import { UserAddOutlined, UploadOutlined, InboxOutlined } from '@ant-design/icons';
import api from '../../api';

const { Title, Text } = Typography;
const { Dragger } = Upload;

export default function InstitutionEmployees() {
  const [employees, setEmployees] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [csvResult, setCsvResult] = useState(null);
  const [form] = Form.useForm();

  const loadEmployees = () => {
    setLoading(true);
    api.get('/institution/employees')
      .then(r => setEmployees(Array.isArray(r.data.employees) ? r.data.employees : []))
      .catch(err => console.error('Employees load failed:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadEmployees();
    api.get('/institution/tiers')
      .then(r => setTiers(Array.isArray(r.data.tiers) ? r.data.tiers : []))
      .catch(() => {});
  }, []);

  const onInvite = async (values) => {
    setInviteLoading(true);
    try {
      await api.post('/institution/employees/invite', values);
      message.success(`Invitation sent to ${values.email}`);
      form.resetFields();
      setInviteOpen(false);
      loadEmployees();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to send invitation');
    } finally { setInviteLoading(false); }
  };

  const csvUploadProps = {
    name: 'file',
    accept: '.csv',
    showUploadList: false,
    customRequest: async ({ file, onSuccess, onError }) => {
      setCsvResult(null);
      const fd = new FormData();
      fd.append('file', file);
      if (form.getFieldValue('tierId_csv')) fd.append('tierId', form.getFieldValue('tierId_csv'));
      try {
        const res = await api.post('/institution/employees/invite-csv', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setCsvResult(res.data);
        message.success(res.data.message);
        onSuccess(res.data, file);
        loadEmployees();
      } catch (err) {
        message.error(err.response?.data?.message || 'CSV upload failed');
        onError(err);
      }
    },
  };

  const columns = [
    {
      title: 'Employee', key: 'name',
      render: (_, r) => (
        <Space>
          <Avatar size={32} style={{ background: '#3b82f6', fontSize: 12 }}>{r.firstName?.[0]}{r.lastName?.[0]}</Avatar>
          <div>
            <div style={{ fontWeight: 600 }}>{r.firstName} {r.lastName}</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>{r.email}</div>
          </div>
        </Space>
      )
    },
    { title: 'Phone', dataIndex: 'phone', key: 'phone', render: v => v || '—' },
    { title: 'Status', dataIndex: 'isActive', key: 'status', render: v => <Tag color={v ? 'green' : 'orange'}>{v ? 'Active' : 'Inactive'}</Tag> },
    {
      title: 'Password', dataIndex: 'mustChangePassword', key: 'pwd',
      render: v => v ? <Tag color="orange">Temp — must change</Tag> : <Tag color="green">Set</Tag>
    },
  ];

  const inviteFormContent = (
    <Form form={form} layout="vertical" onFinish={onInvite} size="large">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Form.Item name="firstName" label="First Name" rules={[{ required: true, message: 'Required' }]} style={{ marginBottom: 12 }}>
          <Input placeholder="First name" style={{ borderColor: '#e8edf3' }} />
        </Form.Item>
        <Form.Item name="lastName" label="Last Name" rules={[{ required: true, message: 'Required' }]} style={{ marginBottom: 12 }}>
          <Input placeholder="Last name" style={{ borderColor: '#e8edf3' }} />
        </Form.Item>
      </div>
      <Form.Item name="email" label="Email" rules={[{ required: true }, { type: 'email' }]} style={{ marginBottom: 12 }}>
        <Input placeholder="employee@company.com" style={{ borderColor: '#e8edf3' }} />
      </Form.Item>
      <Form.Item name="phone" label="Phone (optional)" style={{ marginBottom: 12 }}>
        <Input placeholder="+251 91 000 0000" style={{ borderColor: '#e8edf3' }} />
      </Form.Item>
      {tiers.length > 0 && (
        <Form.Item name="tierId" label="Coverage Tier (optional)" style={{ marginBottom: 16 }}>
          <Select placeholder="Auto-enroll in a tier" allowClear style={{ borderColor: '#e8edf3' }}>
            {tiers.map(t => (
              <Select.Option key={t._id} value={t._id}>{t.name} — {t.product?.name}</Select.Option>
            ))}
          </Select>
        </Form.Item>
      )}
    </Form>
  );

  const csvTabContent = (
    <div>
      {tiers.length > 0 && (
        <Form.Item name="tierId_csv" label="Coverage Tier (optional — applied to all uploaded employees)" style={{ marginBottom: 16 }}>
          <Select placeholder="Select tier" allowClear style={{ width: '100%', borderColor: '#e8edf3' }} size="large">
            {tiers.map(t => (
              <Select.Option key={t._id} value={t._id}>{t.name} — {t.product?.name}</Select.Option>
            ))}
          </Select>
        </Form.Item>
      )}
      <Dragger {...csvUploadProps} style={{ borderRadius: 10, borderColor: '#bfdbfe', background: '#eff6ff' }}>
        <p className="ant-upload-drag-icon"><InboxOutlined style={{ color: '#1d4ed8', fontSize: 36 }} /></p>
        <p style={{ color: '#111827', fontWeight: 600, margin: '4px 0' }}>Drag & drop a CSV file here</p>
        <p style={{ color: '#6b7280', fontSize: 13 }}>or click to browse · Required columns: firstName, lastName, email · Optional: phone</p>
      </Dragger>
      {csvResult && (
        <div style={{ marginTop: 16 }}>
          <Alert
            type={csvResult.results?.some(r => r.status === 'invited') ? 'success' : 'warning'}
            message={csvResult.message}
            description={
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                {csvResult.results?.filter(r => r.status === 'skipped').map((r, i) => (
                  <li key={i} style={{ color: '#b45309', fontSize: 12 }}>{r.email}: {r.reason}</li>
                ))}
              </ul>
            }
            showIcon
          />
        </div>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#111827' }}>Employees ({employees.length})</Title>
          <Text style={{ color: '#6b7280', fontSize: 14 }}>Manage your organization's insured employees</Text>
        </div>
        <Button type="primary" icon={<UserAddOutlined />} onClick={() => setInviteOpen(true)} style={{ background: '#1d4ed8', border: 'none', borderRadius: 8 }}>
          Invite Employee
        </Button>
      </div>

      <Card style={{ borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>
        ) : (
          <Table
            dataSource={employees}
            columns={columns}
            rowKey="_id"
            pagination={{ pageSize: 12 }}
            locale={{ emptyText: 'No employees yet — invite your first employee using the button above.' }}
          />
        )}
      </Card>

      <Modal
        title="Invite Employee"
        open={inviteOpen}
        onCancel={() => { setInviteOpen(false); form.resetFields(); setCsvResult(null); }}
        width={580}
        footer={null}
      >
        <Tabs
          defaultActiveKey="single"
          items={[
            {
              key: 'single',
              label: 'Single Invite',
              children: (
                <div>
                  {inviteFormContent}
                  <Button
                    type="primary"
                    loading={inviteLoading}
                    onClick={() => form.submit()}
                    block
                    style={{ height: 44, fontWeight: 700, borderRadius: 8, background: '#1d4ed8', border: 'none', marginTop: 4 }}
                  >
                    Send Invitation
                  </Button>
                </div>
              )
            },
            {
              key: 'csv',
              label: 'Bulk CSV Upload',
              children: (
                <Form form={form} layout="vertical">
                  {csvTabContent}
                </Form>
              )
            }
          ]}
        />
      </Modal>
    </div>
  );
}
