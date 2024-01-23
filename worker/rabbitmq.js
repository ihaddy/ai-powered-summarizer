import amqp from 'amqplib';

const RABBITMQ_URL = 'amqp://localhost'; // Modify as per your RabbitMQ server URL

async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    return { connection, channel };
  } catch (error) {
    console.error('Error connecting to RabbitMQ:', error);
    process.exit(1);
  }
}


export default connectRabbitMQ;