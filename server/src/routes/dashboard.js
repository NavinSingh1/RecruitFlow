const router = require('express').Router();
const Job = require('../models/Job');
const Application = require('../models/Application');
const Interview = require('../models/Interview');
const ah = require('../utils/asyncHandler');
const { protect } = require('../middleware/auth');

const toMap = (rows) => Object.fromEntries(rows.map((r) => [r._id, r.n]));
const group = (Model, match, key) => Model.aggregate([{ $match: match }, { $group: { _id: `$${key}`, n: { $sum: 1 } } }]);

router.get('/', protect, ah(async (req, res) => {
  const staff = req.user.role !== 'candidate';
  const scope = staff ? { organization: req.user.organization } : { candidate: req.user._id };
  const upcomingQ = { ...scope, status: 'scheduled', start: { $gte: new Date() } };
  const [apps, upcoming, upcomingCount] = await Promise.all([
    group(Application, scope, 'status'),
    Interview.find(upcomingQ).populate('candidate', 'name').populate('interviewer', 'name').populate('job', 'title').sort('start').limit(5),
    Interview.countDocuments(upcomingQ),
  ]);
  const out = { applications: toMap(apps), upcomingInterviews: upcoming, upcomingCount };
  if (staff) out.jobs = toMap(await group(Job, scope, 'status'));
  res.json(out);
}));
module.exports = router;
