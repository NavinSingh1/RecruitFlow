const { Schema, model } = require('mongoose');
const bcrypt = require('bcryptjs');
const schema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 8, select: false },
  role: { type: String, enum: ['admin', 'recruiter', 'candidate'], required: true },
  // Candidates have no organization; staff always belong to exactly one.
  organization: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
}, { timestamps: true });

schema.pre('save', async function (next) {
  if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 12);
  next();
});
schema.methods.matchPassword = function (plain) { return bcrypt.compare(plain, this.password); };
schema.methods.toSafe = function () {
  return { id: this._id, name: this.name, email: this.email, role: this.role, organization: this.organization };
};
module.exports = model('User', schema);
