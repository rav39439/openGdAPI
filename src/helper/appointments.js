class appointmentsRepository {
  constructor(redisClient) {
    this.redis = redisClient;
  }
  async getAppointments(slotid) {
    return JSON.parse(await this.redis.get(`${slotid}`)) || [];
  }
  async updateappointments(slotid, slots) {
    await this.redis.set(`${slotid}`, JSON.stringify(slots));
  }
}