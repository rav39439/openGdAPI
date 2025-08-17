// redisClient.js
const { createClient } = require('redis');

const redisUrl ='redis://localhost:6379';

// const client = createClient({
//   url: redisUrl
// });

const client = createClient({
  // url: `redis://${process.env.REDIS_HOST || "localhost"}:${process.env.REDIS_PORT || 6379}`,
    url: `redis://default:${process.env.REDIS_TOKEN}@exotic-raccoon-51584.upstash.io:6379`

});


client.on('error', (err) => console.error('❌ Redis Error:', err));
client.on('connect', () => console.log('✅ Connected to Redis'));

(async () => {
  if (!client.isOpen) {
    await client.connect();
  }
})();

module.exports = client;
