const fs = require('fs');
const { validationResult } = require('express-validator');
module.exports = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  if (req.file) fs.unlink(req.file.path, () => {}); // don't keep uploads for invalid requests
  res.status(400).json({ message: errors.array()[0].msg, errors: errors.array().map((e) => ({ field: e.path, message: e.msg })) });
};
