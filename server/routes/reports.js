const express = require('express');
const router = express.Router();
const PolicyEnrollment = require('../models/PolicyEnrollment');
const Claim = require('../models/Claim');
const InsuredPerson = require('../models/InsuredPerson');
const Institution = require('../models/Institution');
const Provider = require('../models/Provider');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth, requireRole('payer_admin', 'underwriter', 'claims_officer', 'finance_officer', 'superadmin'));

router.get('/summary', async (req, res, next) => {
  try {
    const openClaimStatuses = [
      'submitted', 'acknowledged', 'under_review',
      'documentation_requested', 'investigation', 'assessment', 'pending_finance_approval'
    ];

    const [
      totalEnrollments,
      activeEnrollments,
      totalClaims,
      openClaims,
      totalInsuredPersons,
      totalInstitutions,
      totalProviders,
      revenueResult
    ] = await Promise.all([
      PolicyEnrollment.countDocuments(),
      PolicyEnrollment.countDocuments({ status: 'active' }),
      Claim.countDocuments(),
      Claim.countDocuments({ status: { $in: openClaimStatuses } }),
      InsuredPerson.countDocuments({ isActive: true }),
      Institution.countDocuments({ isActive: true }),
      Provider.countDocuments({ isActive: true }),
      PolicyEnrollment.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, annualRevenue: { $sum: '$premium.amount' } } }
      ])
    ]);

    const annualRevenue = revenueResult[0]?.annualRevenue || 0;
    res.json({ totalEnrollments, activeEnrollments, totalClaims, openClaims, totalInsuredPersons, totalInstitutions, totalProviders, annualRevenue });
  } catch (err) { next(err); }
});

router.get('/claims-by-status', async (req, res, next) => {
  try {
    const data = await Claim.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    res.json({ data: data.map(d => ({ status: d._id, count: d.count })) });
  } catch (err) { next(err); }
});

router.get('/enrollments-by-type', async (req, res, next) => {
  try {
    const data = await PolicyEnrollment.aggregate([
      { $lookup: { from: 'insuranceproducts', localField: 'product', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' },
      { $group: { _id: '$product.productType', count: { $sum: 1 }, revenue: { $sum: '$premium.amount' } } },
      { $sort: { count: -1 } }
    ]);
    res.json({ data: data.map(d => ({ type: d._id, count: d.count, revenue: d.revenue })) });
  } catch (err) { next(err); }
});

router.get('/recent-claims', async (req, res, next) => {
  try {
    const claims = await Claim.find()
      .populate('insuredPerson', 'firstName lastName')
      .populate('enrollment', 'enrollmentNumber')
      .populate('assignedOfficer', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(10);
    res.json({ claims });
  } catch (err) { next(err); }
});

router.get('/claims-trend', async (req, res, next) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const data = await Claim.aggregate([
      { $match: { incidentDate: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$incidentDate' }, month: { $month: '$incidentDate' } },
          count: { $sum: 1 },
          totalClaimed: { $sum: '$claimedAmount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    res.json({ data });
  } catch (err) { next(err); }
});

module.exports = router;
