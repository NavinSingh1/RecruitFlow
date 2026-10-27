const { Schema, model } = require('mongoose');
const schema = new Schema({
  organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, required: true, maxlength: 5000 },
  location: { type: String, required: true, trim: true },
  type: { type: String, enum: ['full-time', 'part-time', 'contract', 'internship'], default: 'full-time' },
  skills: [{ type: String, trim: true }],
  salary: { type: String, trim: true },
  status: { type: String, enum: ['draft', 'published', 'closed'], default: 'draft', index: true },
}, { timestamps: true });
schema.index({ organization: 1, status: 1 });
module.exports = model('Job', schema);
