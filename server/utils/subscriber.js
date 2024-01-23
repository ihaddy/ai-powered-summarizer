const EventEmitter = require('events');
class SSEEmitter extends EventEmitter {}
const sseEmitter = new SSEEmitter();
const connectRabbitMQ = require('./rabbitmq');
// const mongoose = require('mongoose');
const Chat = require('../models/chatModel');
const redisClient = require('./redisClient'); // Adjust the path as necessary
 // Replace with the actual path to your main server file
// console.log('Redis client in subscriber:', redisClient);
const logger = require('./logger');

// async function successHandler(successMessage) {
//     console.log("in subscribe.js - successHandler: Received success message:", successMessage);

//     // Construct chat object
//     const chatObject = {
//         articleId: successMessage.articleId,
//         chats: [{
//             timestamp: new Date().toISOString(),
//             sender: "ai",
//             message: successMessage.summary
//         }]
//     };
//     console.log("in subscribe.js - successHandler: Constructed chat object:", chatObject);

//     try {
//         // Save chatObject in MongoDB using Mongoose
//         console.log("in subscribe.js - successHandler: Saving chat object to MongoDB...");
//         const newChat = new Chat(chatObject);
//         await newChat.save();
//         console.log("in subscribe.js - successHandler: Chat object saved to MongoDB.");

//         // Cache chatObject in Redis
//         console.log("in subscribe.js - successHandler: Caching chat object in Redis...");
//         await redisClient.set(`chat:${successMessage.articleId}`, JSON.stringify(chatObject));
//         console.log("in subscribe.js - successHandler: Chat object cached in Redis.");

//         // Emit the success message to any SSE listeners
//         console.log("in subscribe.js - successHandler: Emitting success message to SSE listeners.");
//         sseEmitter.emit('newSummary', successMessage);
//         console.log("in subscribe.js - successHandler: Success message emitted to SSE listeners.");
//     } catch (error) {
//         console.error("in subscribe.js - successHandler: Error:", error);
//     }
// }
async function successHandler(successMessage) {
    console.log("in subscribe.js - successHandler: Received success message:", successMessage);

    try {
        // Check if a chat with the same articleId already exists in MongoDB
        console.log("in subscribe.js - successHandler: Checking if chat exists in MongoDB...");
        let chat = await Chat.findOne({ articleId: successMessage.articleId });

        if (chat) {
            // Update the existing chat
            console.log("in subscribe.js - successHandler: Updating existing chat in MongoDB...");
            chat.chats.push({
                timestamp: new Date().toISOString(),
                sender: "ai",
                message: successMessage.summary
            });
            await chat.save();
        } else {
            // Create a new chat object and save it
            console.log("in subscribe.js - successHandler: Saving new chat object to MongoDB...");
            chat = new Chat({
                articleId: successMessage.articleId,
                chats: [{
                    timestamp: new Date().toISOString(),
                    sender: "ai",
                    message: successMessage.summary
                }]
            });
            await chat.save();
        }
        console.log("in subscribe.js - successHandler: Chat object saved/updated in MongoDB.");

        // Update/Cache chat object in Redis
        console.log("in subscribe.js - successHandler: Caching/Updating chat object in Redis...");
        await redisClient.set(`chat:${successMessage.articleId}`, JSON.stringify(chat));
        console.log("in subscribe.js - successHandler: Chat object cached/updated in Redis.");

        // Emit the success message to any SSE listeners
        console.log("in subscribe.js - successHandler: Emitting success message to SSE listeners.");
        sseEmitter.emit('newSummary', successMessage);
        console.log("in subscribe.js - successHandler: Success message emitted to SSE listeners.");
    } catch (error) {
        console.error("in subscribe.js - successHandler: Error:", error);
    }
}


async function subscribeToProcessingResults() {
    console.log("in subscribe.js - subscribeToProcessingResults: Subscribing to processing results...");

    console.log('in subscribe.js - subscribeToProcessingResults: Redis client IS ready');
    const { channel } = await connectRabbitMQ();

    await channel.assertExchange('success', 'fanout', { durable: true });
    await channel.assertExchange('failure', 'fanout', { durable: true });

    const successQueue = await channel.assertQueue('', { exclusive: true });
    const failureQueue = await channel.assertQueue('', { exclusive: true });

    console.log("in subscribe.js - subscribeToProcessingResults: Queues and exchanges set up.");

    channel.bindQueue(successQueue.queue, 'success', '');
    channel.bindQueue(failureQueue.queue, 'failure', '');
    console.log("in subscribe.js - subscribeToProcessingResults: Queues bound to exchanges.");

channel.consume(successQueue.queue, async (msg) => {
    if (msg.content) {
        try {
            console.log("in subscribe.js - subscribeToProcessingResults: Received message in success queue.");
            const successMessage = JSON.parse(msg.content.toString());
            console.log("in subscribe.js - subscribeToProcessingResults: Parsed success message:", successMessage);
            await successHandler(successMessage);
        } catch (error) {
            console.error('in subscribe.js - subscribeToProcessingResults: Failed to parse success message content as JSON:', error);
        }
    }
}, { noAck: true });

channel.consume(failureQueue.queue, (msg) => {
    if (msg.content) {
        try {
            console.log("in subscribe.js - subscribeToProcessingResults: Received message in failure queue.");
            const failureMessage = JSON.parse(msg.content.toString());
            console.log("in subscribe.js - subscribeToProcessingResults: Parsed failure message:", failureMessage);
            // Handle failure as needed
        } catch (error) {
            console.error('in subscribe.js - subscribeToProcessingResults: Failed to parse failure message content as JSON:', error);
        }
    }
}, { noAck: true });

console.log("in subscribe.js - subscribeToProcessingResults: Message consumption setup complete.");
}
module.exports = { subscribeToProcessingResults, sseEmitter };