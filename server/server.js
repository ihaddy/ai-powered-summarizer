const express = require('express');
const { subscribeToProcessingResults } = require('./utils/subscriber');
const cors = require('cors');
const mongoose = require('mongoose');

const redisClient = require('./utils/redisClient'); // Adjust the path as necessary



require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());
app.use(cors());

redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.on('connect', () => console.log('Redis Client Connected'));


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
        console.log('Connecting to MongoDB', process.env.MONGODB_URI);
        await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

        console.log('Connected to MongoDB');

        // Redis connection and subscribing to RabbitMQ
        redisClient.on('ready', () => {
            console.log('Redis client ready, now subscribing to processing results.');
            subscribeToProcessingResults();
        });

        // Start server
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    } catch (error) {
        console.log('Failed to connect to databases:', error);
        process.exit(1);
    }
}

initializeServer();

module.exports.redisClient = redisClient;