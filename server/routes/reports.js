const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Policy = require('../models/Policy');
const Claim = require('../models/Claim');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth, requireRole('admin', 'agent'));

router.get('/summary', async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';

    let customerQuery = { role: 'customer' };
    let policyQuery = {};
    let claimQuery = {};

    if (!isAdmin) {
      const customers = await User.find({ assignedAgent: req.user._id }, '_id');
      const customerIds = customers.map(c => c._id);
      customerQuery._id = { $in: customerIds };
      policyQuery.customer = { $in: customerIds };
      claimQuery.customer = { $in: customerIds };
    }

    const openClaimStatuses = ['submitted', 'acknowledged', 'under_review', 'documentation_requested', 'investigation', 'assessment'];

    const [
      totalCustomers,
      totalPolicies,
      activePolicies,
      totalClaims,
      openClaims,
      totalAgents,
    ] = await Promise.all([
      User.countDocuments(customerQuery),
      Policy.countDocuments(policyQuery),
      Policy.countDocuments({ ...policyQuery, status: 'active' }),
      Claim.countDocuments(claimQuery),
      Claim.countDocuments({ ...claimQuery, status: { $in: openClaimStatuses } }),
      isAdmin ? User.countDocuments({ role: 'agent' }) : Promise.resolve(null),
    ]);

    const revenueResult = await Policy.aggregate([
      { $match: { ...policyQuery, status: 'active' } },
      { $group: { _id: null, monthlyRevenue: { $sum: '$premium.amount' } } },
    ]);
    const monthlyRevenue = revenueResult[0]?.monthlyRevenue || 0;

    res.json({ totalCustomers, totalPolicies, activePolicies, totalClaims, openClaims, monthlyRevenue, ...(isAdmin && { totalAgents }) });
  } catch (err) { next(err); }
});

router.get('/claims-by-status', async (req, res, next) => {
  try {
    let matchStage = {};
    if (req.user.role === 'agent') {
      const customers = await User.find({ assignedAgent: req.user._id }, '_id');
      matchStage.customer = { $in: customers.map(c => c._id) };
    }

    const data = await Claim.aggregate([
      { $match: matchStage },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.json({ data: data.map(d => ({ status: d._id, count: d.count })) });
  } catch (err) { next(err); }
});

router.get('/policies-by-type', async (req, res, next) => {
  try {
    let matchStage = {};
    if (req.user.role === 'agent') {
      const customers = await User.find({ assignedAgent: req.user._id }, '_id');
      matchStage.customer = { $in: customers.map(c => c._id) };
    }

    const data = await Policy.aggregate([
      { $match: matchStage },
      { $lookup: { from: 'insuranceproducts', localField: 'product', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' },
      { $group: { _id: '$product.type', count: { $sum: 1 }, revenue: { $sum: '$premium.amount' } } },
      { $sort: { count: -1 } },
    ]);
    res.json({ data: data.map(d => ({ type: d._id, count: d.count, revenue: d.revenue })) });
  } catch (err) { next(err); }
});

router.get('/recent-claims', async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === 'agent') {
      const customers = await User.find({ assignedAgent: req.user._id }, '_id');
      query.customer = { $in: customers.map(c => c._id) };
    }
    const claims = await Claim.find(query)
      .populate('customer', 'firstName lastName')
      .populate('policy', 'policyNumber')
      .sort({ createdAt: -1 })
      .limit(10);
    res.json({ claims });
  } catch (err) { next(err); }
});

router.get('/claims-trend', requireRole('admin'), async (req, res, next) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const data = await Claim.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 },
          totalClaimed: { $sum: '$claimedAmount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);
    res.json({ data });
  } catch (err) { next(err); }
});

module.exports = router;
