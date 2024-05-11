// // socketEvents.js
// module.exports = function registerSocketEvents(io) {
//     io.on('connection', (socket) => {
//         console.log('A user connected', socket.id);

//         // Existing event listener for joinRoom
//         socket.on('joinRoom', (roomId) => {
//             console.log(`Socket ${socket.id} joining room ${roomId}`);
//             socket.join(roomId);
//         });

        
//         // TODO: Build out logic to send all activechats back when the user connects here
     
//         socket.on('video-submitted', (data) => {
//             console.log(`Video submitted by user: ${socket.id}`, data);
//             // Logic to handle a submitted video, such as storing info in a database
//             // Optionally emit an event to inform the submitter or other users
//             // io.emit('video-received', { videoId: data.videoId, status: 'received' });
//         });

//         // New event listener for summary-processed
//         socket.on('summary-processed', (data) => {
//             console.log(`Summary processed for video: ${data.videoId}`);
//             // Emit an event to update clients about the processed summary
//             io.to(data.roomId).emit('summary-update', { videoId: data.videoId, summary: data.summary });
//         });

//         // Existing updateChat function
//         function updateChat(message) {
//             io.to(message.room).emit('chatUpdate', message);
//         }
//         global.updateChat = updateChat;

//         // Existing disconnection handler
//         socket.on('disconnect', () => {
//             console.log(`User disconnected ${socket.id}`);
//         });
//     });
// };

const Chat = require('../models/chatModel'); 
const verifySocketToken = require('./verifySocketJWT')
// socketEvents.js
module.exports = function registerSocketEvents(io) {
    // Apply the JWT verification middleware
    io.use(verifySocketToken);

    io.on('connection', async (socket) => {
        console.log('A user connected', socket.id);

        try {
            // Fetch user-specific data after authentication
            console.log(`Querying MongoDB for all article IDs for userId: ${socket.user.userId}`);
            const chatLogs = await Chat.find({ userId: socket.user.userId }, 'articleId');
            const articleIds = chatLogs.map(chat => chat.articleId);
            console.log('Successfully retrieved article IDs for user');
            socket.emit('all-articles', articleIds); // Emit article IDs to the connected client
        } catch (error) {
            console.error('Error fetching articles:', error);
            socket.emit('error', 'Failed to fetch articles');
        }

        socket.on('joinRoom', (roomId) => {
            console.log(`Socket ${socket.id} joining room ${roomId}`);
            socket.join(roomId);
        });

        socket.on('video-submitted', (data) => {
            console.log(`Video submitted by user: ${socket.id}`, data);
            const newVideo = handleVideoSubmission(data);
            io.emit('video-update', newVideo); // Emit updated video info to all clients
        });

        socket.on('summary-processed', (data) => {
            console.log(`Summary processed for video: ${data.videoId}`);
            io.to(data.roomId).emit('summary-update', { videoId: data.videoId, summary: data.summary });
        });

        socket.on('disconnect', () => {
            console.log(`User disconnected ${socket.id}`);
        });
    });
};
function getVideosFromDatabase() {
    // Placeholder: Fetch video data from your database
    return []; // Return the video data as an array
}

function handleVideoSubmission(data) {
    // Placeholder: Store the submitted video data in your database
    return data; // Return the newly added video data
}
