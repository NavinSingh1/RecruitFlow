const router = require('express').Router();
const { body } = require('express-validator');
const User = require('../models/User');
const ah = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin', 'recruiter'));

// Team of the caller's organization only
router.get('/', ah(async (req, res) => {
  res.json(await User.find({ organization: req.user.organization }).select('name email role createdAt').sort('name'));
}));

router.post('/', authorize('admin'), [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Enter a valid email').normalizeEmail(),
  body('password').isString().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').isIn(['recruiter', 'admin']).withMessage('Role must be recruiter or admin'),
], validate, ah(async (req, res) => {
  const { name, email, password, role } = req.body;
  if (await User.exists({ email })) return res.status(409).json({ message: 'Email is already registered' });
  const user = await User.create({ name, email, password, role, organization: req.user.organization });
  res.status(201).json(user.toSafe());
}));
module.exports = router;
