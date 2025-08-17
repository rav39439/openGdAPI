const mongoose = require('mongoose');

const appointSchema = new mongoose.Schema(
  {
    // appointmentId: { type: String, required: true, trim: true, unique: true }, // renamed to avoid clash with _id
    doctorId: { type: String, required: true },
    start: { type: Date, required: true }, 
    end: { type: Date, required: true },
    status: { 
      type: String, 
      required: true, 
      enum: ["available", "locked", "booked","completed"], // optional: control values
      default: "available" 
    },
    startTime:{ type: String, required: true },
        endTime:{ type: String, required: true },

    slotId: { type: String, required: true },
    phoneNumber: { type: String },
    bookedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Appointment', appointSchema);