import { create } from 'zustand';
import io from 'socket.io-client';
import { BASE_URL } from './buildvars';
import useChatStore from './chatstore'; // Importing useChatStore to update video titles
import useUserStore from './userStore'; // Importing useUserStore to access JWT

const useSocketStore = create((set, get) => ({
    socket: null,

    // Establishes the socket connection using JWT for authentication
    connectSocket: () => {
        const jwtToken = useUserStore.getState().jwtToken; // Get JWT from user store
        if (!jwtToken) {
            console.error('Socket connection failed: No JWT provided.');
            return;
        }

        const socket = io(BASE_URL, {
            path: '/socket.io/',
            transports: ['websocket', 'polling'],
            query: {
                token: jwtToken  // Pass JWT as a query parameter for authentication
            }
        });

        socket.on('connect', () => {
            console.log('Connected to socket server with authentication');
        });
        socket.on('newVideoSummarized', (data) => {
            console.log(
                'one new video summarized:', data
            )
            const { videoName, videoId } = data;
            useChatStore.getState().addVideo({
              articleId: videoId,
              title: videoName,
            });
          });
        socket.on('all-videos', (videos) => {
            const currentVideos = localStorage.getItem('videoTitles');
            const newVideos = JSON.stringify(videos);

            if (newVideos !== currentVideos) {
                localStorage.setItem('videoTitles', newVideos);
                useChatStore.getState().setVideos(videos);
            }
        });

        socket.on('video-update', (video) => {
            const currentVideos = useChatStore.getState().videos;
            const updatedVideos = currentVideos.some(v => v.videoId === video.videoId) ?
                currentVideos.map(v => v.videoId === video.videoId ? video : v) : [...currentVideos, video];
            useChatStore.getState().setVideos(updatedVideos);
        });

        socket.on('disconnect', (reason) => {
            console.log('Disconnected from the socket server. Reason:', reason);
        });

        set({ socket });
    },

    // Disconnects the socket connection
    disconnectSocket: () => {
        get().socket?.disconnect();
    },
}));

export default useSocketStore;