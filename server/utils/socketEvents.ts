import { Server, Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';
import Chat from '../models/chatModel';
import verifySocketToken from './verifySocketJWT';

interface CustomSocket extends Socket {
    user?: {
        userId: string;
    };
}

export default function registerSocketEvents(io: Server): void {
    // Apply the JWT verification middleware
    io.use((socket: CustomSocket, next: (err?: ExtendedError) => void) => verifySocketToken(socket, next));

    io.on('connection', async (socket: CustomSocket) => {
        console.log('A user connected', socket.id);

        try {
            // Fetch user-specific data after authentication
            console.log(`Querying MongoDB for all article IDs for userId: ${socket.user?.userId}`);
            const chatLogs = await Chat.find({ userId: socket.user?.userId }, 'articleId').exec();
            const articleIds = chatLogs.map(chat => chat.articleId);
            console.log('Successfully retrieved article IDs for user');
            socket.emit('all-articles', articleIds); // Emit article IDs to the connected client
        } catch (error) {
            console.error('Error fetching articles:', error);
            socket.emit('error', 'Failed to fetch articles');
        }

        socket.on('joinRoom', (roomId: string) => {
            console.log(`Socket ${socket.id} joining room ${roomId}`);
            socket.join(roomId);
        });

        socket.on('video-submitted', (data: any) => {
            console.log(`Video submitted by user: ${socket.id}`, data);
            const newVideo = handleVideoSubmission(data);
            io.emit('video-update', newVideo); // Emit updated video info to all clients
        });

        socket.on('summary-processed', (data: { videoId: string, roomId: string, summary: string }) => {
            console.log(`Summary processed for video: ${data.videoId}`);
            io.to(data.roomId).emit('summary-update', { videoId: data.videoId, summary: data.summary });
        });

        socket.on('disconnect', () => {
            console.log(`User disconnected ${socket.id}`);
        });
    });
}

function getVideosFromDatabase(): any[] {
    // Placeholder: Fetch video data from your database
    return []; // Return the video data as an array
}

function handleVideoSubmission(data: any): any {
    // Placeholder: Store the submitted video data in your database
    return data; // Return the newly added video data
}
