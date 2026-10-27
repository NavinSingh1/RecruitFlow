const { Schema, model } = require('mongoose');
const schema = new Schema({
  organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  application: { type: Schema.Types.ObjectId, ref: 'Application', required: true },
  job: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
  candidate: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  interviewer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  start: { type: Date, required: true },
  end: { type: Date, required: true },
  mode: { type: String, enum: ['video', 'phone', 'onsite'], default: 'video' },
  link: { type: String, trim: true },
  status: { type: String, enum: ['scheduled', 'completed', 'cancelled'], default: 'scheduled' },
  feedback: {
    rating: { type: Number, min: 1, max: 5 },
    comments: { type: String, maxlength: 3000 },
    recommendation: { type: String, enum: ['hire', 'maybe', 'no_hire'] },
    submittedAt: Date,
  },
}, { timestamps: true });
schema.index({ interviewer: 1, start: 1, end: 1 });
schema.index({ candidate: 1, start: 1, end: 1 });
module.exports = model('Interview', schema);
