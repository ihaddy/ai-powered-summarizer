const EventEmitter = require('events');
class SSEEmitter extends EventEmitter {}
const sseEmitter = new SSEEmitter();
const connectRabbitMQ = require('./rabbitmq');

const Chat = require('../models/chatModel');
const User = require('../models/UserModel')
const redisClient = require('./redisClient'); // Adjust the path as necessary


const logger = require('./logger');



async function successHandler(successMessage) {
    console.log("in subscribe.js - successHandler: Received success message:", successMessage);

    try {
        const userId = successMessage.userId;
        console.log('userid in the successhandler', userId)

        // Find the user by userId
        const user = await User.findById(userId);
        if (!user) {
            throw new Error("User not found");
        }

        // Check if a chat with the same articleId already exists in MongoDB
        console.log("in subscribe.js - successHandler: Checking if chat exists in MongoDB...");
        let chat = await Chat.findOne({ articleId: successMessage.articleId, userId: user._id });

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
                userId: user._id,
                chats: [{
                    timestamp: new Date().toISOString(),
                    sender: "ai",
                    message: successMessage.summary
                }]
            });
            await chat.save();

            // Add this chat to the user's activeChats if not already present
            if (!user.activeChats.includes(chat._id)) {
                user.activeChats.push(chat._id);
                await user.save();
            }
        }

        console.log("in subscribe.js - successHandler: Chat object saved/updated in MongoDB.");

        // Update/Cache chat object in Redis
        console.log("in subscribe.js - successHandler: Caching/Updating chat object in Redis...");
        const userSpecificRedisKey = `user:${userId}:chat:${successMessage.articleId}`;
        await redisClient.set(userSpecificRedisKey, JSON.stringify(chat));
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
    
                // Extract userId from the successMessage
                const { userId } = successMessage;
                if (!userId) {
                    throw new Error("UserId is missing in the success message");
                }
    
                // Pass the entire message to the successHandler
                await successHandler(successMessage);
            } catch (error) {
                console.error('in subscribe.js - subscribeToProcessingResults: Error processing message:', error);
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