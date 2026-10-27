const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ah = require('../utils/asyncHandler');

exports.protect = ah(async (req, res, next) => {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Authentication required' });
  let payload;
  try { payload = jwt.verify(token, process.env.JWT_SECRET); }
  catch { return res.status(401).json({ message: 'Invalid or expired token' }); }
  const user = await User.findById(payload.id);
  if (!user) return res.status(401).json({ message: 'User no longer exists' });
  req.user = user;
  next();
});

// Role-based access control
exports.authorize = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ message: 'You do not have permission to do this' });

exports.signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
