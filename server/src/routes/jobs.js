const router = require('express').Router();
const { body, param } = require('express-validator');
const Job = require('../models/Job');
const Application = require('../models/Application');
const ah = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');

const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const staff = authorize('admin', 'recruiter');
const rules = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 120 }),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('location').trim().notEmpty().withMessage('Location is required'),
  body('type').optional().isIn(['full-time', 'part-time', 'contract', 'internship']).withMessage('Invalid job type'),
  body('skills').optional().isArray({ max: 20 }).withMessage('Skills must be a list'),
  body('status').optional().isIn(['draft', 'published', 'closed']).withMessage('Invalid status'),
];
const pick = (b) => ({ title: b.title, description: b.description, location: b.location, type: b.type, skills: b.skills, salary: b.salary, status: b.status });

// Search + filter. Candidates see published jobs from all orgs; staff see only their org's jobs.
router.get('/', protect, ah(async (req, res) => {
  const { q, status, type, location } = req.query;
  const f = {};
  if (req.user.role === 'candidate') f.status = 'published';
  else { f.organization = req.user.organization; if (status) f.status = String(status); }
  if (type) f.type = String(type);
  if (location) f.location = new RegExp(esc(location), 'i');
  if (q) { const rx = new RegExp(esc(q), 'i'); f.$or = [{ title: rx }, { description: rx }, { skills: rx }]; }
  const jobs = await Job.find(f).populate('organization', 'name').sort('-createdAt').limit(100).lean();
  if (req.user.role === 'candidate') {
    const applied = await Application.find({ candidate: req.user._id }).distinct('job');
    const set = new Set(applied.map(String));
    jobs.forEach((j) => { j.applied = set.has(String(j._id)); });
  } else {
    const counts = await Application.aggregate([{ $match: { organization: req.user.organization } }, { $group: { _id: '$job', n: { $sum: 1 } } }]);
    const m = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
    jobs.forEach((j) => { j.applicationCount = m[String(j._id)] || 0; });
  }
  res.json(jobs);
}));

const loadScoped = async (req) => {
  const job = await Job.findById(req.params.id).populate('organization', 'name');
  if (!job) return null;
  if (req.user.role === 'candidate') return job.status === 'published' ? job : null;
  return String(job.organization._id) === String(req.user.organization) ? job : null; // org isolation
};

router.get('/:id', protect, param('id').isMongoId(), validate, ah(async (req, res) => {
  const job = await loadScoped(req);
  job ? res.json(job) : res.status(404).json({ message: 'Job not found' });
}));

router.post('/', protect, staff, rules, validate, ah(async (req, res) => {
  const job = await Job.create({ ...pick(req.body), organization: req.user.organization, createdBy: req.user._id });
  res.status(201).json(job);
}));

router.put('/:id', protect, staff, param('id').isMongoId(), rules, validate, ah(async (req, res) => {
  const job = await loadScoped(req);
  if (!job) return res.status(404).json({ message: 'Job not found' });
  Object.entries(pick(req.body)).forEach(([k, v]) => v !== undefined && (job[k] = v));
  await job.save();
  res.json(job);
}));

router.patch('/:id/status', protect, staff, param('id').isMongoId(),
  body('status').isIn(['draft', 'published', 'closed']).withMessage('Invalid status'), validate, ah(async (req, res) => {
    const job = await loadScoped(req);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    job.status = req.body.status;
    await job.save();
    res.json(job);
  }));

router.delete('/:id', protect, authorize('admin'), param('id').isMongoId(), validate, ah(async (req, res) => {
  const job = await loadScoped(req);
  if (!job) return res.status(404).json({ message: 'Job not found' });
  if (await Application.exists({ job: job._id })) return res.status(409).json({ message: 'This job has applications. Close it instead of deleting.' });
  await job.deleteOne();
  res.json({ message: 'Job deleted' });
}));
module.exports = router;
