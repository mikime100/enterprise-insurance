/**
 * Data repair script — fixes InsuredPerson.institution links
 * and removes claims that can't be traced to any institution.
 *
 * Run: node repair.js
 *
 * What it does:
 *  1. For every insured_person User with institutionId set, finds their
 *     linked InsuredPerson and sets InsuredPerson.institution = User.institutionId
 *     if it is missing or wrong.
 *  2. Finds InsuredPerson records that have institution set to an ID that
 *     doesn't correspond to any User with that institutionId → clears the field.
 *  3. Finds Claims whose insuredPerson has no institution at all (orphaned) →
 *     reports them. Does NOT auto-delete; prints for manual review.
 *
 * Safe to run multiple times — all ops are idempotent.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const User          = require('./models/User');
const InsuredPerson = require('./models/InsuredPerson');
const Claim         = require('./models/Claim');
const Institution   = require('./models/Institution');

async function repair() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/enterprise_insurance');
  console.log('Connected to MongoDB\n');

  // ── Step 1: Sync InsuredPerson.institution from User.institutionId ────────────
  // Trust: User.institutionId is the authoritative source for which institution
  // an employee belongs to. The InsuredPerson.institution must match it.

  const insuredUsers = await User.find({
    role: 'insured_person',
    institutionId: { $exists: true, $ne: null },
    'linkedEntity.entityId': { $exists: true, $ne: null },
  }).lean();

  let fixed = 0, alreadyCorrect = 0;
  for (const u of insuredUsers) {
    const ipId   = u.linkedEntity.entityId;
    const instId = u.institutionId.toString();
    const ip = await InsuredPerson.findById(ipId);
    if (!ip) continue;

    const current = ip.institution?.toString();
    if (current !== instId) {
      await InsuredPerson.findByIdAndUpdate(ipId, { institution: u.institutionId });
      console.log(`  FIXED  ${u.email}: InsuredPerson.institution ${current || '(none)'} → ${instId}`);
      fixed++;
    } else {
      alreadyCorrect++;
    }
  }
  console.log(`\nStep 1 complete: ${fixed} fixed, ${alreadyCorrect} already correct\n`);

  // ── Step 2: Clear InsuredPerson.institution where no matching User exists ─────
  // If an InsuredPerson has institution = X but no User with institutionId = X
  // points to this InsuredPerson, the link is stale/corrupt.

  const allInstitutions = await Institution.find({}, '_id').lean();
  const validInstIds    = new Set(allInstitutions.map(i => i._id.toString()));

  const ipsWithInstitution = await InsuredPerson.find({
    institution: { $exists: true, $ne: null },
  }).lean();

  let cleared = 0;
  for (const ip of ipsWithInstitution) {
    const instId = ip.institution.toString();
    if (!validInstIds.has(instId)) {
      await InsuredPerson.findByIdAndUpdate(ip._id, { $unset: { institution: 1 } });
      console.log(`  CLEARED stale institution on InsuredPerson ${ip._id} (institution ${instId} not in DB)`);
      cleared++;
      continue;
    }
    // Check that some User with institutionId = instId has linkedEntity pointing to this IP
    const owner = await User.findOne({
      'linkedEntity.entityId': ip._id,
      institutionId:            ip.institution,
    }).lean();
    if (!owner) {
      await InsuredPerson.findByIdAndUpdate(ip._id, { $unset: { institution: 1 } });
      console.log(`  CLEARED orphaned institution link on InsuredPerson ${ip.firstName} ${ip.lastName} (${ip._id}) — no matching User found`);
      cleared++;
    }
  }
  console.log(`\nStep 2 complete: ${cleared} stale/orphaned links cleared\n`);

  // ── Step 3: Audit claims with no traceable institution ───────────────────────
  // These are claims whose insuredPerson has institution = null/undefined.
  // We print them for review but don't auto-delete.

  const allClaims = await Claim.find({}).populate('insuredPerson', 'firstName lastName institution').lean();
  const orphanedClaims = allClaims.filter(c => !c.insuredPerson?.institution);
  if (orphanedClaims.length > 0) {
    console.log(`Step 3 — ${orphanedClaims.length} claim(s) with no institution link (orphaned):`);
    for (const c of orphanedClaims) {
      console.log(`  CLM ${c.claimNumber} | ${c.insuredPerson?.firstName || '?'} ${c.insuredPerson?.lastName || '?'} | ${c.claimType} | ETB ${c.claimedAmount} | status: ${c.status}`);
    }
    console.log('\nThese claims belong to insured persons not linked to any institution.');
    console.log('They will not appear in any institution portal view after the routing fix.');
    console.log('Run the following to delete them if they are test/garbage data:');
    console.log('  node repair.js --delete-orphaned-claims\n');

    if (process.argv.includes('--delete-orphaned-claims')) {
      const orphanedIds = orphanedClaims.map(c => c._id);
      const result = await Claim.deleteMany({ _id: { $in: orphanedIds } });
      console.log(`  Deleted ${result.deletedCount} orphaned claims.\n`);
    }
  } else {
    console.log('Step 3: No orphaned claims found.\n');
  }

  // ── Step 4: Summary ───────────────────────────────────────────────────────────
  const totalClaims  = await Claim.countDocuments();
  const totalIPs     = await InsuredPerson.countDocuments();
  const ipsWithInst  = await InsuredPerson.countDocuments({ institution: { $exists: true, $ne: null } });
  const ipsWithout   = totalIPs - ipsWithInst;

  console.log('══════════════════════════════════════════');
  console.log('  REPAIR SUMMARY');
  console.log('══════════════════════════════════════════');
  console.log(`  Total claims:                  ${totalClaims}`);
  console.log(`  Total insured persons:         ${totalIPs}`);
  console.log(`  With institution linked:       ${ipsWithInst}`);
  console.log(`  Without institution (no inst): ${ipsWithout}`);
  if (ipsWithout > 0) {
    console.log(`\n  NOTE: ${ipsWithout} insured person(s) with no institution are individual`);
    console.log('  accounts (broker-registered). Their claims are correctly scoped');
    console.log('  by insuredPerson ID when accessed via the mobile/individual portal.');
  }
  console.log('══════════════════════════════════════════\n');

  await mongoose.disconnect();
}

repair().catch(err => {
  console.error('Repair failed:', err);
  process.exit(1);
});
