const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost'; // Modify as per your RabbitMQ server URL

async function connectRabbitMQ(retryCount = 30, interval = 5000) {
  for (let i = 0; i < retryCount; i++) {
    try {
      console.log(`Attempting to connect to RabbitMQ (Attempt ${i + 1}/${retryCount})...`);
      const connection = await amqp.connect(RABBITMQ_URL);
      const channel = await connection.createChannel();
      console.log('Connected to RabbitMQ');
      return { connection, channel };
    } catch (error) {
      console.error('Error connecting to RabbitMQ:', error.message);
      if (i < retryCount - 1) {
        console.log(`Retrying in ${interval / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }
  }
  throw new Error('Failed to connect to RabbitMQ after multiple attempts');
}

module.exports = connectRabbitMQ;
