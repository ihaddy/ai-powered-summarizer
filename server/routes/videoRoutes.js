const express = require('express');
const verifyJWT = require('../utils/verifyJWT'); 
const { v4: uuidv4 } = require('uuid');
const Chat = require('../models/chatModel');
const redisClient = require('../utils/redisClient');
const router = express.Router();
const connectRabbitMQ = require('../utils/rabbitmq');
const axios = require('axios');
const logger = require('../utils/logger');

router.post('/summarize-videos',verifyJWT, async (req, res) => {
    const userId = req.user.userId; // Access userId from req.user
    const userEmail = req.user.email; // Access email from req.user
    console.log('POST /summarize-videos - Request received:', req.body);
    const videoId = req.body.videoId;
    let dataToSend = {};

    try {
        // Refactored Redis cache key to include userId
        const userDataKey = `user:${userId}:videoData:${videoId}`;

        console.log(`Checking Redis cache for videoData with key: ${userDataKey}`);
        const cachedData = await redisClient.get(userDataKey);

        if (cachedData) {
            console.log('Found cached data in Redis for videoId:', videoId);
            dataToSend = JSON.parse(cachedData);
        } else {
            // Refactored MongoDB query to include userId
            console.log(`Checking MongoDB for videoData with videoId: ${videoId}`);
            let videoData = await Chat.findOne({ userId: userId, videoId: videoId }, 'transcript description title');

            if (videoData) {
                console.log('Found videoData in MongoDB for videoId:', videoId);
                await redisClient.set(userDataKey, JSON.stringify(videoData));
                dataToSend = videoData;
            } else {
                console.log(`Generating videoData for videoId: ${videoId} using Python script`);

                try {
                    const response = await axios.get(`http://flask-app:5000/scrape?video_id=${videoId}`);
                    videoData = response.data;

                    if (!videoData.title || !videoData.description || !videoData.transcript) {
                        logger.warn('One or more fields (title, description, transcript) are missing in the video data');
                    }

                    const articleId = uuidv4();

                    // Update MongoDB with new data for user
                    await Chat.updateOne({ userId: userId, videoId: videoId }, { $set: { articleId: articleId, ...videoData } }, { upsert: true });

                    // Update Redis cache with user-specific data
                    await redisClient.set(userDataKey, JSON.stringify({ articleId: articleId, ...videoData }));

                    dataToSend = { articleId: articleId, ...videoData };
                } catch (fetchError) {
                    console.error(`Error fetching data from Flask service: ${fetchError.message}`);
                    throw new Error(fetchError.message);
                }
            }
        }

        // Refactored RabbitMQ message to include userId and userEmail
        console.log('Sending video data with user info to RabbitMQ for processing');
        const { channel } = await connectRabbitMQ();
        const queue = 'videosummary';
        await channel.assertQueue(queue, { durable: true });
        console.log('userid as its passed in the queue', userId)
        channel.sendToQueue(queue, Buffer.from(JSON.stringify({ userId, userEmail, videoId, ...dataToSend })));

        res.status(200).send(dataToSend);
    } catch (error) {
        console.error('POST /summarize-videos - Error:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});

module.exports = router;