const router = require('express').Router();
const { body, param } = require('express-validator');
const Interview = require('../models/Interview');
const Application = require('../models/Application');
const User = require('../models/User');
const ah = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');

const populate = [
  { path: 'candidate', select: 'name email' }, { path: 'interviewer', select: 'name email' }, { path: 'job', select: 'title' },
];
// Two slots overlap when start < otherEnd && end > otherStart
const overlap = (field, id, start, end) =>
  Interview.findOne({ [field]: id, status: 'scheduled', start: { $lt: end }, end: { $gt: start } });

router.get('/', protect, ah(async (req, res) => {
  const f = req.user.role === 'candidate' ? { candidate: req.user._id } : { organization: req.user.organization };
  if (req.query.status) f.status = String(req.query.status);
  if (req.query.upcoming === 'true') { f.start = { $gte: new Date() }; f.status = 'scheduled'; }
  res.json(await Interview.find(f).populate(populate).sort('start').limit(200));
}));

router.post('/', protect, authorize('admin', 'recruiter'), [
  body('application').isMongoId().withMessage('Invalid application'),
  body('interviewer').isMongoId().withMessage('Choose an interviewer'),
  body('start').isISO8601().withMessage('Start time is invalid').toDate(),
  body('end').isISO8601().withMessage('End time is invalid').toDate(),
  body('mode').optional().isIn(['video', 'phone', 'onsite']),
  body('link').optional({ values: 'falsy' }).isString().isLength({ max: 300 }),
], validate, ah(async (req, res) => {
  const { application, interviewer, start, end, mode, link } = req.body;
  if (end <= start) return res.status(400).json({ message: 'End time must be after start time' });
  if (start < new Date()) return res.status(400).json({ message: 'Interview must be scheduled in the future' });

  const app = await Application.findOne({ _id: application, organization: req.user.organization });
  if (!app) return res.status(404).json({ message: 'Application not found' });
  const person = await User.findOne({ _id: interviewer, organization: req.user.organization, role: { $in: ['admin', 'recruiter'] } });
  if (!person) return res.status(400).json({ message: 'Interviewer must be a member of your organization' });

  if (await overlap('interviewer', person._id, start, end)) return res.status(409).json({ message: `${person.name} already has an interview during this time` });
  if (await overlap('candidate', app.candidate, start, end)) return res.status(409).json({ message: 'The candidate already has an interview during this time' });

  const interview = await Interview.create({
    organization: req.user.organization, application: app._id, job: app.job, candidate: app.candidate,
    interviewer: person._id, start, end, mode, link,
  });
  if (['applied', 'shortlisted'].includes(app.status)) { app.status = 'interview'; await app.save(); }
  res.status(201).json(await interview.populate(populate));
}));

router.patch('/:id/feedback', protect, authorize('admin', 'recruiter'), param('id').isMongoId(), [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('recommendation').isIn(['hire', 'maybe', 'no_hire']).withMessage('Choose a recommendation'),
  body('comments').optional().isString().isLength({ max: 3000 }),
], validate, ah(async (req, res) => {
  const iv = await Interview.findOne({ _id: req.params.id, organization: req.user.organization });
  if (!iv) return res.status(404).json({ message: 'Interview not found' });
  if (req.user.role !== 'admin' && String(iv.interviewer) !== String(req.user._id))
    return res.status(403).json({ message: 'Only the assigned interviewer can record feedback' });
  if (iv.status === 'cancelled') return res.status(400).json({ message: 'This interview was cancelled' });
  iv.feedback = { rating: req.body.rating, comments: req.body.comments, recommendation: req.body.recommendation, submittedAt: new Date() };
  iv.status = 'completed';
  await iv.save();
  res.json(await iv.populate(populate));
}));

router.patch('/:id/cancel', protect, authorize('admin', 'recruiter'), param('id').isMongoId(), validate, ah(async (req, res) => {
  const iv = await Interview.findOne({ _id: req.params.id, organization: req.user.organization });
  if (!iv) return res.status(404).json({ message: 'Interview not found' });
  iv.status = 'cancelled';
  await iv.save();
  res.json(iv);
}));
module.exports = router;
