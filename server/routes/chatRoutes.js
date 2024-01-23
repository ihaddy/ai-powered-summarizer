const express = require('express');
const Chat = require('../models/chatModel');
const redisClient = require('../utils/redisClient');
const router = express.Router();

router.get('/chat/:articleId', async (req, res) => {
    console.log(`GET /chat/${req.params.articleId} - Request received to retrieve chat log`);
    try {
        const articleId = req.params.articleId;
        console.log(`Attempting to retrieve chat log from Redis cache for articleId: ${articleId}`);
        const cachedChatLog = await redisClient.get(`chat:${articleId}`);
        if (cachedChatLog) {
            console.log('Found chat log in Redis cache');
            return res.status(200).json(JSON.parse(cachedChatLog));
        }

        console.log(`Chat log not in Redis cache, querying MongoDB for articleId: ${articleId}`);
        const chatLog = await Chat.findOne({ articleId: articleId }); // Mongoose findOne
        if (chatLog) {
            console.log('Found chat log in MongoDB, caching in Redis');
            await redisClient.set(`chat:${articleId}`, JSON.stringify(chatLog));
            res.status(200).json(chatLog);
        } else {
            console.log('Chat log not found for articleId:', articleId);
            res.status(404).send({ message: 'Chat log not found.' });
        }
    } catch (error) {
        console.error('GET /chat/:articleId - Error:', error);
        res.status(500).send({ error: error.message });
    }
});

router.get('/chathistory', async (req, res) => {
    console.log('GET /articles - Request received to retrieve all article IDs');
    try {
        console.log('Querying MongoDB for all article IDs');
        const chatLogs = await Chat.find({}, 'articleId'); // Mongoose find
        const articleIds = chatLogs.map(chat => chat.articleId);
        console.log('Successfully retrieved article IDs');
        res.status(200).json(articleIds);
    } catch (error) {
        console.error('GET /articles - Error:', error);
        res.status(500).send({ error: error.message });
    }
});

module.exports = router;