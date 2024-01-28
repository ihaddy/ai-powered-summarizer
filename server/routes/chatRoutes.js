const express = require('express');
const Chat = require('../models/chatModel');
const redisClient = require('../utils/redisClient');
const router = express.Router();
const verifyJWT = require('../utils/verifyJWT'); 
const logger = require('../utils/logger');


router.get('/chat/:articleId', verifyJWT, async (req, res) => {
    const userId = req.user.userId;
    console.log(`GET /chat/${req.params.articleId} - Request received to retrieve chat log`);

    try {
        const articleId = req.params.articleId;

        console.log(`Fetching chat log from MongoDB for userId: ${userId}, articleId: ${articleId}`);
        const chatLog = await Chat.findOne({ userId: userId, articleId: articleId });

        if (chatLog) {
            console.log('Found chat log in MongoDB');
            res.status(200).json(chatLog);
        } else {
            console.log('Chat log not found for userId:', userId, 'articleId:', articleId);
            res.status(404).send({ message: 'Chat log not found.' });
        }
    } catch (error) {
        console.error('GET /chat/:articleId - Error:', error);
        res.status(500).send({ error: error.message });
    }
});


router.get('/chathistory', verifyJWT, async (req, res) => {
    const userId = req.user.userId; // Access userId from req.user
    const userEmail = req.user.email; // Access email from req.user
    console.log('GET /chathistory - Request received to retrieve all chat logs for user');
    try {
        console.log(`Querying MongoDB for all chat logs for userId: ${userId}`);
        // Refactored MongoDB query to include userId
        const chatLogs = await Chat.find({ userId: userId }, 'articleId');

        const articleIds = chatLogs.map(chat => chat.articleId);
        console.log('Successfully retrieved chat logs for user');
        res.status(200).json(articleIds);
    } catch (error) {
        console.error('GET /chathistory - Error:', error);
        res.status(500).send({ error: error.message });
    }
});

module.exports = router;
