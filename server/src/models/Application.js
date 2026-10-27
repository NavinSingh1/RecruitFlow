const { Schema, model } = require('mongoose');
const STATUSES = ['applied', 'shortlisted', 'interview', 'offered', 'hired', 'rejected'];
const schema = new Schema({
  job: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
  candidate: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  coverLetter: { type: String, maxlength: 3000 },
  resume: { path: String, originalName: String },
  status: { type: String, enum: STATUSES, default: 'applied' },
}, { timestamps: true });
// One application per candidate per job — enforced at DB level.
schema.index({ job: 1, candidate: 1 }, { unique: true });
schema.statics.STATUSES = STATUSES;
module.exports = model('Application', schema);
