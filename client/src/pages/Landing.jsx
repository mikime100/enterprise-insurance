import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Tabs, Collapse, Alert } from 'antd';
import {
  SafetyOutlined, TeamOutlined, BankOutlined, FileSearchOutlined,
  WalletOutlined, CheckCircleOutlined, ClockCircleOutlined,
  PhoneOutlined, MailOutlined, LockOutlined, UserOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const API = import.meta.env.VITE_API_URL || '/api';
const NAVY  = '#0a1628';
const NAVY2 = '#1a3465';
const GREEN = '#22c55e';
const BLUE  = '#1d4ed8';

const FEATURES = [
  { icon: <UserOutlined />,       title: 'Individual Coverage',      desc: 'Register online, verify your email, and get covered in minutes with no paperwork or branch visits.' },
  { icon: <TeamOutlined />,       title: 'Broker Network',           desc: 'Apply to join, get admin-approved, and manage your entire client portfolio from a dedicated portal.' },
  { icon: <BankOutlined />,       title: 'Institution Group Plans',  desc: 'HR administrators can bulk-enroll employees and manage benefits for entire workforces at once.' },
  { icon: <FileSearchOutlined />, title: 'Real-Time Claims',         desc: 'File a claim, attach documents, and track every status update in real time from any device.' },
  { icon: <SafetyOutlined />,     title: 'Dependent Management',     desc: 'Add spouses, children, and beneficiaries directly from your personal insured dashboard.' },
  { icon: <WalletOutlined />,     title: 'ETB Wallet & Payments',    desc: 'All premiums and payouts in Ethiopian Birr, fully compliant with local financial regulations.' },
];

const STEPS = [
  { num: '01', title: 'Create Your Account',        desc: 'Register as an individual or apply as a broker. Verify your email instantly with a one-time code.' },
  { num: '02', title: 'Get Matched to a Plan',      desc: 'Choose individual coverage, join an institution group plan, or have your broker enroll you directly.' },
  { num: '03', title: 'Manage Everything Digitally', desc: 'Track policies, file claims, add dependents, and view approvals — all from your personalized dashboard.' },
];

const WHO = [
  {
    icon: <UserOutlined style={{ fontSize: 26, color: GREEN }} />,
    title: 'Individuals', color: GREEN,
    points: ['Self-register in under 3 minutes', 'Email OTP verification for security', 'Personal dashboard: policies, claims, dependents', 'File claims with document upload', 'Real-time claim status tracking'],
    cta: 'Register as Individual', tab: 'individual',
  },
  {
    icon: <TeamOutlined style={{ fontSize: 26, color: BLUE }} />,
    title: 'Sales Brokers', color: BLUE,
    points: ['Apply online via broker application', 'Email OTP verification step', 'Admin reviews and approves within 1–2 days', 'Access broker portal to manage clients', 'Track commissions on every policy'],
    cta: 'Apply as Broker', tab: 'broker',
  },
  {
    icon: <BankOutlined style={{ fontSize: 26, color: '#f59e0b' }} />,
    title: 'Institution HR', color: '#f59e0b',
    points: ['Admin-created HR portal account', 'Bulk enroll employees into group plans', 'Manage departments and coverage tiers', 'View all employee claims and statuses', 'Annual renewal and benefits reporting'],
    cta: 'Request Institution Access', tab: 'institution',
  },
];

const FAQS = [
  { q: 'How do I verify my email after registering?',       a: 'After submitting the registration form, we instantly send a 6-digit code to your email. Enter that code on the verification screen to activate your account.' },
  { q: 'What happens after I submit a broker application?', a: 'You will receive an OTP to verify your email first. Once verified, our admin team reviews your application within 1–2 business days and sends you an approval or rejection email.' },
  { q: 'Can my employer add me to a group plan?',           a: 'Yes. If your institution uses Enterprise Insurance, your HR administrator can enroll you through the Institution portal without you needing to self-register.' },
  { q: 'How do I file a claim?',                            a: 'Log in to your insured dashboard, click "File Claim", fill in the details, attach supporting documents, and submit. You will receive real-time status updates.' },
  { q: 'What currencies and payment methods are supported?', a: 'All transactions are in Ethiopian Birr (ETB), aligned with local payment regulations and financial standards.' },
  { q: 'Is my personal data stored securely?',              a: 'Yes. All data is encrypted in transit and at rest, stored on MongoDB Atlas with access control, and compliant with Ethiopian data protection standards.' },
  { q: 'How do I add dependents to my account?',            a: 'After logging in to your insured dashboard, navigate to the Dependents section and add family members or beneficiaries directly.' },
];

function startCooldown(setter) {
  setter(60);
  const t = setInterval(() => setter(c => { if (c <= 1) { clearInterval(t); return 0; } return c - 1; }), 1000);
}

export default function Landing() {
  const navigate    = useNavigate();
  const { refreshUser } = useAuth();
  const registerRef = useRef(null);
  const [activeTab, setActiveTab] = useState('individual');

  // ── Individual state ──────────────────────────────────────────────────────
  const [indForm]     = Form.useForm();
  const [indStep,     setIndStep]     = useState(0);
  const [indEmail,    setIndEmail]    = useState('');
  const [indOtp,      setIndOtp]      = useState('');
  const [indLoading,  setIndLoading]  = useState(false);
  const [indError,    setIndError]    = useState('');
  const [indResendCD, setIndResendCD] = useState(0);

  // ── Broker state ──────────────────────────────────────────────────────────
  const [brokerForm]     = Form.useForm();
  const [brokerStep,     setBrokerStep]     = useState(0);
  const [brokerEmail,    setBrokerEmail]    = useState('');
  const [brokerOtp,      setBrokerOtp]      = useState('');
  const [brokerLoading,  setBrokerLoading]  = useState(false);
  const [brokerError,    setBrokerError]    = useState('');
  const [brokerResendCD, setBrokerResendCD] = useState(0);

  // ── Institution state ─────────────────────────────────────────────────────
  const [instForm]    = Form.useForm();
  const [instLoading, setInstLoading] = useState(false);
  const [instDone,    setInstDone]    = useState(false);
  const [instError,   setInstError]   = useState('');

  const scrollToRegister = (tab) => {
    if (tab) setActiveTab(tab);
    setTimeout(() => registerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  // ── Individual handlers ───────────────────────────────────────────────────
  const onIndRegister = async (values) => {
    setIndLoading(true); setIndError('');
    try {
      const { confirmPassword, ...payload } = values;
      await axios.post(`${API}/auth/register`, payload, { withCredentials: true });
      setIndEmail(values.email);
      setIndStep(1);
    } catch (err) {
      setIndError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally { setIndLoading(false); }
  };

  const onIndVerify = async () => {
    if (!indOtp || indOtp.length !== 6) { setIndError('Enter the 6-digit code from your email'); return; }
    setIndLoading(true); setIndError('');
    try {
      await axios.post(`${API}/auth/verify-email`, { email: indEmail, otp: indOtp }, { withCredentials: true });
      await refreshUser();
      navigate('/insured/dashboard');
    } catch (err) {
      setIndError(err.response?.data?.message || 'Invalid or expired code');
    } finally { setIndLoading(false); }
  };

  const onIndResend = async () => {
    try {
      await axios.post(`${API}/auth/resend-otp`, { email: indEmail }, { withCredentials: true });
      startCooldown(setIndResendCD);
    } catch (err) { setIndError(err.response?.data?.message || 'Could not resend code'); }
  };

  // ── Broker handlers ───────────────────────────────────────────────────────
  const onBrokerApply = async (values) => {
    setBrokerLoading(true); setBrokerError('');
    try {
      const { confirmPassword, ...payload } = values;
      await axios.post(`${API}/auth/broker-apply`, payload, { withCredentials: true });
      setBrokerEmail(values.email);
      setBrokerStep(1);
    } catch (err) {
      setBrokerError(err.response?.data?.message || 'Application failed. Please try again.');
    } finally { setBrokerLoading(false); }
  };

  const onBrokerVerify = async () => {
    if (!brokerOtp || brokerOtp.length !== 6) { setBrokerError('Enter the 6-digit code'); return; }
    setBrokerLoading(true); setBrokerError('');
    try {
      await axios.post(`${API}/auth/verify-email`, { email: brokerEmail, otp: brokerOtp }, { withCredentials: true });
      setBrokerStep(2);
    } catch (err) {
      setBrokerError(err.response?.data?.message || 'Invalid or expired code');
    } finally { setBrokerLoading(false); }
  };

  const onBrokerResend = async () => {
    try {
      await axios.post(`${API}/auth/resend-otp`, { email: brokerEmail }, { withCredentials: true });
      startCooldown(setBrokerResendCD);
    } catch (err) { setBrokerError(err.response?.data?.message || 'Could not resend code'); }
  };

  // ── Institution handler ───────────────────────────────────────────────────
  const onInstSubmit = async () => {
    setInstLoading(true); setInstError('');
    await new Promise(r => setTimeout(r, 800));
    setInstDone(true);
    setInstLoading(false);
  };

  // ── Shared input style ────────────────────────────────────────────────────
  const inp = { height: 44, borderColor: '#e5e7eb' };

  const tabItems = [
    {
      key: 'individual',
      label: 'Individual',
      children: (
        <div style={{ padding: '20px 0 4px' }}>
          {indError && <Alert message={indError} type="error" showIcon closable onClose={() => setIndError('')} style={{ marginBottom: 14, borderRadius: 8 }} />}

          {indStep === 0 && (
            <Form form={indForm} onFinish={onIndRegister} layout="vertical" size="large">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Form.Item name="firstName" label="First Name" rules={[{ required: true, message: 'Required' }]} style={{ marginBottom: 12 }}>
                  <Input prefix={<UserOutlined style={{ color: '#9ca3af' }} />} placeholder="Abebe" style={inp} />
                </Form.Item>
                <Form.Item name="lastName" label="Last Name" rules={[{ required: true, message: 'Required' }]} style={{ marginBottom: 12 }}>
                  <Input placeholder="Kebede" style={inp} />
                </Form.Item>
              </div>
              <Form.Item name="email" label="Email Address" rules={[{ required: true }, { type: 'email', message: 'Enter a valid email' }]} style={{ marginBottom: 12 }}>
                <Input prefix={<MailOutlined style={{ color: '#9ca3af' }} />} placeholder="abebe@example.com" style={inp} />
              </Form.Item>
              <Form.Item name="phone" label="Phone (optional)" style={{ marginBottom: 12 }}>
                <Input prefix={<PhoneOutlined style={{ color: '#9ca3af' }} />} placeholder="+251 91 000 0000" style={inp} />
              </Form.Item>
              <Form.Item name="password" label="Password" rules={[{ required: true }, { min: 8, message: 'Min. 8 characters' }]} style={{ marginBottom: 12 }}>
                <Input.Password prefix={<LockOutlined style={{ color: '#9ca3af' }} />} placeholder="Min. 8 characters" style={inp} />
              </Form.Item>
              <Form.Item name="confirmPassword" label="Confirm Password" dependencies={['password']} style={{ marginBottom: 20 }}
                rules={[{ required: true, message: 'Please confirm your password' },
                  ({ getFieldValue }) => ({ validator(_, v) { return !v || getFieldValue('password') === v ? Promise.resolve() : Promise.reject(new Error('Passwords do not match')); } })]}>
                <Input.Password prefix={<LockOutlined style={{ color: '#9ca3af' }} />} placeholder="Repeat password" style={inp} />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={indLoading} block
                style={{ height: 48, fontWeight: 700, fontSize: 15, borderRadius: 10, background: GREEN, border: 'none' }}>
                Create Individual Account
              </Button>
              <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 10, marginBottom: 0 }}>
                You'll receive a 6-digit verification code by email.
              </p>
            </Form>
          )}

          {indStep === 1 && (
            <div>
              <p style={{ color: '#374151', marginBottom: 16 }}>We sent a 6-digit code to <strong>{indEmail}</strong></p>
              <Input
                size="large" maxLength={6} value={indOtp}
                onChange={e => setIndOtp(e.target.value.replace(/\D/g, ''))}
                onPressEnter={onIndVerify}
                placeholder="123456"
                style={{ fontSize: 28, fontWeight: 800, letterSpacing: 14, textAlign: 'center', height: 64, marginBottom: 16 }}
              />
              <Button type="primary" onClick={onIndVerify} loading={indLoading} block
                style={{ height: 48, fontWeight: 700, borderRadius: 10, background: GREEN, border: 'none', marginBottom: 12 }}>
                Verify &amp; Enter Dashboard
              </Button>
              <div style={{ textAlign: 'center' }}>
                <Button type="link" onClick={onIndResend} disabled={indResendCD > 0} style={{ color: indResendCD > 0 ? '#9ca3af' : BLUE, fontSize: 13 }}>
                  {indResendCD > 0 ? `Resend in ${indResendCD}s` : "Didn't receive it? Resend code"}
                </Button>
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'broker',
      label: 'Sales Broker',
      children: (
        <div style={{ padding: '20px 0 4px' }}>
          {brokerError && <Alert message={brokerError} type="error" showIcon closable onClose={() => setBrokerError('')} style={{ marginBottom: 14, borderRadius: 8 }} />}

          {brokerStep === 0 && (
            <Form form={brokerForm} onFinish={onBrokerApply} layout="vertical" size="large">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Form.Item name="firstName" label="First Name" rules={[{ required: true, message: 'Required' }]} style={{ marginBottom: 12 }}>
                  <Input prefix={<UserOutlined style={{ color: '#9ca3af' }} />} placeholder="Dawit" style={inp} />
                </Form.Item>
                <Form.Item name="lastName" label="Last Name" rules={[{ required: true, message: 'Required' }]} style={{ marginBottom: 12 }}>
                  <Input placeholder="Mekonnen" style={inp} />
                </Form.Item>
              </div>
              <Form.Item name="email" label="Email Address" rules={[{ required: true }, { type: 'email', message: 'Enter a valid email' }]} style={{ marginBottom: 12 }}>
                <Input prefix={<MailOutlined style={{ color: '#9ca3af' }} />} placeholder="dawit@example.com" style={inp} />
              </Form.Item>
              <Form.Item name="phone" label="Phone" style={{ marginBottom: 12 }}>
                <Input prefix={<PhoneOutlined style={{ color: '#9ca3af' }} />} placeholder="+251 91 000 0000" style={inp} />
              </Form.Item>
              <Form.Item name="password" label="Password" rules={[{ required: true }, { min: 8, message: 'Min. 8 characters' }]} style={{ marginBottom: 12 }}>
                <Input.Password prefix={<LockOutlined style={{ color: '#9ca3af' }} />} placeholder="Min. 8 characters" style={inp} />
              </Form.Item>
              <Form.Item name="confirmPassword" label="Confirm Password" dependencies={['password']} style={{ marginBottom: 20 }}
                rules={[{ required: true, message: 'Please confirm your password' },
                  ({ getFieldValue }) => ({ validator(_, v) { return !v || getFieldValue('password') === v ? Promise.resolve() : Promise.reject(new Error('Passwords do not match')); } })]}>
                <Input.Password prefix={<LockOutlined style={{ color: '#9ca3af' }} />} placeholder="Repeat password" style={inp} />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={brokerLoading} block
                style={{ height: 48, fontWeight: 700, fontSize: 15, borderRadius: 10, background: BLUE, border: 'none' }}>
                Submit Broker Application
              </Button>
              <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 10, marginBottom: 0 }}>
                You'll verify your email, then wait 1–2 days for admin approval.
              </p>
            </Form>
          )}

          {brokerStep === 1 && (
            <div>
              <p style={{ color: '#374151', marginBottom: 16 }}>We sent a 6-digit code to <strong>{brokerEmail}</strong></p>
              <Input
                size="large" maxLength={6} value={brokerOtp}
                onChange={e => setBrokerOtp(e.target.value.replace(/\D/g, ''))}
                onPressEnter={onBrokerVerify}
                placeholder="123456"
                style={{ fontSize: 28, fontWeight: 800, letterSpacing: 14, textAlign: 'center', height: 64, marginBottom: 16 }}
              />
              <Button type="primary" onClick={onBrokerVerify} loading={brokerLoading} block
                style={{ height: 48, fontWeight: 700, borderRadius: 10, background: BLUE, border: 'none', marginBottom: 12 }}>
                Verify Email
              </Button>
              <div style={{ textAlign: 'center' }}>
                <Button type="link" onClick={onBrokerResend} disabled={brokerResendCD > 0} style={{ color: brokerResendCD > 0 ? '#9ca3af' : BLUE, fontSize: 13 }}>
                  {brokerResendCD > 0 ? `Resend in ${brokerResendCD}s` : "Didn't receive it? Resend code"}
                </Button>
              </div>
            </div>
          )}

          {brokerStep === 2 && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <ClockCircleOutlined style={{ fontSize: 52, color: BLUE, marginBottom: 16, display: 'block' }} />
              <h3 style={{ color: '#111827', fontWeight: 700, marginBottom: 8 }}>Email Verified — Application Under Review</h3>
              <p style={{ color: '#6b7280', margin: 0 }}>
                Our team will review your broker application and notify you by email within 1–2 business days.
              </p>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'institution',
      label: 'Institution HR',
      children: (
        <div style={{ padding: '20px 0 4px' }}>
          {instError && <Alert message={instError} type="error" showIcon closable onClose={() => setInstError('')} style={{ marginBottom: 14, borderRadius: 8 }} />}

          {!instDone ? (
            <Form form={instForm} onFinish={onInstSubmit} layout="vertical" size="large">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Form.Item name="contactName" label="Your Full Name" rules={[{ required: true, message: 'Required' }]} style={{ marginBottom: 12 }}>
                  <Input prefix={<UserOutlined style={{ color: '#9ca3af' }} />} placeholder="Sara Tadesse" style={inp} />
                </Form.Item>
                <Form.Item name="jobTitle" label="Job Title" rules={[{ required: true, message: 'Required' }]} style={{ marginBottom: 12 }}>
                  <Input placeholder="HR Manager" style={inp} />
                </Form.Item>
              </div>
              <Form.Item name="institutionName" label="Institution Name" rules={[{ required: true, message: 'Required' }]} style={{ marginBottom: 12 }}>
                <Input prefix={<BankOutlined style={{ color: '#9ca3af' }} />} placeholder="Zemen Bank" style={inp} />
              </Form.Item>
              <Form.Item name="email" label="Work Email" rules={[{ required: true }, { type: 'email', message: 'Enter a valid email' }]} style={{ marginBottom: 12 }}>
                <Input prefix={<MailOutlined style={{ color: '#9ca3af' }} />} placeholder="sara@institution.com" style={inp} />
              </Form.Item>
              <Form.Item name="phone" label="Phone" rules={[{ required: true, message: 'Required' }]} style={{ marginBottom: 12 }}>
                <Input prefix={<PhoneOutlined style={{ color: '#9ca3af' }} />} placeholder="+251 91 000 0000" style={inp} />
              </Form.Item>
              <Form.Item name="employeeCount" label="Approximate Number of Employees" style={{ marginBottom: 20 }}>
                <Input placeholder="e.g. 250" style={inp} />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={instLoading} block
                style={{ height: 48, fontWeight: 700, fontSize: 15, borderRadius: 10, background: '#f59e0b', border: 'none' }}>
                Request Institution Access
              </Button>
              <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 10, marginBottom: 0 }}>
                Our team will reach out within 1 business day to set up your group plan.
              </p>
            </Form>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <CheckCircleOutlined style={{ fontSize: 52, color: '#f59e0b', marginBottom: 16, display: 'block' }} />
              <h3 style={{ color: '#111827', fontWeight: 700, marginBottom: 8 }}>Request Received!</h3>
              <p style={{ color: '#6b7280', margin: 0 }}>
                Our enterprise team will contact you within 1 business day to set up your institution's group insurance plan.
              </p>
            </div>
          )}
        </div>
      ),
    },
  ];

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div style={{ fontFamily: 'Inter, -apple-system, Arial, sans-serif', overflowX: 'hidden' }}>

      {/* ── Sticky Navbar ─────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        background: 'rgba(10,22,40,0.97)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '0 40px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, color: '#fff', flexShrink: 0 }}>E</div>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>Enterprise Insurance</span>
        </div>
        <div className="land-nav" style={{ display: 'flex', gap: 28 }}>
          {[['Features','features'],['How It Works','how-it-works'],["Who It's For",'who'],['Brokers','brokers'],['Institutions','institutions'],['FAQ','faq']].map(([lbl, id]) => (
            <button key={id} onClick={() => scrollTo(id)}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 14, fontWeight: 500, padding: 0 }}>
              {lbl}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link to="/login" style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>Sign In</Link>
          <button onClick={() => scrollToRegister('individual')}
            style={{ background: GREEN, border: 'none', borderRadius: 8, color: '#fff', padding: '9px 22px', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
            Register Now
          </button>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section style={{
        background: `linear-gradient(160deg, ${NAVY} 0%, #0d2040 55%, ${NAVY2} 100%)`,
        paddingTop: 120, paddingBottom: 80,
        padding: '120px 5% 80px',
        display: 'flex', alignItems: 'center', gap: 64, minHeight: '88vh',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '48px 48px', pointerEvents: 'none' }} />
        <div style={{ flex: 1, maxWidth: 520, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 20, padding: '6px 14px', marginBottom: 24 }}>
            <CheckCircleOutlined style={{ color: GREEN, fontSize: 12 }} />
            <span style={{ color: GREEN, fontSize: 13, fontWeight: 600 }}>Ethiopia's #1 Digital Insurance Platform</span>
          </div>
          <h1 style={{ color: '#fff', fontSize: 'clamp(36px, 4vw, 54px)', fontWeight: 900, lineHeight: 1.15, margin: '0 0 20px' }}>
            Modern Insurance for<br />
            <span style={{ color: GREEN }}>A Digital Ethiopia</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.62)', fontSize: 17, lineHeight: 1.75, margin: '0 0 36px' }}>
            One platform for individuals, sales brokers, and institutions. Digital policies, real-time claims, email-verified accounts, and a full broker approval workflow — all in one place.
          </p>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 28 }}>
            <button onClick={() => scrollToRegister('individual')}
              style={{ background: GREEN, border: 'none', borderRadius: 10, color: '#fff', padding: '14px 28px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
              Get Coverage →
            </button>
            <button onClick={() => scrollToRegister('broker')}
              style={{ background: 'transparent', border: '2px solid rgba(255,255,255,0.35)', borderRadius: 10, color: '#fff', padding: '14px 28px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
              Join as Broker
            </button>
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {['Email-verified accounts', 'Broker approval workflow', 'Institution group plans'].map(t => (
              <span key={t} style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircleOutlined style={{ color: GREEN, fontSize: 11 }} /> {t}
              </span>
            ))}
          </div>
        </div>

        {/* Dashboard mockup card */}
        <div className="hero-mockup" style={{ flex: 1, maxWidth: 460, position: 'relative', zIndex: 1 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '20px 22px', boxShadow: '0 32px 80px rgba(0,0,0,0.4)', overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 800, color: '#111827', fontSize: 15 }}>System Overview</div>
                <div style={{ color: '#9ca3af', fontSize: 11 }}>Enterprise Insurance · May 2026</div>
              </div>
              <span style={{ background: '#dcfce7', color: '#16a34a', borderRadius: 20, padding: '4px 11px', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />Live
              </span>
            </div>

            {/* 4-stat grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              {[
                { label: 'Active Members', value: '5,240', sub: '↑ 8.3% this month', color: GREEN,   bg: '#f0fdf4' },
                { label: 'Active Policies', value: '1,240', sub: '↑ 12% this month',  color: BLUE,    bg: '#eff6ff' },
                { label: 'Claims Resolved', value: '94%',   sub: 'Industry leading',  color: '#8b5cf6', bg: '#f5f3ff' },
                { label: 'ETB Paid Out',    value: '8.2M',  sub: 'This fiscal year',  color: '#f59e0b', bg: '#fffbeb' },
              ].map(s => (
                <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '12px 14px' }}>
                  <div style={{ color: '#9ca3af', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#111827', lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: s.color, fontWeight: 600, marginTop: 4 }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Mini bar chart — weekly claims */}
            <div style={{ background: '#f9fafb', borderRadius: 12, padding: '12px 14px', marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>Claims This Week</span>
                <span style={{ fontSize: 11, color: GREEN, fontWeight: 600 }}>47 total</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 44 }}>
                {[55, 80, 45, 100, 70, 90, 60].map((h, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: '100%', height: `${h * 0.4}px`, borderRadius: 4, background: i === 3 ? BLUE : i === 5 ? GREEN : '#d1d5db' }} />
                    <span style={{ fontSize: 9, color: '#9ca3af' }}>{'MTWTFSS'[i]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent activity feed */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Recent Activity</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {[
                  { dot: '#16a34a', text: 'Claim #CLM-2847 approved', sub: 'Biruk A. · ETB 45,000', time: '2m ago' },
                  { dot: BLUE,      text: 'New policy enrolled',       sub: 'Daniel T. · Health Standard', time: '18m ago' },
                  { dot: '#8b5cf6', text: 'Broker application approved', sub: 'Kebede W. · Sales Broker', time: '1h ago' },
                  { dot: '#f59e0b', text: 'Claim #CLM-2851 under review', sub: 'Hanna M. · ETB 12,400', time: '2h ago' },
                ].map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: a.dot, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.text}</div>
                      <div style={{ fontSize: 10, color: '#9ca3af' }}>{a.sub}</div>
                    </div>
                    <span style={{ fontSize: 10, color: '#d1d5db', flexShrink: 0 }}>{a.time}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Stats Bar ─────────────────────────────────────────────────────── */}
      <section style={{ background: '#111827', padding: '36px 5%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          {[['5,000+','MEMBERS PROTECTED'],['94%','CLAIMS PAID'],['8.2M','ETB DISTRIBUTED'],['120+','INSTITUTIONS ONBOARDED']].map(([val, lbl]) => (
            <div key={lbl}>
              <div style={{ fontSize: 'clamp(26px, 3vw, 38px)', fontWeight: 900, color: GREEN }}>{val}</div>
              <div style={{ color: '#9ca3af', fontSize: 11, fontWeight: 700, letterSpacing: '0.09em', marginTop: 4 }}>{lbl}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section id="features" style={{ background: '#fff', padding: '88px 5%' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <h2 style={{ fontSize: 'clamp(26px, 3vw, 40px)', fontWeight: 900, color: '#111827', margin: '0 0 12px' }}>Built for Ethiopia's Insurance Ecosystem</h2>
            <p style={{ color: '#6b7280', fontSize: 16, margin: 0 }}>One platform, three portals, zero paperwork.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{ background: '#f9fafb', borderRadius: 14, padding: '28px 24px', border: '1px solid #f0f0f0' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: `${GREEN}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: GREEN, marginBottom: 16 }}>
                  {f.icon}
                </div>
                <h3 style={{ fontWeight: 700, color: '#111827', marginBottom: 8, fontSize: 16 }}>{f.title}</h3>
                <p style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────────────── */}
      <section id="how-it-works" style={{ background: '#f5f7fa', padding: '88px 5%' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <h2 style={{ fontSize: 'clamp(26px, 3vw, 40px)', fontWeight: 900, color: '#111827', margin: '0 0 12px' }}>Simple From Day One</h2>
            <p style={{ color: '#6b7280', fontSize: 16, margin: 0 }}>From registration to active coverage in three steps.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 40 }}>
            {STEPS.map((s, i) => (
              <div key={i}>
                <div style={{ fontSize: 64, fontWeight: 900, color: `${GREEN}22`, lineHeight: 1, marginBottom: 14 }}>{s.num}</div>
                <h3 style={{ fontWeight: 800, color: '#111827', marginBottom: 10, fontSize: 19 }}>{s.title}</h3>
                <p style={{ color: '#6b7280', fontSize: 15, lineHeight: 1.7, margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who It's For ──────────────────────────────────────────────────── */}
      <section id="who" style={{ background: '#fff', padding: '88px 5%' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <h2 style={{ fontSize: 'clamp(26px, 3vw, 40px)', fontWeight: 900, color: '#111827', margin: '0 0 12px' }}>Who It's For</h2>
            <p style={{ color: '#6b7280', fontSize: 16, margin: 0 }}>Choose your path and get started — all on this page.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {WHO.map((w, i) => (
              <div key={i} style={{ border: `2px solid ${w.color}28`, borderRadius: 18, padding: '32px 28px', background: '#fff', boxShadow: '0 4px 24px rgba(0,0,0,0.05)' }}>
                <div style={{ width: 56, height: 56, borderRadius: 14, background: `${w.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                  {w.icon}
                </div>
                <h3 style={{ fontWeight: 800, color: '#111827', marginBottom: 16, fontSize: 20 }}>{w.title}</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 11 }}>
                  {w.points.map((p, j) => (
                    <li key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, color: '#374151', fontSize: 14 }}>
                      <CheckCircleOutlined style={{ color: w.color, marginTop: 2, flexShrink: 0 }} /> {p}
                    </li>
                  ))}
                </ul>
                <button onClick={() => scrollToRegister(w.tab)}
                  style={{ background: w.color, border: 'none', borderRadius: 9, color: '#fff', padding: '12px 0', fontWeight: 700, cursor: 'pointer', fontSize: 14, width: '100%' }}>
                  {w.cta} →
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Broker Banner ─────────────────────────────────────────────────── */}
      <section id="brokers" style={{ background: `linear-gradient(135deg, ${NAVY}, ${NAVY2})`, padding: '80px 5%', textAlign: 'center' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <h2 style={{ color: '#fff', fontSize: 'clamp(26px, 3vw, 40px)', fontWeight: 900, margin: '0 0 16px' }}>Earn While You Help People.</h2>
          <p style={{ color: 'rgba(255,255,255,0.62)', fontSize: 16, lineHeight: 1.75, margin: '0 0 40px' }}>
            Our broker network is growing across Ethiopia. Apply today, verify your email, get approved within 1–2 business days, and immediately start enrolling clients into plans that matter.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 48, marginBottom: 40, flexWrap: 'wrap' }}>
            {['ETB Commission on Every Policy', '1–2 Day Approval', 'Full Digital Portal Access'].map(t => (
              <div key={t} style={{ textAlign: 'center' }}>
                <CheckCircleOutlined style={{ color: GREEN, fontSize: 22, display: 'block', margin: '0 auto 8px' }} />
                <span style={{ color: 'rgba(255,255,255,0.72)', fontSize: 14, fontWeight: 600 }}>{t}</span>
              </div>
            ))}
          </div>
          <button onClick={() => scrollToRegister('broker')}
            style={{ background: GREEN, border: 'none', borderRadius: 10, color: '#fff', padding: '16px 44px', fontWeight: 800, fontSize: 16, cursor: 'pointer' }}>
            Apply as Broker →
          </button>
        </div>
      </section>

      {/* ── Institution Section ────────────────────────────────────────────── */}
      <section id="institutions" style={{ background: '#f5f7fa', padding: '88px 5%' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 64, alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: 'clamp(26px, 3vw, 38px)', fontWeight: 900, color: '#111827', margin: '0 0 16px' }}>Protect Your Entire Workforce</h2>
            <p style={{ color: '#6b7280', fontSize: 16, lineHeight: 1.75, margin: '0 0 28px' }}>
              Enterprise Insurance gives HR administrators a powerful dashboard to manage group insurance for every employee — from enrollment to claims to renewals.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {['Bulk employee enrollment', 'Department-level coverage management', 'Per-employee claims visibility', 'Group policy renewals and reporting', 'Dedicated admin onboarding support'].map(p => (
                <li key={p} style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#374151', fontSize: 15 }}>
                  <CheckCircleOutlined style={{ color: '#f59e0b', flexShrink: 0 }} /> {p}
                </li>
              ))}
            </ul>
            <button onClick={() => scrollToRegister('institution')}
              style={{ background: '#f59e0b', border: 'none', borderRadius: 10, color: '#fff', padding: '14px 28px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
              Request Institution Access →
            </button>
          </div>

          {/* HR dashboard mockup */}
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}>
            <div style={{ fontWeight: 700, color: '#111827', marginBottom: 4, fontSize: 15 }}>Employee Coverage Overview</div>
            <div style={{ color: '#9ca3af', fontSize: 12, marginBottom: 18 }}>5 of 280 shown</div>
            {[
              { name: 'Abebe Kebede',   dept: 'Engineering', status: 'Active',  sc: '#16a34a' },
              { name: 'Sara Tadesse',   dept: 'HR',          status: 'Active',  sc: '#16a34a' },
              { name: 'Dawit Mekonnen', dept: 'Finance',     status: 'Pending', sc: '#f59e0b' },
              { name: 'Helen Girma',    dept: 'Operations',  status: 'Active',  sc: '#16a34a' },
              { name: 'Yonas Alemu',    dept: 'IT',          status: 'Expired', sc: '#ef4444' },
            ].map((e, i, arr) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: i < arr.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#f0f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: BLUE, fontSize: 13 }}>
                    {e.name[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: '#111827', fontSize: 13 }}>{e.name}</div>
                    <div style={{ color: '#9ca3af', fontSize: 11 }}>{e.dept}</div>
                  </div>
                </div>
                <span style={{ background: `${e.sc}15`, color: e.sc, borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 600 }}>{e.status}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Registration Forms ─────────────────────────────────────────────── */}
      <section id="register" ref={registerRef} style={{ background: '#fff', padding: '88px 5%' }}>
        <div style={{ maxWidth: 620, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h2 style={{ fontSize: 'clamp(26px, 3vw, 38px)', fontWeight: 900, color: '#111827', margin: '0 0 12px' }}>Get Started Today</h2>
            <p style={{ color: '#6b7280', fontSize: 16, margin: 0 }}>Choose your path and join Ethiopia's fastest-growing digital insurance network.</p>
          </div>
          <div style={{ background: '#f9fafb', borderRadius: 20, padding: '4px 20px 24px', border: '1px solid #e5e7eb' }}>
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              centered
              items={tabItems}
              tabBarStyle={{ fontWeight: 700, marginBottom: 0 }}
            />
          </div>
          <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, marginTop: 20, marginBottom: 0 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: BLUE, fontWeight: 600 }}>Sign in here</Link>
          </p>
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────────────────────── */}
      <section style={{ background: `linear-gradient(135deg, ${NAVY}, ${NAVY2})`, padding: '80px 5%' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <h2 style={{ color: '#fff', textAlign: 'center', fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 900, margin: '0 0 52px' }}>Trusted Across Ethiopia</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
            {[
              { quote: 'The broker portal made it incredibly easy to enroll my clients. The commission tracking alone saved me hours every week.', name: 'Dawit Mekonnen', role: 'Independent Broker, Addis Ababa' },
              { quote: 'We onboarded 280 employees in a single afternoon. The HR dashboard is exactly what we needed to modernize our benefits.', name: 'Sara Tadesse', role: 'HR Director, Zemen Bank' },
            ].map((t, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 16, padding: '28px 24px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <p style={{ color: 'rgba(255,255,255,0.82)', fontSize: 16, lineHeight: 1.75, fontStyle: 'italic', margin: '0 0 24px' }}>"{t.quote}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: '50%', background: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: 17, flexShrink: 0 }}>
                    {t.name[0]}
                  </div>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{t.name}</div>
                    <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section id="faq" style={{ background: '#fff', padding: '88px 5%' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 900, color: '#111827', margin: '0 0 52px' }}>
            Frequently Asked Questions
          </h2>
          <Collapse
            ghost
            items={FAQS.map((f, i) => ({
              key: String(i),
              label: <span style={{ fontWeight: 600, color: '#111827', fontSize: 15 }}>{f.q}</span>,
              children: <p style={{ color: '#6b7280', lineHeight: 1.75, margin: 0, paddingLeft: 4 }}>{f.a}</p>,
            }))}
            style={{ border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden' }}
          />
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section style={{ background: GREEN, padding: '72px 5%', textAlign: 'center' }}>
        <h2 style={{ color: '#fff', fontSize: 'clamp(26px, 3vw, 40px)', fontWeight: 900, margin: '0 0 12px' }}>Ready to Get Covered?</h2>
        <p style={{ color: 'rgba(255,255,255,0.82)', fontSize: 17, margin: '0 0 36px' }}>
          Join thousands of Ethiopians managing their insurance digitally.
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => scrollToRegister('individual')}
            style={{ background: '#fff', border: 'none', borderRadius: 10, color: GREEN, padding: '15px 36px', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
            Create Account
          </button>
          <button onClick={() => scrollToRegister('broker')}
            style={{ background: 'transparent', border: '2px solid rgba(255,255,255,0.6)', borderRadius: 10, color: '#fff', padding: '15px 36px', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
            Apply as Broker
          </button>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer style={{ background: NAVY, padding: '52px 5% 28px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 40, marginBottom: 44 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 17, color: '#fff', flexShrink: 0 }}>E</div>
                <span style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>Enterprise Insurance</span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                Empowering Ethiopia's Insurance Ecosystem.<br />Addis Ababa, Ethiopia.
              </p>
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, marginBottom: 14, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Platform</div>
              {[['Features','features'],['How It Works','how-it-works'],["Who It's For",'who'],['FAQ','faq']].map(([lbl, id]) => (
                <div key={id} style={{ marginBottom: 9 }}>
                  <button onClick={() => scrollTo(id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontSize: 13, padding: 0 }}>{lbl}</button>
                </div>
              ))}
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, marginBottom: 14, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Portals</div>
              {[['Individual Registration','individual'],['Broker Application','broker'],['Institution Access','institution']].map(([lbl, tab]) => (
                <div key={tab} style={{ marginBottom: 9 }}>
                  <button onClick={() => scrollToRegister(tab)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontSize: 13, padding: 0 }}>{lbl}</button>
                </div>
              ))}
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, marginBottom: 14, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Account</div>
              <div style={{ marginBottom: 9 }}>
                <Link to="/login" style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, textDecoration: 'none' }}>Sign In</Link>
              </div>
              <div style={{ marginBottom: 9 }}>
                <button onClick={() => scrollToRegister('individual')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontSize: 13, padding: 0 }}>Register</button>
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 22, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>© 2026 Enterprise Insurance S.C. · All rights reserved.</span>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>Pan-African Trusted Partner · Addis Ababa, Ethiopia</span>
          </div>
        </div>
      </footer>

      <style>{`
        @media (max-width: 768px) {
          .hero-mockup { display: none !important; }
          .land-nav    { display: none !important; }
        }
      `}</style>
    </div>
  );
}
