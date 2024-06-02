import { create } from 'zustand';
import io from 'socket.io-client';
import { BASE_URL } from './buildvars';
import useChatStore from './chatstore';
import useUserStore from './userStore';

const useSocketStore = create((set, get) => ({
  socket: null,
  sendRequest: null,

  connectSocket: () => {
    const jwtToken = useUserStore.getState().jwtToken;
    if (!jwtToken) {
      console.error('Socket connection failed: No JWT provided.');
      return;
    }

    const socket = io(BASE_URL, {
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      query: {
        token: jwtToken,
      },
    });

    socket.on('connect', () => {
      console.log('Connected to socket server with authentication');
    });

    socket.on('newVideoSummarized', (data) => {
      console.log('one new video summarized:', data);
      const { videoName, videoId } = data;
      useChatStore.getState().addVideo({
        articleId: videoId,
        title: videoName,
      });
    });

    socket.on('search-results', (results) => {
      useChatStore.getState().setSearchResults(results);
      set({ isLoading: false });
    });

    if (typeof chrome !== "undefined" && chrome.storage) {
    socket.on('all-videos', (videos) => {
        const currentVideos = localStorage.getItem('videoTitles');
        const newVideos = JSON.stringify(videos);

        if (newVideos !== currentVideos) {
            localStorage.setItem('videoTitles', newVideos);
            useChatStore.getState().setVideos(videos);
        }
    });
}


    socket.on('video-update', (video) => {
      const currentVideos = useChatStore.getState().videos;
      const updatedVideos = currentVideos.some((v) => v.videoId === video.videoId)
        ? currentVideos.map((v) => (v.videoId === video.videoId ? video : v))
        : [...currentVideos, video];
      useChatStore.getState().setVideos(updatedVideos);
    });

    socket.on('articles', ({ page, articles, totalPages }) => {
      console.log(`Received articles for page ${page} from WebSocket:`, articles);
      get().handleArticles(articles, page, totalPages);
    });

    socket.on('disconnect', (reason) => {
      console.log('Disconnected from the socket server. Reason:', reason);
    });

    set({ socket });
  },





  handleArticles: (newArticles, page, totalPages) => {
    const sendRequest = get().sendRequest;
    const currentArticles = useChatStore.getState().articles?.articles || [];
    const mergedArticles = page === 1 ? newArticles : [...currentArticles, ...newArticles];
  
    useChatStore.getState().setArticleIds(mergedArticles, page, totalPages, sendRequest);
  },

  setSendRequest: (sendRequest) => set({ sendRequest }),

  disconnectSocket: () => {
    get().socket?.disconnect();
  },
}));

export default useSocketStore;