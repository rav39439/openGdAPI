const {
  flush,
  deleteSlot,
  getSlotsByDoctor,
  getSlots,
  getAllSlots,
  updateSlots,
} = require("../redis/slotsredis");
const crypto = require("crypto");
const appointSchema = require("../model/appointmentmodel");

const PENDING_BOOKINGS = new Map(); // { slotId: { code, expiresAt } }

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}
function diffHours(a, b) {
  return (a.getTime() - b.getTime()) / 3600000;
}
function toISO(d) {
  return new Date(d).toISOString();
}

const getSlotsForDoctor = (doctorId) => {
  const SLOTS = getSlots(doctorId);
  return SLOTS;
};

async function completeAppointment(slotId, doctorId) {
  const slots = await getSlotsByDoctor(doctorId); // ✅ await here
  const index = slots.findIndex((s) => s.slotId == slotId);

  if (index == -1) return false;

  const appt = slots[index];
  // if (!APPOINTMENTS.has(slotId)) return;

  // const appt = APPOINTMENTS.get(slotId);
  appt.status = "completed";

  // Save to DB here
  console.log(`💾 Saving completed appointment for ${slotId} to database`);
  // e.g., await db.collection("appointments").insertOne(appt);

  // Remove from temporary store
  deleteSlot(doctorId, slotId);
  // APPOINTMENTS.delete(slotId);
}

const Cancelslot = async (slot, doctorId) => {
  const now = new Date();
 
    const SLOTS = await getSlotsByDoctor(doctorId);

  const slotdata=SLOTS.find(s=>s.id==slot)

  const slotStart = new Date(slotdata.start);
  const hoursUntil = (slotStart - now) / (1000 * 60 * 60);
  if (hoursUntil < 24) {
    let sl = SLOTS.findIndex((s => (s.id == slotdata.id) && (s.doctorId == doctorId)));
    SLOTS[sl].status = "available";
    delete SLOTS[sl].bookedAt
    delete slot.phoneNumber;
    delete slot.otpcode;
    delete slot.otpexpiresAt
;

    await updateSlots(doctorId, SLOTS);
    return true;
  } else {
    return false;
  }
};

const Cancelandremove = async (slot, appid) => {
  const now = new Date();
 const slots = await getAllSlots();
  let doctorids = Object.keys(slots);
  let doctorappoints = doctorids.map((val) => slots[val]).flat();
  const slotdata=doctorappoints.find(s=>s.id==slot)
  const slotStart = new Date(slotdata.start);
  const hoursUntil = (slotStart - now) / (1000 * 60 * 60);
  if (hoursUntil < 24) {
    let sl = slots[slotdata.doctorId].findIndex((s => (s.id == slotdata.id) && (s.doctorId == slotdata.doctorId)));
    slots[slotdata.doctorId][sl].status = "available";
    delete slots[slotdata.doctorId][sl].bookedAt
    delete slot.phoneNumber;
    delete slot.otpcode;
    delete slot.otpexpiresAt
    await updateSlots(slotdata.doctorId, slots[slotdata.doctorId]);
    await appointSchema.deleteOne({ _id: appid });

    return true;
  } else {
    return false;
  }
};

const rescheduleAppointment = async (req, res) => {
  try {
    console.log("ssssssssss")
    console.log(req.body)
    const { prevSlotId, newSlotTime ,userPhone} = req.body;

    // 1️⃣ Fetch all slots
    const slots = await getAllSlots();
  let doctorids = Object.keys(slots);
  let doctorappoints = doctorids.map((val) => slots[val]).flat();

    // 2️⃣ Find and release previous slot
    const prevIndex = doctorappoints.findIndex(s => s.id === prevSlotId);
    if (prevIndex === -1) {
      return res.status(400).json({ error: 'Previous slot not found' });
    }

    const prevSlot =doctorappoints[prevIndex];

    // Check if reschedule is allowed (>24h)
    const now = Date.now();
    if (prevSlot.start - now > 24 * 60 * 60 * 1000) {
      return res.status(400).json({ error: 'Cannot reschedule within 24h of appointment' });
    }

    let docIndex=slots[prevSlot.doctorId].findIndex(s => s.id === prevSlotId)
    // Release previous slot
    slots[prevSlot.doctorId][docIndex].status = "available";
    delete slots[prevSlot.doctorId][docIndex].otpcode;
    delete slots[prevSlot.doctorId][docIndex].bookedAt;
    delete slots[prevSlot.doctorId][docIndex].phoneNumber;

    await updateSlots(prevSlot.doctorId, slots[prevSlot.doctorId]);
    await appointSchema.deleteOne({ slotId: slots[prevSlot.doctorId][docIndex].id });

    console.log(`Previous slot ${prevSlotId} released`);

    // 3️⃣ Find new slot
    const newIndex = slots[prevSlot.doctorId].findIndex(s => s.id == newSlotTime);
    if (newIndex === -1) {
      return res.status(400).json({ error: 'New slot not found' });
    }

    const newSlot = slots[prevSlot.doctorId][newIndex];
    let result="proccessing"
    try{
       result= await bookSlot(newSlot.id, userPhone);
          return res.status(200).json({ message: "completed rescheduling",result:result });

    }
    catch(error){
      console.log(error)
          return res.status(500).json({ error: result });

    }

  } catch (error) {
    console.error('Reschedule error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


const bookSlot = async (slotId, userPhone) => {
  const slots = await getAllSlots();
  let doctorids = Object.keys(slots);
  let doctorappoints = doctorids.map((val) => slots[val]).flat();
  const index = doctorappoints.findIndex((s) => s.id == slotId);
  if (index == -1) {
  return "error"
  }

  const slot = doctorappoints[index];

  // Check if slot is already booked or locked
  if (slot.status === "booked" || slot.status === "locked") {
    return "already locked or booked";
  }

  // Generate a 6-digit code
  const code = crypto.randomInt(100000, 999999).toString();

  const i = slots[slot.doctorId].findIndex((s) => s.id == slotId);

  slots[slot.doctorId][i].status = "booked";
  // slots[slot.doctorId][i]["otpcode"] = code;
   slots[slot.doctorId][i].bookedAt = Date.now();

  slots[slot.doctorId][i]["phoneNumber"] = userPhone;

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

  // slots[slot.doctorId][i]["otpexpiresAt"] = Date.now() + 5 * 60 * 1000; // 5 minutes
  updateSlots(slot.doctorId, slots[slot.doctorId]);
  const updatedslots = await getSlotsByDoctor(slot.doctorId);
  return {message:"Appointment booked",slots:updatedslots}
};


const isSlotLockedOrBooked = async (slotId, doctorId) => {
  // cleanup();
  const SLOTS = await getSlotsByDoctor(doctorId);
  for (const appt of SLOTS) {
    if (
      (appt.id === slotId && appt.status === "Booked") ||
      appt.status === "locked"
    )
      return true;
  }
  return false;
};

const soonestAvailabilityForDoctor = async (doctorId) => {
  const now = new Date();
  const SLOTS = getSlots(doctorId);
  const relevant = SLOTS.filter(
    (s) => s.doctorId === doctorId && new Date(s.start) > now
  );
  relevant.sort((a, b) => new Date(a.start) - new Date(b.start));
  for (const s of relevant) {
    if (!isSlotLockedOrBooked(s.id, doctorId)) return new Date(s.start);
  }
  return null;
};



// const generateTodaySlots = async (doctor) => {
//   const today = new Date();
//   today.setHours(0, 0, 0, 0); // Reset to today's midnight (server local time)

//   const slots = await getSlots(doctor._id);
//   const slotsArray = Object.values(slots);
//   const existing = slotsArray.filter(
//     (slot) =>
//       slot.doctorId === doctor._id.toString() &&
//       new Date(slot.start).toDateString() === today.toDateString()
//   );

//   if (existing.length > 0) {
//     console.log(`Slots already exist for doctor ${doctor._id}`);
//     return;
//   }

//   console.log(`Generating slots for doctor ${doctor._id} for today...`);
//   let dataarr = [];

//   // 9 AM to 6 PM = 9 hours => 18 slots of 30 mins
//   const startHour = 9;
//   const endHour = 18;
//   const slotDuration = 30; // minutes

//   for (let h = startHour; h < endHour; h++) {
//     for (let m = 0; m < 60; m += slotDuration) {
//       const start = new Date(today);
//       start.setHours(h, m, 0, 0);

//       const end = new Date(start.getTime() + slotDuration * 60000);

//       // Convert to IST manually (attach +05:30 instead of Z)
//       const startIST =
//         new Date(start.getTime() - start.getTimezoneOffset() * 60000)
//           .toISOString()
//           .slice(0, 19) + "+05:30";

//       const endIST =
//         new Date(end.getTime() - end.getTimezoneOffset() * 60000)
//           .toISOString()
//           .slice(0, 19) + "+05:30";

//       const slotId = `slot_${doctor._id}_${startIST}`;

//       let obj = {
//         id: slotId,
//         doctorId: doctor._id.toString(),
//         name: doctor.name,
//         start: startIST,
//         end: endIST,
//         status: "available",
//       };

//       dataarr.push(obj);
//     }
//   }

//   updateSlots(doctor._id, dataarr);
// };

const generateTodaySlots = async (doctor) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset to today's midnight

  const slots = await getSlots(doctor._id);
  const slotsArray = Object.values(slots);
  const existing = slotsArray.filter(
    (slot) =>
      slot.doctorId === doctor._id.toString() &&
      new Date(slot.start).toDateString() === today.toDateString()
  );

  if (existing.length > 0) {
    console.log(`Slots already exist for doctor ${doctor._id}`);
    return;
  }

  console.log(`Generating slots for doctor ${doctor._id} for today...`);
  let dataarr = [];

  const startHour = 9;
  const endHour = 18;
  const slotDuration = 30; // minutes

  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += slotDuration) {
      const start = new Date(today);
      start.setHours(h, m, 0, 0);

      const end = new Date(start.getTime() + slotDuration * 60000);

      // IST strings (immutable)
      const startTime = start.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
      const endTime = end.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

      const slotId = `slot_${doctor._id}_${startTime.replace(/[\s,:]/g, "_")}`;

      let obj = {
        id: slotId,
        doctorId: doctor._id.toString(),
        name: doctor.name,
        start, // Date object (still queryable)
        end,   // Date object (still queryable)
        startTime, // IST string, stored as-is
        endTime,   // IST string, stored as-is
        status: "available",
      };

      dataarr.push(obj);
    }
  }

  updateSlots(doctor._id, dataarr);
};

const cleanup = async () => {
  const now = new Date();
  const allSLOTS = await getAllSlots();
  for (const appt of Object.values(allSLOTS)) {
    if (appt.status === "Booked") {
      const slot = getSlots(appt.id);
      if (slot && new Date(slot.end) <= now) {
        appt.status = "Completed";
        appt.updatedAt = toISO(now);
      }
    }
  }
};
setInterval(cleanup, 15 * 1000);

module.exports = {
  PENDING_BOOKINGS,
  completeAppointment,
  getSlotsForDoctor,
  Cancelslot,
  cleanup,
  generateTodaySlots,
  soonestAvailabilityForDoctor,
  isSlotLockedOrBooked,
  addMinutes,
  toISO,
  diffHours,
  rescheduleAppointment,
  Cancelandremove
};
