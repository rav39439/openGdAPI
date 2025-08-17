const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    specialization: { type: String, required: true, trim: true },
    modes: [{ type: String }],  // e.g. ["online", "offline"]
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    experience: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Doctor', doctorSchema);