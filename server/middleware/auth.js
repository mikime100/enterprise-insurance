const User = require('../models/User');

const requireAuth = async (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  try {
    const user = await User.findById(req.session.userId);
    if (!user || !user.isActive) {
      req.session.destroy(() => {});
      return res.status(401).json({ message: 'Account not found or inactive' });
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Insufficient permissions' });
  }
  next();
};

module.exports = { requireAuth, requireRole };
