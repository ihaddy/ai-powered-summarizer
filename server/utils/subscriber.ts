import { EventEmitter } from 'events';
import Chat from '../models/chatModel';
import User from '../models/UserModel';
import redisClient from './redisClient';
import connectRabbitMQ from './rabbitmq';
import { io } from '../server';

class SSEEmitter extends EventEmitter {}
const sseEmitter = new SSEEmitter();

// Logging flag
const enableLogging = true;

async function successHandler(successMessage: any) {
    if (enableLogging) console.log(JSON.stringify({ message: "in subscribe.ts - successHandler: Received success message:", successMessage }, null, 2));

    try {
        const userId = successMessage.userId;
        if (enableLogging) console.log(JSON.stringify({ message: 'userid in the successhandler', userId }, null, 2));

        // Find the user by userId
        const user = await User.findById(userId);
        if (!user) {
            throw new Error("User not found");
        }

        // Check if a chat with the same articleId already exists in MongoDB
        if (enableLogging) console.log(JSON.stringify({ message: "in subscribe.ts - successHandler: Checking if chat exists in MongoDB..." }, null, 2));
        let chat = await Chat.findOne({ articleId: successMessage.articleId, userId: user._id });

        if (chat) {
            // Update the existing chat
            if (enableLogging) console.log(JSON.stringify({ message: "in subscribe.ts - successHandler: Updating existing chat in MongoDB..." }, null, 2));
            chat.chats.push({
                timestamp: new Date().toISOString(),
                sender: "ai",
                message: successMessage.summary
            });
            await chat.save();
            if (enableLogging) console.log(JSON.stringify({ message: "in subscribe.ts - successHandler: Existing chat updated in MongoDB." }, null, 2));
        } else {
            // Create a new chat object and save it
            if (enableLogging) console.log(JSON.stringify({ message: "in subscribe.ts - successHandler: Saving new chat object to MongoDB..." }, null, 2));
            chat = new Chat({
                articleId: successMessage.articleId,
                userId: user._id,
                chats: [{
                    timestamp: new Date().toISOString(),
                    sender: "ai",
                    message: successMessage.summary
                }],
                title: successMessage.title,
                description: successMessage.description,
                transcript: successMessage.transcript,
                videoId: successMessage.videoId
            });
            await chat.save();
            if (enableLogging) console.log(JSON.stringify({ message: "in subscribe.ts - successHandler: New chat object saved to MongoDB." }, null, 2));

            // Add this chat to the user's activeChats if not already present
            if (user.activeChats && !user.activeChats.includes(chat._id.toString())) {
                user.activeChats.push(chat._id.toString());
                await user.save();
                if (enableLogging) console.log(JSON.stringify({ message: "in subscribe.ts - successHandler: Chat added to user's activeChats." }, null, 2));
            } else if (!user.activeChats) {
                user.activeChats = [chat._id.toString()];
                await user.save();
                if (enableLogging) console.log(JSON.stringify({ message: "in subscribe.ts - successHandler: activeChats property initialized and chat added." }, null, 2));
            }
        }

        if (enableLogging) console.log(JSON.stringify({ message: "in subscribe.ts - successHandler: Chat object saved/updated in MongoDB." }, null, 2));

        // Update/Cache chat object in Redis
        if (enableLogging) console.log(JSON.stringify({ message: "in subscribe.ts - successHandler: Caching/Updating chat object in Redis..." }, null, 2));
        const userSpecificRedisKey = `user:${userId}:chat:${successMessage.articleId}`;
        await redisClient.set(userSpecificRedisKey, JSON.stringify(chat));
        if (enableLogging) console.log(JSON.stringify({ message: "in subscribe.ts - successHandler: Chat object cached/updated in Redis." }, null, 2));

        // Emit the success message to any SSE listeners
        if (enableLogging) console.log(JSON.stringify({ message: "in subscribe.ts - successHandler: Emitting success message to SSE listeners." }, null, 2));
        sseEmitter.emit('newSummary', successMessage);
        if (enableLogging) console.log(JSON.stringify({ message: "in subscribe.ts - successHandler: Success message emitted to SSE listeners." }, null, 2));

        // Emit the WebSocket event "newVideoSummarized" with the video's name and ID
        const videoName = successMessage.title; // Assuming the video name is stored in the "title" field of the success message
        const videoId = successMessage.articleId; // Assuming the video ID is stored in the "videoId" field of the success message
        io.emit('newVideoSummarized', { videoName, videoId });
        if (enableLogging) console.log(JSON.stringify({ message: `in subscribe.ts - successHandler: WebSocket event 'newVideoSummarized' emitted with video name and ID. name: ${videoName} videoId: ${successMessage.articleId}` }, null, 2));
    } catch (error) {
        console.error("in subscribe.ts - successHandler: Error:", error);
    }
}

async function subscribeToProcessingResults() {
    if (enableLogging) console.log(JSON.stringify({ message: "in subscribe.ts - subscribeToProcessingResults: Subscribing to processing results..." }, null, 2));

    if (enableLogging) console.log(JSON.stringify({ message: 'in subscribe.ts - subscribeToProcessingResults: Redis client IS ready' }, null, 2));
    const { channel } = await connectRabbitMQ();

    await channel.assertExchange('success', 'fanout', { durable: true });
    await channel.assertExchange('failure', 'fanout', { durable: true });

    const successQueue = await channel.assertQueue('', { exclusive: true });
    const failureQueue = await channel.assertQueue('', { exclusive: true });

    if (enableLogging) console.log(JSON.stringify({ message: "in subscribe.ts - subscribeToProcessingResults: Queues and exchanges set up." }, null, 2));

    channel.bindQueue(successQueue.queue, 'success', '');
    channel.bindQueue(failureQueue.queue, 'failure', '');
    if (enableLogging) console.log(JSON.stringify({ message: "in subscribe.ts - subscribeToProcessingResults: Queues bound to exchanges." }, null, 2));

    channel.consume(successQueue.queue, async (msg: any) => {
        if (msg.content) {
            try {
                if (enableLogging) console.log(JSON.stringify({ message: "in subscribe.ts - subscribeToProcessingResults: Received message in success queue." }, null, 2));
                const successMessage = JSON.parse(msg.content.toString());
                if (enableLogging) console.log(JSON.stringify({ message: "in subscribe.ts - subscribeToProcessingResults: Parsed success message:", successMessage }, null, 2));
    
                // Extract userId from the successMessage
                const { userId } = successMessage;
                if (!userId) {
                    throw new Error("UserId is missing in the success message");
                }
    
                // Pass the entire message to the successHandler
                await successHandler(successMessage);
                if (enableLogging) console.log(JSON.stringify({ message: "in subscribe.ts - subscribeToProcessingResults: Success message processed." }, null, 2));
            } catch (error) {
                console.error('in subscribe.ts - subscribeToProcessingResults: Error processing message:', error);
            }
        }
    }, { noAck: true });
    
    if (enableLogging) console.log(JSON.stringify({ message: "in subscribe.ts - subscribeToProcessingResults: Success queue consumer set up." }, null, 2));

    channel.consume(failureQueue.queue, (msg: any) => {
        if (msg.content) {
            try {
                if (enableLogging) console.log(JSON.stringify({ message: "in subscribe.ts - subscribeToProcessingResults: Received message in failure queue." }, null, 2));
                const failureMessage = JSON.parse(msg.content.toString());
                if (enableLogging) console.log(JSON.stringify({ message: "in subscribe.ts - subscribeToProcessingResults: Parsed failure message:", failureMessage }, null, 2));
                // Handle failure as needed
            } catch (error) {
                console.error('in subscribe.ts - subscribeToProcessingResults: Failed to parse failure message content as JSON:', error);
            }
        }
    }, { noAck: true });

    if (enableLogging) console.log(JSON.stringify({ message: "in subscribe.ts - subscribeToProcessingResults: Failure queue consumer set up." }, null, 2));

    if (enableLogging) console.log(JSON.stringify({ message: "in subscribe.ts - subscribeToProcessingResults: Message consumption setup complete." }, null, 2));
}

export { subscribeToProcessingResults, sseEmitter };
