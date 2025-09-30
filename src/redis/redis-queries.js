const redis = require('../db/db');

async function updateSlots(doctorId, slots) {
  await redis.set(`slots:${doctorId}`, JSON.stringify(slots));
}

async function getSlots(doctorId) {
  const data = await redis.get(`slots:${doctorId}`);
  console.log(JSON.parse(data))
  return data ? JSON.parse(data) : [];
}

async function getSlotsByDoctor(doctorId) {
  const data = await redis.get(`slots:${doctorId}`);
  if (!data) return [];

  const slotsObj = JSON.parse(data); // { slotId1: {...}, slotId2: {...}, ... }

  // Extract values and filter by doctorId
  const slotsArray = Object.values(slotsObj).filter(
    slot => slot.doctorId === doctorId
  );

  return slotsArray;
}


async function flush() {
const keys = await redis.keys("slots:*");
  if (keys.length > 0) {
    await redis.del(keys);
  }
}

async function getAllSlots() {
  // 1️⃣ Get all keys
  const keys = await redis.keys('slots:*');
  if (!keys.length) return {};

  // 2️⃣ Fetch values for each key
  const values = await redis.mGet(keys);

  // 3️⃣ Build result object: { doctorId: slots[] }
  const result = {};
  keys.forEach((key, index) => {
    const doctorId = key.split(':')[1];
    result[doctorId] = values[index] ? JSON.parse(values[index]) : [];
  });

  return result;
}

async function deleteSlot(doctorId, slotToDelete) {
  // 1️⃣ Get current slots
  const currentSlots = await getSlots(doctorId);

  // 2️⃣ Filter out the slot
  const updatedSlots = currentSlots.filter(slot => slot.id !== slotToDelete);

  // 3️⃣ Save back to Redis
  await updateSlots(doctorId, updatedSlots);

  return updatedSlots;
}

module.exports = { flush, updateSlots, getSlots,getSlotsByDoctor,getAllSlots,deleteSlot };