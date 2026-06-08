const cron = require('node-cron');
const PolicyEnrollment = require('../models/PolicyEnrollment');
const InsuredPerson    = require('../models/InsuredPerson');
const User             = require('../models/User');
const { sendMail, renewalReminderHtml } = require('./mailer');

const CLIENT_URL = () => process.env.CLIENT_URL || 'http://localhost:5173';

async function runRenewalCheck() {
  const now   = new Date();
  const in30  = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // ── 1. active → pending_renewal when ≤30 days remain ──────────────────────
  const dueSoon = await PolicyEnrollment.find({
    status:  'active',
    endDate: { $lte: in30, $gt: now },
  })
    .populate('product', 'name')
    .populate('tier', 'name')
    .populate('insuredPersons', 'firstName lastName email user');

  for (const enr of dueSoon) {
    enr.status = 'pending_renewal';
    await enr.save();
    console.log(`[renewal] ${enr.enrollmentNumber} → pending_renewal`);

    // Send email to each insured person
    for (const person of enr.insuredPersons) {
      const daysLeft = Math.max(1, Math.ceil((enr.endDate - now) / 86400000));
      const renewUrl = `${CLIENT_URL()}/insured/coverage`;
      const html = renewalReminderHtml({
        firstName:        person.firstName,
        productName:      enr.product?.name || 'Insurance',
        tierName:         enr.tier?.name    || 'Standard',
        enrollmentNumber: enr.enrollmentNumber,
        endDate:          enr.endDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
        daysLeft,
        renewUrl,
      });
      const emailTo = person.email || (await User.findById(person.user).select('email'))?.email;
      if (emailTo) {
        await sendMail({
          to:      emailTo,
          subject: `Action Required: Your ${enr.product?.name || 'insurance'} policy expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
          html,
          text:    `Your policy ${enr.enrollmentNumber} expires in ${daysLeft} days. Visit ${renewUrl} to renew.`,
        });
        console.log(`[renewal] Email sent to ${emailTo}`);
      }
    }
  }

  // ── 2. pending_renewal / active → expired when endDate has passed ──────────
  const expired = await PolicyEnrollment.updateMany(
    { status: { $in: ['active', 'pending_renewal'] }, endDate: { $lte: now } },
    { $set: { status: 'expired' } }
  );
  if (expired.modifiedCount > 0) {
    console.log(`[renewal] Marked ${expired.modifiedCount} enrollment(s) as expired`);
  }
}

function startRenewalCron() {
  // Run at 08:00 every day
  cron.schedule('0 8 * * *', () => {
    console.log('[renewal] Running daily renewal check…');
    runRenewalCheck().catch(err => console.error('[renewal] Error:', err.message));
  });

  // Also run once 30 seconds after server start to catch any missed transitions
  setTimeout(() => {
    console.log('[renewal] Running startup renewal check…');
    runRenewalCheck().catch(err => console.error('[renewal] Startup check error:', err.message));
  }, 30_000);

  console.log('[renewal] Renewal cron scheduled (daily 08:00)');
}

module.exports = { startRenewalCron, runRenewalCheck };
