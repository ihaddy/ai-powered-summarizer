const redis = require('redis');

// Create and configure the Redis client
const client = redis.createClient({
  url: process.env.REDISHOST || 'redis://localhost:6379'
});

client.on('error', (err) => console.log('Redis Client Error', err));
client.on('connect', () => console.log('Redis Client Connected'));

client.connect(); // Make sure to connect the client

module.exports = client;
