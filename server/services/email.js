const nodemailer = require('nodemailer');

function createTransport() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const FROM = `"Enterprise Insurance" <${process.env.SMTP_USER || 'noreply@enterpriseinsurance.com'}>`;

function baseTemplate(title, bodyHtml) {
  return `
<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body { margin:0; padding:0; background:#f4f6fb; font-family: Arial, sans-serif; }
  .wrap { max-width:560px; margin:40px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,0.08); }
  .header { background:linear-gradient(135deg,#0a1628,#1a3465); padding:32px; text-align:center; }
  .header h1 { color:#fff; margin:0; font-size:22px; font-weight:800; }
  .header p { color:rgba(255,255,255,0.6); margin:4px 0 0; font-size:13px; }
  .body { padding:32px; }
  .otp { background:#f0f4ff; border:2px dashed #1d4ed8; border-radius:10px; text-align:center; padding:20px; margin:24px 0; }
  .otp span { font-size:36px; font-weight:900; color:#1d4ed8; letter-spacing:8px; }
  .btn { display:inline-block; background:#1d4ed8; color:#fff; text-decoration:none; padding:14px 32px; border-radius:8px; font-weight:700; font-size:15px; margin:16px 0; }
  .note { background:#fef9c3; border-left:4px solid #f59e0b; padding:12px 16px; border-radius:6px; font-size:13px; color:#92400e; margin-top:16px; }
  .footer { text-align:center; padding:20px; color:#9ca3af; font-size:12px; border-top:1px solid #f3f4f6; }
</style></head><body>
<div class="wrap">
  <div class="header">
    <h1>Enterprise Insurance</h1>
    <p>Enterprise Insurance Platform</p>
  </div>
  <div class="body">${bodyHtml}</div>
  <div class="footer">© 2026 Enterprise Insurance S.C. &nbsp;·&nbsp; Addis Ababa, Ethiopia</div>
</div>
</body></html>`;
}

async function sendOTPVerification(to, firstName, otp) {
  const html = baseTemplate('Verify Your Email', `
    <h2 style="color:#111827;margin-top:0">Hi ${firstName},</h2>
    <p style="color:#374151">Welcome to Enterprise Insurance! Use the verification code below to confirm your email address.</p>
    <div class="otp"><span>${otp}</span></div>
    <p style="color:#6b7280;font-size:13px;text-align:center">This code expires in <strong>15 minutes</strong>.</p>
    <div class="note">If you did not create an account with Enterprise Insurance, please ignore this email.</div>
  `);
  await createTransport().sendMail({ from: FROM, to, subject: 'Your Enterprise Insurance verification code', html });
}

async function sendEmployeeInvitation(to, firstName, tempPassword, institutionName) {
  const loginUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/login`;
  const html = baseTemplate('You are Invited', `
    <h2 style="color:#111827;margin-top:0">Hi ${firstName},</h2>
    <p style="color:#374151">You have been enrolled in the <strong>${institutionName}</strong> insurance plan on Enterprise Insurance.</p>
    <p style="color:#374151">Use the credentials below to log in for the first time:</p>
    <div class="otp" style="text-align:left;padding:16px 24px;">
      <p style="margin:4px 0;color:#374151;font-size:14px;"><strong>Email:</strong> ${to}</p>
      <p style="margin:4px 0;color:#1d4ed8;font-size:14px;"><strong>Temporary Password:</strong> <span style="letter-spacing:3px;font-weight:900">${tempPassword}</span></p>
    </div>
    <a href="${loginUrl}" class="btn">Log In Now</a>
    <div class="note">You will be asked to change your password immediately after your first login. This temporary password expires in <strong>7 days</strong>.</div>
  `);
  await createTransport().sendMail({ from: FROM, to, subject: `Your Enterprise Insurance account — ${institutionName}`, html });
}

async function sendBrokerCustomerInvitation(to, firstName, tempPassword, brokerName) {
  const loginUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/login`;
  const html = baseTemplate('Your Insurance Account is Ready', `
    <h2 style="color:#111827;margin-top:0">Hi ${firstName},</h2>
    <p style="color:#374151">Your insurance account has been set up by <strong>${brokerName}</strong> through Enterprise Insurance.</p>
    <p style="color:#374151">Use the credentials below to access your account:</p>
    <div class="otp" style="text-align:left;padding:16px 24px;">
      <p style="margin:4px 0;color:#374151;font-size:14px;"><strong>Email:</strong> ${to}</p>
      <p style="margin:4px 0;color:#1d4ed8;font-size:14px;"><strong>Temporary Password:</strong> <span style="letter-spacing:3px;font-weight:900">${tempPassword}</span></p>
    </div>
    <a href="${loginUrl}" class="btn">Access My Account</a>
    <div class="note">You will be required to set your own password on first login. This temporary password expires in <strong>7 days</strong>.</div>
  `);
  await createTransport().sendMail({ from: FROM, to, subject: 'Your Enterprise Insurance account is ready', html });
}

async function sendBrokerApproval(to, firstName, approved) {
  const loginUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/login`;
  const html = approved
    ? baseTemplate('Application Approved', `
        <h2 style="color:#111827;margin-top:0">Congratulations, ${firstName}!</h2>
        <p style="color:#374151">Your application to become a Enterprise Insurance sales broker has been <strong style="color:#16a34a">approved</strong>.</p>
        <p style="color:#374151">You can now log in and start registering customers.</p>
        <a href="${loginUrl}" class="btn">Go to Broker Portal</a>
      `)
    : baseTemplate('Application Update', `
        <h2 style="color:#111827;margin-top:0">Hi ${firstName},</h2>
        <p style="color:#374151">After review, your broker application has not been approved at this time.</p>
        <p style="color:#374151">Please contact <a href="mailto:info@enterpriseinsurance.com">info@enterpriseinsurance.com</a> for more information.</p>
      `);
  const subject = approved ? 'Broker application approved — Enterprise Insurance' : 'Broker application update — Enterprise Insurance';
  await createTransport().sendMail({ from: FROM, to, subject, html });
}

module.exports = { sendOTPVerification, sendEmployeeInvitation, sendBrokerCustomerInvitation, sendBrokerApproval };
