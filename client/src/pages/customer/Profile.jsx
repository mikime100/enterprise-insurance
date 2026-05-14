import { useState } from 'react';
import {
  Card, Form, Input, Button, Typography, Row, Col, Divider,
  Avatar, message, Space, Tag,
} from 'antd';
import {
  UserOutlined, MailOutlined, PhoneOutlined, LockOutlined,
  SaveOutlined, HomeOutlined, EditOutlined, SecurityScanOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api';

const { Title, Text } = Typography;

const S = { card:{ background:'#0d1a2d', border:'1px solid #1a2d45', borderRadius:12 } };

const ROLE_CONFIG = {
  customer: { color:'#3b82f6', label:'Customer' },
  agent:    { color:'#8b5cf6', label:'Agent' },
  admin:    { color:'#ec4899', label:'Admin' },
};

export default function CustomerProfile() {
  const { user, refreshUser } = useAuth();
  const [profileForm]   = Form.useForm();
  const [passwordForm]  = Form.useForm();
  const [savingProfile, setSavingProfile]   = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);

  const handleSaveProfile = async (values) => {
    setSavingProfile(true);
    try {
      await api.put(`/users/${user._id}`, values);
      await refreshUser();
      message.success('Profile updated successfully');
      setEditingProfile(false);
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to update profile');
    } finally { setSavingProfile(false); }
  };

  const handleChangePassword = async (values) => {
    setSavingPassword(true);
    try {
      await api.patch(`/users/${user._id}/password`, {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      message.success('Password changed successfully');
      passwordForm.resetFields();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to change password');
    } finally { setSavingPassword(false); }
  };

  const roleCfg = ROLE_CONFIG[user?.role] || ROLE_CONFIG.customer;

  return (
    <div>
      <Title level={4} style={{ color:'#e2e8f0', marginBottom:24 }}>Account Settings</Title>

      <Row gutter={[24, 24]}>
        {/* Profile card */}
        <Col xs={24} lg={8}>
          <Card style={S.card} styles={{ body:{ padding:28 } }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ position:'relative', display:'inline-block', marginBottom:16 }}>
                <Avatar size={88} style={{ background:'linear-gradient(135deg, #3b82f6, #1d4ed8)', fontSize:30, fontWeight:800, boxShadow:'0 8px 24px rgba(59,130,246,0.35)' }}>
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </Avatar>
              </div>
              <Title level={5} style={{ color:'#e2e8f0', margin:0, fontWeight:800 }}>
                {user?.firstName} {user?.lastName}
              </Title>
              <Text style={{ color:'#4f6272', display:'block', marginTop:4 }}>{user?.email}</Text>
              <div style={{ marginTop:12 }}>
                <Tag style={{ background:`${roleCfg.color}18`, color:roleCfg.color, border:`1px solid ${roleCfg.color}33`, fontWeight:700, fontSize:12, padding:'4px 14px', borderRadius:20, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                  {roleCfg.label}
                </Tag>
              </div>
            </div>

            <Divider style={{ borderColor:'#1a2d45', margin:'20px 0' }} />

            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {[
                { icon:<MailOutlined />, label:'Email', value:user?.email },
                { icon:<PhoneOutlined />, label:'Phone', value:user?.phone || 'Not set' },
                { icon:<HomeOutlined />, label:'City', value:user?.address?.city ? `${user.address.city}, ${user.address.state}` : 'Not set' },
              ].map(item => (
                <div key={item.label} style={{ display:'flex', gap:10, alignItems:'center' }}>
                  <div style={{ width:32, height:32, borderRadius:8, background:'#1a2d45', display:'flex', alignItems:'center', justifyContent:'center', color:'#4f6272', fontSize:14, flexShrink:0 }}>
                    {item.icon}
                  </div>
                  <div>
                    <div style={{ color:'#4f6272', fontSize:10, textTransform:'uppercase', letterSpacing:'0.06em' }}>{item.label}</div>
                    <div style={{ color:'#e2e8f0', fontSize:13, fontWeight:500 }}>{item.value}</div>
                  </div>
                </div>
              ))}
            </div>

            {user?.assignedAgent && (
              <>
                <Divider style={{ borderColor:'#1a2d45', margin:'20px 0' }} />
                <div>
                  <Text style={{ color:'#4f6272', fontSize:11, textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:10 }}>Your Assigned Agent</Text>
                  <div style={{ display:'flex', gap:10, alignItems:'center', background:'#060e1a', borderRadius:10, padding:'12px 14px', border:'1px solid #1a2d45' }}>
                    <Avatar size={36} style={{ background:'#8b5cf618', color:'#8b5cf6', fontWeight:700 }}>
                      {user.assignedAgent.firstName?.[0]}{user.assignedAgent.lastName?.[0]}
                    </Avatar>
                    <div>
                      <Text style={{ color:'#e2e8f0', fontWeight:600, fontSize:13 }}>
                        {user.assignedAgent.firstName} {user.assignedAgent.lastName}
                      </Text>
                      <div style={{ color:'#4f6272', fontSize:11 }}>{user.assignedAgent.email}</div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          {/* Personal info form */}
          <Card style={{ ...S.card, marginBottom:20 }}
            styles={{ header:{ borderBottom:'1px solid #1a2d45' } }}
            title={<Text style={{ color:'#e2e8f0', fontWeight:700 }}>Personal Information</Text>}
            extra={
              !editingProfile && (
                <Button size="small" icon={<EditOutlined />} onClick={() => setEditingProfile(true)}
                  style={{ background:'#122036', border:'1px solid #1a2d45', color:'#8b9ab0' }}>
                  Edit
                </Button>
              )
            }>
            <Form
              form={profileForm}
              layout="vertical"
              initialValues={{ firstName:user?.firstName, lastName:user?.lastName, phone:user?.phone, address:user?.address }}
              onFinish={handleSaveProfile}
            >
              <Row gutter={12}>
                <Col xs={24} sm={12}>
                  <Form.Item name="firstName" label="First Name" rules={[{ required:true }]}>
                    <Input prefix={<UserOutlined style={{ color:'#4f6272' }} />} disabled={!editingProfile}
                      style={{ background:'#060e1a', borderColor:'#1a2d45' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="lastName" label="Last Name" rules={[{ required:true }]}>
                    <Input disabled={!editingProfile} style={{ background:'#060e1a', borderColor:'#1a2d45' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="phone" label="Phone Number">
                <Input prefix={<PhoneOutlined style={{ color:'#4f6272' }} />} placeholder="555-123-4567"
                  disabled={!editingProfile} style={{ background:'#060e1a', borderColor:'#1a2d45' }} />
              </Form.Item>

              <Form.Item label="Address">
                <Row gutter={[8, 8]}>
                  <Col span={24}>
                    <Form.Item name={['address','street']} noStyle>
                      <Input placeholder="Street address" disabled={!editingProfile}
                        prefix={<HomeOutlined style={{ color:'#4f6272' }} />}
                        style={{ background:'#060e1a', borderColor:'#1a2d45' }} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name={['address','city']} noStyle>
                      <Input placeholder="City" disabled={!editingProfile}
                        style={{ background:'#060e1a', borderColor:'#1a2d45' }} />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item name={['address','state']} noStyle>
                      <Input placeholder="State" disabled={!editingProfile}
                        style={{ background:'#060e1a', borderColor:'#1a2d45' }} />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item name={['address','zip']} noStyle>
                      <Input placeholder="ZIP" disabled={!editingProfile}
                        style={{ background:'#060e1a', borderColor:'#1a2d45' }} />
                    </Form.Item>
                  </Col>
                </Row>
              </Form.Item>

              {editingProfile && (
                <Space>
                  <Button type="primary" htmlType="submit" loading={savingProfile} icon={<SaveOutlined />}>
                    Save Changes
                  </Button>
                  <Button onClick={() => { setEditingProfile(false); profileForm.resetFields(); }}
                    style={{ background:'#060e1a', border:'1px solid #1a2d45', color:'#8b9ab0' }}>
                    Cancel
                  </Button>
                </Space>
              )}
            </Form>
          </Card>

          {/* Change password */}
          <Card style={S.card} styles={{ header:{ borderBottom:'1px solid #1a2d45' } }}
            title={<Text style={{ color:'#e2e8f0', fontWeight:700 }}>Change Password</Text>}>
            <Form form={passwordForm} layout="vertical" onFinish={handleChangePassword}>
              <Form.Item name="currentPassword" label="Current Password" rules={[{ required:true }]}>
                <Input.Password prefix={<LockOutlined style={{ color:'#4f6272' }} />}
                  style={{ background:'#060e1a', borderColor:'#1a2d45' }} />
              </Form.Item>
              <Row gutter={12}>
                <Col xs={24} sm={12}>
                  <Form.Item name="newPassword" label="New Password" rules={[{ required:true },{ min:8, message:'Min. 8 characters' }]}>
                    <Input.Password prefix={<LockOutlined style={{ color:'#4f6272' }} />}
                      style={{ background:'#060e1a', borderColor:'#1a2d45' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="confirmPassword" label="Confirm New Password" dependencies={['newPassword']}
                    rules={[
                      { required:true },
                      ({ getFieldValue }) => ({
                        validator(_, v) {
                          if (!v || getFieldValue('newPassword') === v) return Promise.resolve();
                          return Promise.reject(new Error('Passwords do not match'));
                        },
                      }),
                    ]}>
                    <Input.Password prefix={<LockOutlined style={{ color:'#4f6272' }} />}
                      style={{ background:'#060e1a', borderColor:'#1a2d45' }} />
                  </Form.Item>
                </Col>
              </Row>
              <Button type="primary" htmlType="submit" loading={savingPassword} icon={<SaveOutlined />}>
                Update Password
              </Button>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
