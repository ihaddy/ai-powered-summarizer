import { Server, Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';
import Chat from '../models/chatModel';
import verifySocketToken from './verifySocketJWT';

interface CustomSocket extends Socket {
    user?: {
        userId: string;
        currentPage: number;
        // Add other user properties if needed
    };
}
//TODO: dont have user isolation on all socket events, need to make sure things are properly
//  joining their individual rooms and emitting to their individual user based rooms
// need to do the same to all microservices that are broadcastin/joining rooms
const MAX_ARTICLES = 10; // Specify the maximum number of articles per page

export default function registerSocketEvents(io: Server): void {
    // Apply the JWT verification middleware
    io.use((socket: Socket, next: (err?: ExtendedError) => void) => {
        const customSocket = socket as CustomSocket;
        verifySocketToken(customSocket, next);
    });
    
    io.on('connection', async (socket: CustomSocket) => {
        // console.log('A user connected', socket.id);
        
        // Initialize the current page for the user
        socket.user = {
            ...socket.user,
            currentPage: 1,
        };
        
        // Fetch the initial page of articles
        await fetchInitArticles(socket);
        
        socket.on('getMoreArticles', async () => {
            console.log('Received getMoreArticles event');
          
  
            
            // Fetch the next page of articles
            await fetchMoreArticles(socket);
        });
        
        socket.on('joinRoom', (roomId: string) => {
            console.log(`Socket ${socket.id} joining room ${roomId}`);
            socket.join(roomId);
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

const fetchMoreArticles = async (socket: CustomSocket) => {
    try {
      let {userId, currentPage } = socket.user;
      
      const totalArticles = await Chat.countDocuments({ userId: userId });
      const totalPages = Math.ceil(totalArticles / MAX_ARTICLES);
    //   have to add this check and escape hatch here because sometimes websocket events will double trigger because of react dev mode
    // or other network conditions etc. so i only want to increment current page and proceed if the total pages is greater than the current page
      if (currentPage + 1> totalPages)  {
        console.log('Submitted a request for a page greater than the TotalePages ');
        return
    }
    currentPage++
      const skip = (currentPage - 1) * MAX_ARTICLES;
      const articles = await Chat.find({ userId: userId }, 'articleId title')
        .sort({ _id: -1 })
        .skip(skip)
        .limit(MAX_ARTICLES);
  
      console.log(`emitting currentpage: ${currentPage}, and totalpages: ${totalPages} articles: ${articles}`);
      socket.emit('articles', { page: currentPage, articles, totalPages });
    } catch (error) {
      console.error('Error in fetchArticles:', error);
      socket.emit('error', 'Failed to fetch articles');
    }
  };
  

  const fetchInitArticles = async (socket: CustomSocket) => {
    try {
      const {userId, currentPage } = socket.user;
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
      socket.emit('error', 'Failed to fetch articles');
    }
  };
  
