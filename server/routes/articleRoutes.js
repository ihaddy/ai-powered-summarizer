const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const connectRabbitMQ = require('../utils/rabbitmq');
const {  sseEmitter } = require('../utils/subscriber');


router.post('/summarize', async (req, res) => {
    console.log('POST /summarize - Request received:', req.body);
    const article = req.body;
    const articleId = uuidv4(); 

    try {
        const initialChatObject = new Chat({ articleId: articleId, chats: [] });
        console.log(`Inserting initial chat object for articleId: ${articleId}`);
        await initialChatObject.save();

        console.log('Connecting to RabbitMQ and sending message to queue');
        const { channel } = await connectRabbitMQ();
        const queue = 'articles';
        await channel.assertQueue(queue, { durable: true });
        channel.sendToQueue(queue, Buffer.from(JSON.stringify({ articleId, ...article })));

        res.status(200).send({ articleId: articleId });
    } catch (error) {
        console.error('POST /summarize - Error:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});


router.get('/summary_stream/:articleId', (req, res) => {
    console.log(`GET /summary_stream/${req.params.articleId} - SSE connection opened`);
    res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
    });

    const onNewSummary = (data) => {
        if (data.articleId === req.params.articleId) {
            console.log(`SSE - New summary for articleId: ${req.params.articleId}`);
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        }
    };

    sseEmitter.on('newSummary', onNewSummary);

    req.on('close', () => {
        console.log(`SSE connection closed for articleId: ${req.params.articleId}`);
        sseEmitter.removeListener('newSummary', onNewSummary);
    });
});

router.get('/articles', async (req, res) => {
    // ... existing code for /articles route
});

module.exports = router;