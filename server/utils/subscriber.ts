import Sentry from './instrument';
import { EventEmitter } from 'events';
import Chat from '../models/chatModel';
import User from '../models/UserModel';
import redisClient from './redisClient';
import { io } from '../server';
import { index } from './meiliSearch';
import { setupQueues, getQueues } from './queueConfig';
import rabbitMQConnection from './rabbitMQConnection';

class SSEEmitter extends EventEmitter { }
const sseEmitter = new SSEEmitter();

// Logging flag
const enableLogging = false;

async function successHandler(successMessage: any) {
    if (enableLogging) console.log(JSON.stringify({ message: "in subscribe.ts - successHandler: Received success message:", successMessage }, null, 2));

    try {
        const userId = successMessage.userId;
        if (enableLogging) console.log(JSON.stringify({ message: 'userid in the successhandler', userId }, null, 2));

        // Find the user by userId
        const user = await User.findById(userId);
        if (!user) {
            const error = new Error("User not found");
            Sentry.captureException(error); // Capture the error with Sentry
            throw error;
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
                message: successMessage.result
            });
            await chat.save();
            if (enableLogging) console.log(JSON.stringify({ message: "in subscribe.ts - successHandler: Existing chat updated in MongoDB." }, null, 2));
            await indexChatInMeilisearch(chat);
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
                    message: successMessage.result
                }],
                title: successMessage.title,
                description: successMessage.description,
                transcript: successMessage.transcript,
                videoId: successMessage.videoId
            });
            await chat.save();
            if (enableLogging) console.log(JSON.stringify({ message: "in subscribe.ts - successHandler: New chat object saved to MongoDB." }, null, 2));
            // Index the updated chat object in Meilisearch
            await indexChatInMeilisearch(chat);
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

        // Emit the WebSocket event "newVideoSummarized" with the video's name, ID, and summary
        const videoName = successMessage.title;
        const videoId = successMessage.articleId;
        io.emit('newVideoSummarized', { videoName, videoId });
        if (enableLogging) console.log(JSON.stringify({ message: `in subscribe.ts - successHandler: WebSocket event 'newVideoSummarized' emitted with video name, ID, and summary. name: ${videoName} videoId: ${successMessage.articleId}` }, null, 2));
    } catch (error) {
        console.error("in subscribe.ts - successHandler: Error:", error);
        Sentry.captureException(error); // Capture the error with Sentry
    }
}

async function handleChatSuccess(chatSuccessMessage: any) {
    try {
        const { userId, articleId, message, result } = chatSuccessMessage;

        // Find the chat in MongoDB
        let chat = await Chat.findOne({ articleId, userId });

        if (chat) {
            // Update the existing chat
            chat.chats.push({
                timestamp: new Date().toISOString(),
                sender: "ai",
                message: result
            });
            await chat.save();

            // Update Redis cache
            const userSpecificRedisKey = `user:${userId}:chat:${articleId}`;
            await redisClient.set(userSpecificRedisKey, JSON.stringify(chat));

            // Index in Meilisearch
            await indexChatInMeilisearch(chat);
            const formattedMessage = {
                role: 'ai',
                content: result, // Assuming 'result' is the AI's response text
                timestamp: new Date().toISOString()
              };

              
            // Emit WebSocket event
            io.emit('chatUpdate', { articleId, message: formattedMessage });

            if (enableLogging) console.log(JSON.stringify({ message: "Chat success message processed and updates applied." }, null, 2));
        } else {
            const error = new Error('Chat not found for articleId: ' + articleId);
            Sentry.captureException(error); // Capture the error with Sentry
            console.error(error.message);
        }
    } catch (error) {
        console.error('Error handling chat success:', error);
        Sentry.captureException(error); // Capture the error with Sentry
    }
}

async function subscribeToProcessingResults() {
    if (enableLogging) console.log(JSON.stringify({ message: "in subscribe.ts - subscribeToProcessingResults: Subscribing to processing results..." }, null, 2));

    if (enableLogging) console.log(JSON.stringify({ message: 'in subscribe.ts - subscribeToProcessingResults: Redis client IS ready' }, null, 2));

    try {
        await rabbitMQConnection.initialize();
        await setupQueues();
        const queues = getQueues();
        const channel = rabbitMQConnection.getChannel();

        if (enableLogging) console.log(JSON.stringify({ message: "in subscribe.ts - subscribeToProcessingResults: Queues and exchanges set up." }, null, 2));

        channel.consume(queues.successQueue, async (msg: any) => {
            if (msg && msg.content) {
                try {
                    if (enableLogging) console.log(JSON.stringify({ message: "in subscribe.ts - subscribeToProcessingResults: Received message in success queue." }, null, 2));
                    const successMessage = JSON.parse(msg.content.toString());
                    if (enableLogging) console.log(JSON.stringify({ message: "in subscribe.ts - subscribeToProcessingResults: Parsed success message:", successMessage }, null, 2));

                    const { userId } = successMessage;
                    if (!userId) {
                        const error = new Error("UserId is missing in the success message");
                        Sentry.captureException(error); // Capture the error with Sentry
                        throw error;
                    }

                    await successHandler(successMessage);
                    if (enableLogging) console.log(JSON.stringify({ message: "in subscribe.ts - subscribeToProcessingResults: Success message processed." }, null, 2));

                    // Removed: channel.ack(msg);
                } catch (error) {
                    console.error('in subscribe.ts - subscribeToProcessingResults: Error processing message:', error);
                    Sentry.captureException(error); // Capture the error with Sentry

                    try {
                        const failureMessage = {
                            originalMessage: JSON.parse(msg.content.toString()),
                            error: error.message,
                            timestamp: new Date().toISOString()
                        };
                        await channel.sendToQueue(queues.failureQueue, Buffer.from(JSON.stringify(failureMessage)));
                        if (enableLogging) console.log(JSON.stringify({ message: "in subscribe.ts - subscribeToProcessingResults: Message pushed to failure queue." }, null, 2));

                        // Removed: channel.ack(msg);
                    } catch (sendError) {
                        console.error('in subscribe.ts - subscribeToProcessingResults: Error pushing message to failure queue:', sendError);
                        Sentry.captureException(sendError); // Capture the error with Sentry
                        // Removed: channel.nack(msg, false, true);
                    }
                }
            }
        }, { noAck: true }); // Added noAck: true to prevent auto-acknowledgment

        if (enableLogging) console.log(JSON.stringify({ message: "in subscribe.ts - subscribeToProcessingResults: Success queue consumer set up." }, null, 2));

        channel.consume(queues.failureQueue, (msg: any) => {
            if (msg && msg.content) {
                try {
                    if (enableLogging) console.log(JSON.stringify({ message: "in subscribe.ts - subscribeToProcessingResults: Received message in failure queue." }, null, 2));
                    const failureMessage = JSON.parse(msg.content.toString());
                    if (enableLogging) console.log(JSON.stringify({ message: "in subscribe.ts - subscribeToProcessingResults: Parsed failure message:", failureMessage }, null, 2));
                    // Handle failure as needed
                    // Removed: channel.ack(msg);
                } catch (error) {
                    console.error('in subscribe.ts - subscribeToProcessingResults: Failed to parse failure message content as JSON:', error);
                    Sentry.captureException(error); // Capture the error with Sentry
                    // Removed: channel.nack(msg, false, false);
                }
            }
        }, { noAck: true }); // Added noAck: true to prevent auto-acknowledgment

        if (enableLogging) console.log(JSON.stringify({ message: "in subscribe.ts - subscribeToProcessingResults: Failure queue consumer set up." }, null, 2));

        // Set up consumer for chat success queue
        channel.consume(queues.chatSuccessQueue, async (msg: any) => {
            if (msg && msg.content) {
                try {
                    if (enableLogging) console.log(JSON.stringify({ message: "Received message in chat success queue." }, null, 2));
                    const chatSuccessMessage = JSON.parse(msg.content.toString());
                    if (enableLogging) console.log(JSON.stringify({ message: "Parsed chat success message:", chatSuccessMessage }, null, 2));

                    await handleChatSuccess(chatSuccessMessage);
                    if (enableLogging) console.log(JSON.stringify({ message: "Chat success message processed." }, null, 2));

                    // Removed: channel.ack(msg);
                } catch (error) {
                    console.error('Error processing chat success message:', error);
                    Sentry.captureException(error); // Capture the error with Sentry
                    // Removed: channel.nack(msg, false, true);
                }
            }
        }, { noAck: true }); // Added noAck: true to prevent auto-acknowledgment

        if (enableLogging) console.log(JSON.stringify({ message: "Chat success queue consumer set up." }, null, 2));

        if (enableLogging) console.log(JSON.stringify({ message: "in subscribe.ts - subscribeToProcessingResults: Message consumption setup complete." }, null, 2));
    } catch (error) {
        console.error('Failed to initialize RabbitMQ connection:', error);
        Sentry.captureException(error); // Capture the error with Sentry
        // You might want to implement some fallback behavior here
    }
}

async function indexChatInMeilisearch(chat: any) {
    try {
        const processedDocument = {
            id: chat._id.toString(),
            articleId: chat.articleId,
            userId: chat.userId.toString(),
            title: chat.title,
            aiMessages: chat.chats.filter((chat: any) => chat.sender === 'ai').map((chat: any) => chat.message)
        };

        await index.addDocuments([processedDocument]);
        if (enableLogging) console.log(JSON.stringify({ message: "in subscribe.ts - indexChatInMeilisearch: Chat object indexed in Meilisearch." }, null, 2));
    } catch (error) {
        console.error('in subscribe.ts - indexChatInMeilisearch: Error indexing chat object in Meilisearch:', error);
        Sentry.captureException(error); // Capture the error with Sentry
    }
}

export { subscribeToProcessingResults, sseEmitter };
