// const SLOTS = new Map();
const crypto = require("crypto");
const cron = require("node-cron");

const {
  SLOTS,
  cleanup,
  Cancelslot,
  completeAppointment,
  soonestAvailabilityForDoctor,
  isSlotLockedOrBooked,
  addMinutes,
  toISO,
  rescheduleAppointment,
  diffHours,
  Cancelandremove,
  generateTodaySlots,
} = require("../helper/helpermethods");
const {
  getAllSlots,
  getSlotsByDoctor,
  updateSlots,
  flush,
} = require("../redis/slotsredis");

// const {Doctor}=require('../model/doctormodel')
const Doctor = require("../model/doctormodel");
const appointSchema = require("../model/appointmentmodel");

// app.get('/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Create/update doctor
const addDoctors = async (req, res) => {
  try {
    const doctor = new Doctor(req.body);
    await doctor.save();
    res.status(201).json(doctor);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const cancelappointment = async (req, res) => {
  try {
    let done = await Cancelslot(req.body.slotId, req.body.doctorId);
    const updatedslots = await getSlotsByDoctor(req.body.doctorId);

    if (done) {
      res
        .status(201)
        .json({
          message: "APpointment successfully cancelled",
          slots: updatedslots,
        });
    } else {
      res
        .status(201)
        .json({
          message: "APpointment cannot be cancelled",
          slots: updatedslots,
        });
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const cancelandremove = async (req, res) => {
  try {
    let done = await Cancelandremove(req.body.slotId, req.body.appid);

    if (done) {
      res.status(201).json({ message: "APpointment successfully cancelled" });
    } else {
      res.status(201).json({ message: "APpointment cannot be cancelled" });
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const getselectedDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!doctor) return res.status(404).json({ error: "Doctor not found" });
    const slots = await getSlotsByDoctor(req.params.id);
    // const updatedslots=removeFutureAppointments(slots)
    res.json({ doctor: doctor, slots: slots });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

function removeFutureAppointments(slots) {
  const now = new Date();

  // Keep only slots that already ended (end <= now)
  const pastAppointments = slots.filter((slot) => new Date(slot.end) >= now);

  return pastAppointments;
}

// Doctor discovery
const getDoctors = async (req, res) => {
  cleanup();
  const { specialization, mode, sort } = req.query;
  let filter = {};
  if (specialization) filter.specialization = new RegExp(specialization, "i");
  if (mode) filter.modes = { $in: [mode.toLowerCase()] };

  let doctors = await Doctor.find(filter).lean();
  if (sort === "soonest") {
    doctors = doctors
      .map((d) => ({
        ...d,
        soonestAvailability: soonestAvailabilityForDoctor(d._id.toString()),
      }))
      .sort((a, b) => {
        if (!a.soonestAvailability && !b.soonestAvailability) return 0;
        if (!a.soonestAvailability) return 1;
        if (!b.soonestAvailability) return -1;
        return a.soonestAvailability - b.soonestAvailability;
      })
      .map((d) => ({
        ...d,
        soonestAvailability: d.soonestAvailability
          ? d.soonestAvailability.toISOString()
          : null,
      }));
  }
  res.json({ count: doctors.length, items: doctors });
};

// Get slots for a doctor
const getdoctorslots = async (req, res) => {
  cleanup();
  const { doctorId } = req.params;
  const from = req.query.from ? new Date(req.query.from) : new Date();
  const to = req.query.to
    ? new Date(req.query.to)
    : addMinutes(new Date(), 60 * 24 * 7);
  const allSLOTS = await getSlotsByDoctor(doctorId);
  // console.log(doctorId)
  // console.log(allSLOTS)
  const items = allSLOTS
    .filter((s) => new Date(s.start) >= from && new Date(s.start) <= to)
    .sort((a, b) => new Date(a.start) - new Date(b.start))
    .map((s) => ({ ...s, available: !isSlotLockedOrBooked(s.id) }));

  res.json({ count: items.length, items });
};

const bookSlot = async (req, res) => {
  const slotId = req.body.slotId;
  const userPhone = req.body.userPhone;
  // console.log(slotId)
  // console.log(userPhone)
  const slots = await getAllSlots();
  let doctorids = Object.keys(slots);
  let doctorappoints = doctorids.map((val) => slots[val]).flat();
  const index = doctorappoints.findIndex((s) => s.id == slotId);
  if (index == -1) {
    return res.status(200).json({ slots: slots, status: "slot Not found" });
  }

  const slot = doctorappoints[index];

  // Check if slot is already booked or locked
  if (slot.status === "booked" || slot.status === "locked") {
    return res
      .status(200)
      .json({ slots: slots, status: "already locked or booked" });
  }

  // Generate a 6-digit code
  const code = crypto.randomInt(100000, 999999).toString();
  const i = slots[slot.doctorId].findIndex((s) => s.id == slotId);
  // Lock the slot

  slots[slot.doctorId][i].status = "locked";
  slots[slot.doctorId][i]["otpcode"] = code;
  slots[slot.doctorId][i]["phoneNumber"] = userPhone;
  slots[slot.doctorId][i]["otpexpiresAt"] = Date.now() + 5 * 60 * 1000; // 5 minutes
  updateSlots(slot.doctorId, slots[slot.doctorId]);

  // Simulate sending code to user (SMS/email integration here)
  console.log(`📩 Sending booking code ${code} to ${userPhone}`);
  const updatedslots = await getSlotsByDoctor(slot.doctorId);
  return res.status(201).json({
    message: "Appointment locked",
    code: code,
    slots: updatedslots,
    slot: slots[slot.doctorId][i],
  });
};

cron.schedule("* * * * *", async () => {
  // every minute
  const slots = await getAllSlots();
  console.log("cron job started");

  //  try{
  //     const doctors = await Doctor.find({});
  //   for (const doctor of doctors) {
  //     await generateTodaySlots(doctor._id);
  //   }
  //   console.log("Slots generated for all doctors");
  // } catch (err) {
  //   console.error("Error generating slots:", err);
  // }
  for (const doctorId of Object.keys(slots)) {
    for (let slot of slots[doctorId]) {
      if (slot.status === "locked" && slot.otpexpiresAt < Date.now()) {
        slot.status = "available";
        delete slot.otpcode;
        delete slot.otpexpiresAt;
        delete slot.phoneNumber;

        await updateSlots(doctorId, slots[doctorId]);
        console.log(`Slot ${slot.id} released automatically`);
      }

      if (slot.end && slot.end < Date.now() && slot.status !== "completed") {
        slot.status = "completed";
        await updateSlots(doctorId, slots[doctorId]);
        console.log(`Slot ${slot.id} marked as completed`);
      }
    }
  }
});

cron.schedule("0 0 * * *", async () => {
  console.log("Running daily flush job");
  try {
    const doctors = await Doctor.find({});
    for (const doctor of doctors) {
      await generateTodaySlots(doctor._id);
    }
    console.log("Slots generated for all doctors");
  } catch (err) {
    console.error("Error generating slots:", err);
  }
  await flush();
});

const confirmBooking = async (req, res) => {
  try {
    const slotId = req.body.slotId;
    const enteredCode = req.body.enteredCode;
    
    // const pending = PENDING_BOOKINGS.get(slotId);
    const slots = await getAllSlots();
    let doctorids = Object.keys(slots);
    let doctorappoints = doctorids.map((val) => slots[val]).flat();
    const index = doctorappoints.findIndex((s) => s.id == slotId);
    if (index == -1) {
      return res
        .status(200)
        .json({
          slots: slots[doctorappoints[index].doctorId],
          status: "slot Not found",
        });
    }

    const slot = doctorappoints[index];
    if (slot.otpcode != enteredCode) {
      return res
        .status(200)
        .json({ slots: slots, status: "eitherlocked or not available" });
    }
    const i = slots[slot.doctorId].findIndex((s) => s.id == slotId);

    slots[slot.doctorId][i].status = "booked";
    slots[slot.doctorId][i].bookedAt = Date.now();
    delete slots[slot.doctorId][i].otpcode;
    delete slots[slot.doctorId][i].otpexpiresAt;
    await updateSlots(slot.doctorId, slots[slot.doctorId]);
    const startTime = new Date(slot.start).getTime();
    const completeAt = startTime + 45 * 60 * 1000;
    const delay = completeAt - Date.now();

    if (delay > 0) {
      setTimeout(() => {
        completeAppointment(slot.slotId, slot.doctorId);
      }, delay);
    }

    console.log(`✅ Booking confirmed for slot ${slotId}`);
    const updatedslots = await getSlotsByDoctor(slot.doctorId);
    console.log( slots[slot.doctorId][i])
    let s = slots[slot.doctorId][i];
    const d = {
      doctorId: s.doctorId,
      start: s.start,
      end: s.end,
      status: s.status,
      slotId: s.id,
            startTime: s.startTime,
            endTime: s.endTime,
      phoneNumber: s.phoneNumber,
      bookedAt: s.bookedAt,
    };


    const apppointment = new appointSchema(d);
    await apppointment.save();
    return res.status(200).json({ status: "confirmed", slots: updatedslots });
  } catch (error) {
    console.log(error);
    res.status(400).json({ error: "Something went wrong" });
  }
};

const getTodayISTStart = () => {
  const now = new Date();
  const ist = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
  ist.setHours(0, 0, 0, 0); // set to 00:00 IST today
  return ist;
};

// function convertUTCtoIST(utcDateStr) {
//   const utcDate = new Date(utcDateStr);

//   // IST is UTC + 5:30
//   const istOffset = 5 * 60 + 30; // in minutes
//   const istDate = new Date(utcDate.getTime() + istOffset * 60000);

//   // Format as ISO string with +05:30
//   const istISOString =
//     istDate.toISOString().slice(0, 19) + "+05:30";

//   return istISOString;
// }
function convertUTCtoIST(utcDateStr) {
  const utcDate = new Date(utcDateStr);

  // IST = UTC + 5:30
  const istOffset = 5 * 60 + 30; // in minutes
  const istTime = utcDate.getTime() + istOffset * 60000;

  return new Date(istTime); // Returns a Date object in IST
}
// Upcoming Appointments
const getUpcomingAppointmentsByPhone = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: "Phone number is required" });

    const now = new Date();
    const todayISTStart = getTodayISTStart();

    const appointments = await appointSchema.find({ phoneNumber: phone });
    console.log(new Date(appointments[0].endTime))
    console.log(todayISTStart)

    // Upcoming = slots ending today or later
    const upcoming = appointments
      .filter((appt) => convertUTCtoIST(appt.end) > convertUTCtoIST(todayISTStart))
      .sort((a, b) => new Date(convertUTCtoIST(a.startTime)) - new Date(convertUTCtoIST(b.startTime)));

    return res.status(200).json({ appointments: upcoming });
  } catch (error) {
    console.error("Error fetching upcoming appointments:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

const getPastAppointmentsByPhone = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: "Phone number is required" });

    const todayISTStart = getTodayISTStart();

    const appointments = await appointSchema.find({ phoneNumber: phone });

    // Past = slots ending before today
     const past = appointments
      .filter((appt) => convertUTCtoIST(appt.end) < convertUTCtoIST(todayISTStart))
      .sort((a, b) => new Date(convertUTCtoIST(a.startTime)) - new Date(convertUTCtoIST(b.startTime)));

    return res.status(200).json({ appointments: past });
  } catch (error) {
    console.error("Error fetching past appointments:", error);
    return res.status(500).json({ error: "Server error" });
  }
};




module.exports = {
  getUpcomingAppointmentsByPhone,
  getPastAppointmentsByPhone,
  getdoctorslots,
  confirmBooking,
  bookSlot,
  getDoctors,
  getselectedDoctor,
  addDoctors,
  cancelappointment,
  rescheduleAppointment,
  cancelandremove,
};

// TODO: The rest of the booking, confirm, reschedule, cancel, and dashboard routes remain the same as before.
//       You just replace `DOCTORS` array lookups with MongoDB `Doctor.findById()` when needed.

// ----------------------
// Start server
// ----------------------
