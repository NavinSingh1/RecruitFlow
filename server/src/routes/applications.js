const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const { body, param } = require('express-validator');
const Application = require('../models/Application');
const Job = require('../models/Job');
const ah = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const upload = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');

const populate = [{ path: 'job', select: 'title location status' }, { path: 'candidate', select: 'name email' }];

router.post('/', protect, authorize('candidate'), upload.single('resume'),
  body('job').isMongoId().withMessage('Invalid job'), validate, ah(async (req, res) => {
    const drop = () => req.file && fs.unlink(req.file.path, () => {});
    if (!req.file) return res.status(400).json({ message: 'Please attach your resume' });
    const job = await Job.findOne({ _id: req.body.job, status: 'published' });
    if (!job) { drop(); return res.status(404).json({ message: 'This job is not open for applications' }); }
    if (await Application.exists({ job: job._id, candidate: req.user._id })) {
      drop(); return res.status(409).json({ message: 'You have already applied to this job' });
    }
    try {
      const app = await Application.create({
        job: job._id, candidate: req.user._id, organization: job.organization,
        coverLetter: req.body.coverLetter, resume: { path: req.file.filename, originalName: req.file.originalname },
      });
      res.status(201).json(app);
    } catch (e) { drop(); throw e; } // unique index catches race conditions
  }));

router.get('/', protect, ah(async (req, res) => {
  const f = req.user.role === 'candidate' ? { candidate: req.user._id } : { organization: req.user.organization };
  if (req.query.job) f.job = String(req.query.job);
  if (req.query.status) f.status = String(req.query.status);
  res.json(await Application.find(f).populate(populate).sort('-createdAt').limit(200));
}));

router.patch('/:id/status', protect, authorize('admin', 'recruiter'), param('id').isMongoId(),
  body('status').isIn(Application.STATUSES).withMessage('Invalid status'), validate, ah(async (req, res) => {
    const app = await Application.findOne({ _id: req.params.id, organization: req.user.organization });
    if (!app) return res.status(404).json({ message: 'Application not found' });
    app.status = req.body.status;
    await app.save();
    res.json(app);
  }));

// Resumes are never served statically: access is checked on every download.
router.get('/:id/resume', protect, param('id').isMongoId(), validate, ah(async (req, res) => {
  const app = await Application.findById(req.params.id);
  const allowed = app && (req.user.role === 'candidate'
    ? String(app.candidate) === String(req.user._id)
    : String(app.organization) === String(req.user.organization));
  if (!allowed) return res.status(404).json({ message: 'Application not found' });
  const file = path.join(path.resolve(process.env.UPLOAD_DIR || 'uploads'), path.basename(app.resume.path));
  res.download(file, app.resume.originalName);
}));
module.exports = router;
