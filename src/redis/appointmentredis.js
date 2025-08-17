const redis = require('../db/db')

async function updateAppointment(slotId, appointmentData) {
  await redis.set(`appointment:${slotId}`, JSON.stringify(appointmentData));
}

async function getAppointment(slotId) {
  const data = await redis.get(`appointment:${slotId}`);
  return data ? JSON.parse(data) : null;
}

async function deleteAppointment(slotId) {
  await redis.del(`appointment:${slotId}`);
}

/**
 * Get all appointments in Redis
 */
async function getAllAppointments() {
  const keys = await redis.keys('appointment:*'); // find all appointment keys
  if (keys.length === 0) return [];

  const values = await redis.mget(keys); // get all appointments in one go
  return values.map(v => JSON.parse(v));
}

module.exports = {
  updateAppointment,
  getAppointment,
  deleteAppointment,
  getAllAppointments
};