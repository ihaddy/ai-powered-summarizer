import Sentry from './instrument';
import { Server, Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';
import Chat from '../models/chatModel';
import verifySocketToken from './verifySocketJWT';
import { index } from '../utils/meiliSearch';
import { setupQueues, getQueues } from './queueConfig';
import rabbitMQConnection from './rabbitMQConnection';

interface CustomSocket extends Socket {
    user?: {
        userId: string;
        currentPage: number;
    };
}

//TODO: dont have user isolation on all socket events, need to make sure things are properly
//  joining their individual rooms and emitting to their individual user based rooms
// need to do the same to all microservices that are broadcastin/joining rooms
const MAX_ARTICLES = 10;

export default async function registerSocketEvents(io: Server): Promise<void> {
    try {
        await rabbitMQConnection.initialize();
        await setupQueues();
        const queues = getQueues();
        const channel = rabbitMQConnection.getChannel();

        io.use((socket: Socket, next: (err?: ExtendedError) => void) => {
            const customSocket = socket as CustomSocket;
            verifySocketToken(customSocket, next);
        });

        io.on('connection', async (socket: CustomSocket) => {
            try {
                socket.user = {
                    ...socket.user,
                    currentPage: 1,
                };

                await fetchInitArticles(socket);

                socket.on('getMoreArticles', async () => {
                    try {
                        console.log('Received getMoreArticles event');
                        await fetchMoreArticles(socket);
                    } catch (error) {
                        console.error('Error in getMoreArticles event:', error);
                        Sentry.captureException(error); // Capture the error with Sentry
                        socket.emit('error', 'Failed to fetch more articles');
                    }
                });

                socket.on('joinRoom', (roomId: string) => {
                    try {
                        console.log(`Socket ${socket.id} joining room ${roomId}`);
                        socket.join(roomId);
                    } catch (error) {
                        console.error('Error in joinRoom event:', error);
                        Sentry.captureException(error); // Capture the error with Sentry
                        socket.emit('error', 'Failed to join room');
                    }
                });

                socket.on('summary-processed', (data: { videoId: string, roomId: string, summary: string }) => {
                    try {
                        console.log(`Summary processed for video: ${data.videoId}`);
                        io.to(data.roomId).emit('summary-update', { videoId: data.videoId, summary: data.summary });
                    } catch (error) {
                        console.error('Error in summary-processed event:', error);
                        Sentry.captureException(error); // Capture the error with Sentry
                        socket.emit('error', 'Failed to process summary');
                    }
                });

                socket.on('searchMessages', async (term: string) => {
                    try {
                        const { userId } = socket.user;
                        console.log('userId on search', userId);
                        console.log('term', term);

                        const searchResults = await index.search(term, {
                            filter: `userId = "${userId}"`
                        });

                        console.log(`Search results: ${JSON.stringify(searchResults.hits)}`);
                        socket.emit('search-results', searchResults.hits);
                    } catch (error) {
                        console.error('Error searching messages:', error);
                        Sentry.captureException(error); // Capture the error with Sentry
                        socket.emit('error', 'Failed to search messages');
                    }
                });

                socket.on('send-chat-message', async ({ articleId, message }) => {
                    try {
                        const article = await Chat.findOne({ articleId });

                        if (!article) {
                            const error = new Error('Article not found');
                            Sentry.captureException(error); // Capture the error with Sentry
                            throw error;
                        }

                        // Create a new chat message object
                        const newChatMessage = {
                            role: 'user',
                            content: message,
                            timestamp: new Date().toISOString()
                        };

                        // Add the new message to the chats array
                        article.chats.push(newChatMessage);

                        // Save the updated article
                        await article.save();

                        console.log(`Chat message saved to DB for articleId: ${articleId}`);

                        let transcriptData;
                        if (article.transcriptionWithTimestamps && article.transcriptionWithTimestamps.length > 0) {
                            transcriptData = article.transcriptionWithTimestamps;
                        } else if (article.transcript && article.transcript.trim() !== '') {
                            transcriptData = article.transcript;
                        } else {
                            transcriptData = null;
                        }

                        const chatMessage = {
                            userId: socket.user.userId,
                            articleId,
                            message,
                            ...(transcriptData !== null && { transcript: transcriptData }),
                            timestamp: newChatMessage.timestamp
                        };

                        await channel.sendToQueue(queues.chatProcessingQueue, Buffer.from(JSON.stringify(chatMessage)));
                        console.log(`Chat message sent to processing queue for articleId: ${articleId}`);

                        // Emit an event to the client to acknowledge the message was saved and queued
                        socket.emit('chat-message-saved', { articleId, message: newChatMessage });

                    } catch (error) {
                        console.error('Error handling send-chat-message event:', error);
                        Sentry.captureException(error); // Capture the error with Sentry
                        socket.emit('error', 'Failed to process chat message');
                    }
                });

                socket.on('disconnect', () => {
                    console.log(`User disconnected ${socket.id}`);
                });
            } catch (error) {
                console.error('Error in connection event:', error);
                Sentry.captureException(error); // Capture the error with Sentry
                socket.emit('error', 'Failed to handle connection');
            }
        });
    } catch (error) {
        console.error('Failed to initialize RabbitMQ or setup queues:', error);
        Sentry.captureException(error); // Capture the error with Sentry
        // Implement appropriate error handling here
    }
}

const fetchMoreArticles = async (socket: CustomSocket) => {
    try {
        let { userId, currentPage } = socket.user;

        const totalArticles = await Chat.countDocuments({ userId: userId });
        const totalPages = Math.ceil(totalArticles / MAX_ARTICLES);
        //   have to add this check and escape hatch here because sometimes websocket events will double trigger because of react dev mode
        // or other network conditions etc. so i only want to increment current page and proceed if the total pages is greater than the current page
        if (currentPage > totalPages) {
            console.log('Submitted a request for a page greater than the TotalePages ');
            return
        }
        socket.user.currentPage++
        const skip = (currentPage - 1) * MAX_ARTICLES;
        const articles = await Chat.find({ userId: userId }, 'articleId title')
            .sort({ _id: -1 })
            .skip(skip)
            .limit(MAX_ARTICLES);

        console.log(`emitting currentpage: ${currentPage}, and totalpages: ${totalPages} articles: ${articles}`);
        socket.emit('articles', { page: currentPage, articles, totalPages });
    } catch (error) {
        console.error('Error in fetchArticles:', error);
        Sentry.captureException(error); // Capture the error with Sentry
        socket.emit('error', 'Failed to fetch articles');
    }
};

const fetchInitArticles = async (socket: CustomSocket) => {
    try {
        const { userId, currentPage } = socket.user;
        const skip = (currentPage - 1) * MAX_ARTICLES;
        const articles = await Chat.find({ userId: userId }, 'articleId title')
            .sort({ _id: -1 })
            .skip(skip)
            .limit(MAX_ARTICLES);

        const totalArticles = await Chat.countDocuments({ userId: userId });
        const totalPages = Math.ceil(totalArticles / MAX_ARTICLES);
        console.log(`emitting currentpage: ${currentPage}, and totalpages: ${totalPages} articles: ${articles}`);
        socket.emit('articles', { page: currentPage, articles, totalPages });
    } catch (error) {
        console.error('Error in fetchArticles:', error);
        Sentry.captureException(error); // Capture the error with Sentry
        socket.emit('error', 'Failed to fetch articles');
    }
};
