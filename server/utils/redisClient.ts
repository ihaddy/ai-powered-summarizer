import { createClient } from 'redis';

// Create and configure the Redis client
const client = createClient({
  url: process.env.REDISHOST || 'redis://localhost:6379'
});

client.on('error', (err) => console.log('Redis Client Error', err));
client.on('connect', () => console.log('Redis Client Connected'));

export default client;