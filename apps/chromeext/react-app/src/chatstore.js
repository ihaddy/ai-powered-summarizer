import { create } from "zustand";

const useChatStore = create((set, get) => ({
  isSidebarOpen: true,
  articleIds: [],
  activeChatId: null,
  chatHistories: {},
  videoTitles: {}, 
  articles: null,
  videos: [], 
  thumbnails: {}, // New state for article thumbnails

  setVideos: (videos) => set({ videos }),

  getVideo: (videoId) => get().videos.find(video => video.videoId === videoId),

  initializeArticles: () => {
    const cachedTitles = JSON.parse(localStorage.getItem('articleTitles') || '[]');
    set({ articleIds: cachedTitles });
  },

  setArticles: (articles) => set({ articles }),

  getArticle: (articleId) => get().articles.find(article => article.articleId === articleId),

  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  addArticleId: (articleId) => set((state) => ({ articleIds: [...state.articleIds, articleId] })),

  setActiveChatId: (articleId) => set({ activeChatId: articleId }),

  setChatHistory: (articleId, history) => set((state) => {
    console.log(`Updating chat history for articleId ${articleId}:`, history);
    return { chatHistories: { ...state.chatHistories, [articleId]: history }};
  }),

  setArticleIds: async (articleIds, sendRequest) => {
    const initializeStateFromLocalStorage = () => {
      const cachedArticles = localStorage.getItem('articles');
      if (cachedArticles) {
        const articles = JSON.parse(cachedArticles);
        console.log('Initializing state from localStorage:', articles);
        set({ articles });
      } else {
        console.log('Local storage is empty, setting loading to true');
        set({ loading: true });
      }
    };

    const fetchAndCompareArticles = async () => {
      try {
        console.log('Sending request to fetch article titles');
        const fetchedArticles = await sendRequest({ url: `/article-titles` });
        console.log('Fetched article titles:', fetchedArticles);

        const localArticles = JSON.parse(localStorage.getItem('articles') || '[]');
        console.log('Local articles:', localArticles);

        if (JSON.stringify(fetchedArticles) !== JSON.stringify(localArticles)) {
          console.log('Fetched articles are different from local articles');
          console.log('Updating state and localStorage with new articles');
          localStorage.setItem('articles', JSON.stringify(fetchedArticles));
          set({ articles: fetchedArticles });
        } else {
          console.log('Fetched articles are the same as local articles, no update needed');
        }
      } catch (error) {
        console.error('Error fetching article titles:', error);
      } finally {
        console.log('Setting loading to false');
        set({ loading: false });
      }
    };

    console.log('Initializing state from local storage');
    initializeStateFromLocalStorage();

    console.log('Fetching and comparing articles');
    await fetchAndCompareArticles();

    console.log('Setting articleIds:', articleIds);
    set({ articleIds });
  },

  addVideo: (video) => {
    set((state) => {
      const updatedArticles = [video, ...state.articles];
      localStorage.setItem('articles', JSON.stringify(updatedArticles));
      return { articles: updatedArticles };
    });
  },

  getChatHistory: (articleId) => get().chatHistories[articleId],

  setVideoTitle: (articleId, title) => set((state) => ({ videoTitles: { ...state.videoTitles, [articleId]: title }})),

  getVideoTitle: (articleId) => get().videoTitles[articleId],

  // New methods for thumbnails
  setThumbnail: (articleId, thumbnail) => set((state) => ({ thumbnails: { ...state.thumbnails, [articleId]: thumbnail } })),
  getThumbnail: (articleId) => get().thumbnails[articleId],
}));

export default useChatStore;
