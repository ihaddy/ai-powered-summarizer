import Sentry from './instrument';
import rabbitMQConnection from './rabbitMQConnection';

export interface Queues {
  successQueue: string;
  failureQueue: string;
  chatProcessingQueue: string;
  chatSuccessQueue: string;
}

let queues: Queues | null = null;

export async function setupQueues(): Promise<Queues> {
  if (queues) return queues;

  try {
    await rabbitMQConnection.initialize();
    const channel = rabbitMQConnection.getChannel();

    await channel.assertExchange('success', 'fanout', { durable: true });
    await channel.assertExchange('failure', 'fanout', { durable: true });
    await channel.assertExchange('chat-processing', 'fanout', { durable: true });
    await channel.assertExchange('chat-success', 'fanout', { durable: true });

    const successQueue = await channel.assertQueue('');
    const failureQueue = await channel.assertQueue('');
    const chatProcessingQueue = await channel.assertQueue('chat-processing-queue', { durable: true });
    const chatSuccessQueue = await channel.assertQueue('chat-success-queue', { durable: true });

    channel.bindQueue(successQueue.queue, 'success', '');
    channel.bindQueue(failureQueue.queue, 'failure', '');
    channel.bindQueue(chatProcessingQueue.queue, 'chat-processing', '');
    channel.bindQueue(chatSuccessQueue.queue, 'chat-success', '');

    queues = {
      successQueue: successQueue.queue,
      failureQueue: failureQueue.queue,
      chatProcessingQueue: chatProcessingQueue.queue,
      chatSuccessQueue: chatSuccessQueue.queue
    };

    return queues;
  } catch (error) {
    Sentry.captureException(error); // Capture the error with Sentry
    throw error; // Re-throw the error after capturing it
  }
}

export function getQueues(): Queues {
  if (!queues) {
    const error = new Error('Queues not initialized');
    Sentry.captureException(error); // Capture the error with Sentry
    throw error;
  }
  return queues;
}
