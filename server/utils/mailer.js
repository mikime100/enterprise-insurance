const nodemailer = require('nodemailer');

function createTransport() {
  // Prefer SendGrid SMTP if key provided, else fall back to generic SMTP / ethereal for dev
  if (process.env.SENDGRID_API_KEY) {
    return nodemailer.createTransport({
      host:   'smtp.sendgrid.net',
      port:   587,
      secure: false,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY,
      },
    });
  }
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false,
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  });
}

const FROM = process.env.EMAIL_FROM || 'Enterprise Insurance <noreply@enterprise-insurance.et>';

async function sendMail({ to, subject, html, text }) {
  if (!process.env.SENDGRID_API_KEY && !process.env.SMTP_USER) {
    console.log(`[mailer] No transport configured — skipping email to ${to}: ${subject}`);
    return;
  }
  const transport = createTransport();
  await transport.sendMail({ from: FROM, to, subject, html, text });
}

// ── Templates ──────────────────────────────────────────────────────────────────

function renewalReminderHtml({ firstName, productName, tierName, enrollmentNumber, endDate, daysLeft, renewUrl }) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">

        <!-- Header -->
        <tr><td style="background:#1e3a5f;padding:32px 40px">
          <div style="color:#fff;font-size:22px;font-weight:800">Enterprise Insurance S.C.</div>
          <div style="color:#93c5fd;font-size:13px;margin-top:4px">Policy Renewal Reminder</div>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:36px 40px">
          <p style="margin:0 0 16px;color:#111827;font-size:16px">Dear <strong>${firstName}</strong>,</p>
          <p style="margin:0 0 24px;color:#374151;font-size:14px;line-height:1.7">
            Your insurance policy is expiring in <strong style="color:#f59e0b">${daysLeft} day${daysLeft !== 1 ? 's' : ''}</strong>.
            Renew now to avoid any gap in coverage.
          </p>

          <!-- Policy card -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;margin-bottom:28px">
            <tr><td style="padding:20px 24px">
              <div style="color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Your Policy</div>
              <div style="color:#1e3a5f;font-size:18px;font-weight:800;margin-bottom:4px">${productName} — ${tierName}</div>
              <div style="color:#9ca3af;font-size:12px">${enrollmentNumber}</div>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:14px 0">
              <table width="100%"><tr>
                <td style="color:#6b7280;font-size:13px">Expires on</td>
                <td align="right" style="color:#ef4444;font-weight:700;font-size:13px">${endDate}</td>
              </tr></table>
            </td></tr>
          </table>

          <a href="${renewUrl}" style="display:inline-block;background:#1e3a5f;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:14px">
            Renew My Policy →
          </a>

          <p style="margin:28px 0 0;color:#9ca3af;font-size:12px;line-height:1.6">
            If you have already renewed or do not wish to continue, please ignore this message.<br>
            Questions? Contact us at <a href="mailto:support@enterprise-insurance.et" style="color:#1e3a5f">support@enterprise-insurance.et</a>
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#1e3a5f;padding:20px 40px;text-align:center">
          <div style="color:#64748b;font-size:11px">
            © ${new Date().getFullYear()} Enterprise Insurance S.C. · Regulated by NIBE
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

module.exports = { sendMail, renewalReminderHtml };
