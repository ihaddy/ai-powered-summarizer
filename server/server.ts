import Sentry from './utils/instrument';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { subscribeToProcessingResults } from './utils/subscriber';
import logger from './utils/logger';
import redisClient from './utils/redisClient';
import articleRoutes from './routes/articleRoutes';
import videoRoutes from './routes/videoRoutes';
import chatRoutes from './routes/chatRoutes';
import userRoutes from './routes/userRoutes';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import registerSocketEvents from './utils/socketEvents';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "*",  // Adjust according to your frontend's origin for security
    methods: ["GET", "POST"]
  }
});

const PORT: string | number = process.env.PORT || 3002;

const loggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  logger.info(`Incoming request: ${req.method} ${req.url}`, { body: req.body });
  next();
};

app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'OPTIONS') {
    next();
  } else {
    const secureToken = req.headers['securetoken'];
    if (!secureToken) {
      return res.status(403).send('Access Denied');
    }
    next();
  }
});

app.use(express.json());
app.use(cors());
app.use(loggingMiddleware);

redisClient.on('error', (err) => logger.info('Redis Client Error', err));
redisClient.on('connect', () => logger.info('Redis Client Connected'));

app.use(articleRoutes);
app.use(videoRoutes);
app.use(chatRoutes);
app.use(userRoutes);

registerSocketEvents(io);

async function initializeServer() {
  try {
    logger.info('Connecting to MongoDB', process.env.MONGODB_URI);
    await mongoose.connect(process.env.MONGODB_URI!);
    logger.info('Connected to MongoDB');
    await redisClient.connect();
    redisClient.on('ready', () => {
      logger.info('Redis client ready, now subscribing to processing results.');
    });
    
    subscribeToProcessingResults();
    httpServer.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
  } catch (error) {
    logger.info('Failed to connect to databases:', error);
    Sentry.captureException(error); // Capture the error with Sentry
    process.exit(1);
  }
}

// Add Sentry error handler
Sentry.setupExpressErrorHandler(app);

process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception at the PM2 server level:', error);
  Sentry.captureException(error); // Capture the error with Sentry
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at the PM2 server level:', promise, 'reason:', reason);
  Sentry.captureException(reason); // Capture the error with Sentry
});

initializeServer();

export { redisClient, io };