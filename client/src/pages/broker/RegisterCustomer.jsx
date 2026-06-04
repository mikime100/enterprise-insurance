import { useState } from 'react';
import { Form, Input, Button, Typography, Alert, Tabs, Upload, message } from 'antd';
import { UserAddOutlined, PlusOutlined, DeleteOutlined, InboxOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

const { Title, Text } = Typography;
const { Dragger } = Upload;

function SingleForm() {
  const [form]    = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const navigate  = useNavigate();

  const onSubmit = async (values) => {
    setLoading(true);
    try {
      await api.post('/broker/register-customer', values);
      message.success(`${values.firstName} registered — invitation sent to ${values.email}`);
      setDone(true);
      form.resetFields();
    } catch (err) {
      message.error(err.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: 520 }}>
      {done && (
        <Alert type="success" showIcon icon={<CheckCircleOutlined />}
          message="Customer registered successfully"
          description="A login invitation with a temporary password was emailed to them."
          closable onClose={() => setDone(false)}
          style={{ marginBottom: 20, borderRadius: 10 }}
          action={<Button size="small" onClick={() => navigate('/broker/customers')}>View Customers</Button>}
        />
      )}
      <Form form={form} layout="vertical" onFinish={onSubmit} size="large">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Form.Item name="firstName" label="First Name" rules={[{ required: true, message: 'Required' }]} style={{ marginBottom: 14 }}>
            <Input placeholder="Abebe" style={{ borderColor: '#e8edf3', borderRadius: 9, height: 44 }} />
          </Form.Item>
          <Form.Item name="lastName" label="Last Name" rules={[{ required: true, message: 'Required' }]} style={{ marginBottom: 14 }}>
            <Input placeholder="Girma" style={{ borderColor: '#e8edf3', borderRadius: 9, height: 44 }} />
          </Form.Item>
        </div>
        <Form.Item name="email" label="Email Address" rules={[{ required: true }, { type: 'email' }]} style={{ marginBottom: 14 }}>
          <Input placeholder="customer@email.com" style={{ borderColor: '#e8edf3', borderRadius: 9, height: 44 }} />
        </Form.Item>
        <Form.Item name="phone" label="Phone (optional)" style={{ marginBottom: 20 }}>
          <Input placeholder="+251 91 000 0000" style={{ borderColor: '#e8edf3', borderRadius: 9, height: 44 }} />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} icon={<UserAddOutlined />} block
          style={{ height: 46, fontWeight: 700, fontSize: 15, borderRadius: 10, background: '#1d4ed8', border: 'none' }}>
          Register Customer
        </Button>
      </Form>
    </div>
  );
}

function BulkForm() {
  const [rows, setRows]   = useState([{ id: 1, firstName: '', lastName: '', email: '', phone: '' }]);
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const navigate = useNavigate();

  const addRow    = () => setRows(r => [...r, { id: Date.now(), firstName: '', lastName: '', email: '', phone: '' }]);
  const removeRow = (id) => setRows(r => r.filter(row => row.id !== id));
  const updateRow = (id, field, value) => setRows(r => r.map(row => row.id === id ? { ...row, [field]: value } : row));
  const readyRows = rows.filter(r => r.firstName && r.lastName && r.email);

  const onSubmit = async () => {
    if (readyRows.length === 0) { message.warning('Add at least one complete row'); return; }
    setLoading(true); setResult(null);
    try {
      const res = await api.post('/broker/register-customers-bulk', { customers: readyRows });
      setResult(res.data);
      message.success(`${res.data.results?.filter(r => r.status === 'created').length || 0} customer(s) registered`);
    } catch (err) {
      message.error(err.response?.data?.message || 'Bulk registration failed');
    } finally { setLoading(false); }
  };

  const cellStyle = { borderColor: '#e8edf3', borderRadius: 7, height: 36, fontSize: 13 };

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px', minWidth: 560 }}>
          <thead>
            <tr>
              {['First Name *', 'Last Name *', 'Email *', 'Phone'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '0 6px 6px', color: '#6b7280', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
              ))}
              <th style={{ width: 36 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id}>
                {['firstName', 'lastName', 'email', 'phone'].map(f => (
                  <td key={f} style={{ padding: '0 4px' }}>
                    <Input value={row[f]} onChange={e => updateRow(row.id, f, e.target.value)}
                      placeholder={f === 'email' ? 'email@example.com' : f === 'phone' ? '+251...' : ''}
                      style={cellStyle} type={f === 'email' ? 'email' : 'text'} />
                  </td>
                ))}
                <td style={{ padding: '0 4px' }}>
                  {rows.length > 1 && (
                    <button onClick={() => removeRow(row.id)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 6, borderRadius: 6 }}>
                      <DeleteOutlined />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
        <button onClick={addRow} style={{ background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: 8, color: '#6b7280', padding: '8px 16px', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <PlusOutlined /> Add Row
        </button>
        <Button type="primary" loading={loading} onClick={onSubmit} icon={<UserAddOutlined />}
          style={{ height: 38, fontWeight: 700, borderRadius: 8, background: '#1d4ed8', border: 'none' }}>
          Register {readyRows.length} Customer{readyRows.length !== 1 ? 's' : ''}
        </Button>
      </div>
      {result && (
        <div style={{ marginTop: 16, background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb', padding: 16 }}>
          <div style={{ fontWeight: 700, color: '#111827', marginBottom: 10 }}>{result.message}</div>
          {result.results?.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 5 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: r.status === 'created' ? '#22c55e' : '#f59e0b', display: 'inline-block', flexShrink: 0 }} />
              <span>{r.name || r.email}</span>
              {r.status === 'skipped' && <span style={{ color: '#9ca3af', fontSize: 11 }}>— {r.reason}</span>}
            </div>
          ))}
          {result.results?.some(r => r.status === 'created') && (
            <button onClick={() => navigate('/broker/customers')}
              style={{ marginTop: 10, background: 'none', border: 'none', color: '#1d4ed8', fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: 0 }}>
              View all customers →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function CsvUpload() {
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);

  const parseAndSubmit = async (file) => {
    setLoading(true); setResult(null);
    try {
      const text = await file.text();
      const lines = text.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
      const customers = lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const obj = {};
        headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
        return {
          firstName: obj.firstname || obj['first name'] || obj.first_name || '',
          lastName:  obj.lastname  || obj['last name']  || obj.last_name  || '',
          email:     obj.email || '',
          phone:     obj.phone || '',
        };
      }).filter(c => c.email);

      const res = await api.post('/broker/register-customers-bulk', { customers });
      setResult(res.data);
      message.success(`${res.data.results?.filter(r => r.status === 'created').length || 0} customer(s) registered`);
    } catch (err) {
      message.error(err.response?.data?.message || 'Upload failed');
    } finally { setLoading(false); }
    return false;
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#0369a1' }}>
        <strong>Required columns:</strong> firstName, lastName, email &nbsp;·&nbsp; <strong>Optional:</strong> phone<br />
        First row must be the header row. Maximum 100 rows per upload.
      </div>
      <Dragger accept=".csv,text/csv" showUploadList={false} beforeUpload={parseAndSubmit} disabled={loading}
        style={{ borderRadius: 10, borderColor: '#bfdbfe', background: '#eff6ff' }}>
        <p className="ant-upload-drag-icon"><InboxOutlined style={{ color: '#1d4ed8', fontSize: 36 }} /></p>
        <p style={{ color: '#111827', fontWeight: 600, margin: '4px 0' }}>{loading ? 'Registering customers…' : 'Drag & drop a CSV file here'}</p>
        <p style={{ color: '#6b7280', fontSize: 13 }}>or click to browse</p>
      </Dragger>
      {result && (
        <div style={{ marginTop: 16, background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb', padding: 16 }}>
          <div style={{ fontWeight: 700, color: '#111827', marginBottom: 10 }}>{result.message}</div>
          <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
            {result.results?.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: r.status === 'created' ? '#22c55e' : '#f59e0b', display: 'inline-block', flexShrink: 0 }} />
                <span>{r.name || r.email}</span>
                {r.status === 'skipped' && <span style={{ color: '#9ca3af', fontSize: 11 }}>— {r.reason}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RegisterCustomer() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <Title level={3} style={{ margin: 0, color: '#111827' }}>Register Customers</Title>
        <Text style={{ color: '#6b7280' }}>Add one or many customers. Each receives an email invitation with temporary login credentials.</Text>
      </div>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <Tabs defaultActiveKey="single" style={{ padding: '0 24px' }} items={[
          { key: 'single', label: 'Single Customer', children: <div style={{ padding: '4px 0 24px' }}><SingleForm /></div> },
          { key: 'bulk',   label: 'Bulk Entry',      children: <div style={{ padding: '4px 0 24px' }}><BulkForm /></div> },
          { key: 'csv',    label: 'CSV Upload',      children: <div style={{ padding: '4px 0 24px' }}><CsvUpload /></div> },
        ]} />
      </div>
    </div>
  );
}
