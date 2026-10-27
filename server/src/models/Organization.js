const { Schema, model } = require('mongoose');
module.exports = model('Organization', new Schema({ name: { type: String, required: true, trim: true } }, { timestamps: true }));
