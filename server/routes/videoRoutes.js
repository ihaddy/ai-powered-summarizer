const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Chat = require('../models/chatModel');
const redisClient = require('../utils/redisClient');
const router = express.Router();
const connectRabbitMQ = require('../utils/rabbitmq');
const axios = require('axios');

router.post('/summarize-videos', async (req, res) => {
    console.log('POST /summarize-videos - Request received:', req.body);
    const videoId = req.body.videoId;
    let dataToSend = {};

    try {
        // Check in Redis cache first using videoId
        console.log(`Checking Redis cache for videoData with videoId: ${videoId}`);
        const cachedData = await redisClient.get(`videoData:${videoId}`);

        if (cachedData) {
            console.log('Found cached data in Redis for videoId:', videoId);
            dataToSend = JSON.parse(cachedData);
        } else {
            // Check in MongoDB if not in cache using videoId
            console.log(`Checking MongoDB for videoData with videoId: ${videoId}`);
            let videoData = await Chat.findOne({ videoId: videoId }, 'transcript description title');

            if (videoData && videoData.transcript && videoData.description && videoData.title) {
                console.log('Found complete videoData in MongoDB for videoId:', videoId);
                await redisClient.set(`videoData:${videoId}`, JSON.stringify(videoData));
                dataToSend = videoData;
            } else {
                // If not in cache or DB, proceed to generate video data
                console.log(`Generating videoData for videoId: ${videoId} using Python script`);

                try {
                    const response = await axios.get(`http://flask-app:5000/scrape?video_id=${videoId}`);
                    videoData = response.data;

                    console.log('Video data fetched from Flask service:', videoData);





                    console.log('Video data generated from Python script:', videoData);

                    // Validate and handle missing fields
                    if (!videoData.title || !videoData.description || !videoData.transcript) {
                        // Handle missing fields, e.g., set default values or log warnings
                        logger.warn('One or more fields (title, description, transcript) are missing in the video data');
                    }

                    // Generate a unique UUID for the video
                    const articleId = uuidv4();

                    // Update MongoDB with new data
                    await Chat.updateOne({ videoId: videoId }, { $set: { articleId: articleId, ...videoData } }, { upsert: true });
                    console.log('MongoDB updated with new video data for videoId:', videoId);

                    // Update Redis cache
                    await redisClient.set(`videoData:${videoId}`, JSON.stringify({ articleId: articleId, ...videoData }));
                    console.log('Redis cache updated for videoId:', videoId);

                    dataToSend = { articleId: articleId, ...videoData };
                } catch (fetchError) {
                    console.error(`Error fetching data from Flask service: ${fetchError.message}`);
                    throw new Error(fetchError.message);
                }
            }
        }

        // Send to RabbitMQ for processing
        console.log('Sending video data to RabbitMQ for processing');
        const { channel } = await connectRabbitMQ();
        const queue = 'videosummary';
        await channel.assertQueue(queue, { durable: true });
        channel.sendToQueue(queue, Buffer.from(JSON.stringify({ videoId, ...dataToSend })));
        console.log('Sent video data to RabbitMQ for processing');

        res.status(200).send(dataToSend);
    } catch (error) {
        console.error('POST /summarize-videos - Error:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});




module.exports = router;
