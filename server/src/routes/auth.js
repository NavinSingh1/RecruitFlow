const router = require('express').Router();
const { body } = require('express-validator');
const User = require('../models/User');
const Organization = require('../models/Organization');
const ah = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const { protect, signToken } = require('../middleware/auth');

// Public registration: candidates, or an admin who creates a new organization.
// Recruiters are added by an admin via POST /api/users, so roles can't be self-escalated.
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 80 }),
  body('email').isEmail().withMessage('Enter a valid email').normalizeEmail(),
  body('password').isString().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').isIn(['candidate', 'admin']).withMessage('Role must be candidate or admin'),
  body('organizationName').if(body('role').equals('admin')).trim().notEmpty().withMessage('Organization name is required'),
], validate, ah(async (req, res) => {
  const { name, email, password, role, organizationName } = req.body;
  if (await User.exists({ email })) return res.status(409).json({ message: 'Email is already registered' });
  let organization;
  if (role === 'admin') organization = (await Organization.create({ name: organizationName }))._id;
  const user = await User.create({ name, email, password, role, organization });
  res.status(201).json({ token: signToken(user), user: user.toSafe() });
}));

router.post('/login', [
  body('email').isEmail().withMessage('Enter a valid email').normalizeEmail(),
  body('password').isString().notEmpty().withMessage('Password is required'),
], validate, ah(async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select('+password');
  if (!user || !(await user.matchPassword(req.body.password))) return res.status(401).json({ message: 'Incorrect email or password' });
  res.json({ token: signToken(user), user: user.toSafe() });
}));

router.get('/me', protect, (req, res) => res.json({ user: req.user.toSafe() }));
module.exports = router;
