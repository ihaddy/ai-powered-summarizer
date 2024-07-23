import Sentry from './instrument';
import amqp, { Connection, Channel } from 'amqplib';

class RabbitMQConnection {
  private static instance: RabbitMQConnection;
  private connection: Connection | null = null;
  private channel: Channel | null = null;

  private constructor() {}

  public static getInstance(): RabbitMQConnection {
    if (!RabbitMQConnection.instance) {
      RabbitMQConnection.instance = new RabbitMQConnection();
    }
    return RabbitMQConnection.instance;
  }

  async initialize(maxRetries = 30, retryDelay = 3000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (!this.connection) {
          this.connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
          
          this.connection.on('close', (err) => {
            console.error('RabbitMQ connection closed', err);
            Sentry.captureException(err); // Capture the error with Sentry
            this.connection = null;
            this.channel = null;
            // Optionally, attempt to reconnect here
            this.initialize().catch(console.error);
          });

          this.channel = await this.connection.createChannel();
          console.log('Successfully connected to RabbitMQ');
          return;
        }
      } catch (error) {
        console.error(`Failed to connect to RabbitMQ (attempt ${attempt}/${maxRetries}):`, error.message);
        Sentry.captureException(error); // Capture the error with Sentry
        if (attempt === maxRetries) {
          const finalError = new Error(`Failed to connect to RabbitMQ after ${maxRetries} attempts`);
          Sentry.captureException(finalError); // Capture the final error with Sentry
          throw finalError;
        }
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  getChannel(): Channel {
    if (!this.channel) {
      const error = new Error('RabbitMQ channel not initialized');
      Sentry.captureException(error); // Capture the error with Sentry
      throw error;
    }
    return this.channel;
  }
}

export default RabbitMQConnection.getInstance();
