const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const dir = path.resolve(process.env.UPLOAD_DIR || 'uploads');
fs.mkdirSync(dir, { recursive: true });
const ALLOWED = { '.pdf': 'application/pdf', '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };

module.exports = multer({
  storage: multer.diskStorage({
    destination: dir,
    filename: (req, file, cb) => cb(null, crypto.randomBytes(16).toString('hex') + path.extname(file.originalname).toLowerCase()),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED[ext] && ALLOWED[ext] === file.mimetype) return cb(null, true);
    cb(Object.assign(new Error('Resume must be a PDF, DOC or DOCX file'), { status: 400 }));
  },
});
