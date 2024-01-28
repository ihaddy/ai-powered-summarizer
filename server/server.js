const express = require('express');
const { subscribeToProcessingResults } = require('./utils/subscriber');
const cors = require('cors');



const logger = require('./utils/logger'); // Adjust the path as necessary

const loggingMiddleware = (req, res, next) => {
  logger.info(`Incoming request: ${req.method} ${req.url}`, { body: req.body });
  next();
};
const mongoose = require('mongoose');

const redisClient = require('./utils/redisClient'); // Adjust the path as necessary



require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;


app.use((req, res, next) => {
    // Allow OPTIONS method (preflight request) to pass through
    if (req.method === 'OPTIONS') {
        next();
    } else {
        const secureToken = req.headers['securetoken'];
        if (!secureToken) {
            return res.status(403).send('Access Denied');
        }
        // Token exists, proceed to the next middleware
        next();
    }
});

app.use(express.json());
app.use(cors());
app.use(loggingMiddleware); 

redisClient.on('error', (err) => logger.info('Redis Client Error', err));
redisClient.on('connect', () => logger.info('Redis Client Connected'));


const articleRoutes = require('./routes/articleRoutes');
const videoRoutes = require('./routes/videoRoutes');
const chatRoutes = require('./routes/chatRoutes');
const userRoutes = require('./routes/userRoutes');



app.use(articleRoutes);
app.use(videoRoutes);
app.use(chatRoutes);
app.use(userRoutes);


async function initializeServer() {
    try {
        // MongoDB connection
        logger.info('Connecting to MongoDB', process.env.MONGODB_URI);
        await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

        logger.info('Connected to MongoDB');

        // Redis connection and subscribing to RabbitMQ
        redisClient.on('ready', () => {
            logger.info('Redis client ready, now subscribing to processing results.');
            subscribeToProcessingResults();
        });

        // Start server
        app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
    } catch (error) {
        logger.info('Failed to connect to databases:', error);
        process.exit(1);
    }
}

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception at the PM2 server level:', error);
    // Additional cleanup or logging before exit
    process.exit(1); // PM2 will restart the process
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at the PM2 server level:', promise, 'reason:', reason);
    // Application specific logging, throwing an error, or other logic here
});

initializeServer();

module.exports.redisClient = redisClient;