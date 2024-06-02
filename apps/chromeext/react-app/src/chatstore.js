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
  currentPage: 1,
  setCurrentPage: (page) => set({ currentPage: page }),

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

  setArticleIds: async (mergedArticles, currentPage, totalPages, sendRequest) => {
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
        const fetchedArticles = await sendRequest({ url: `/article-titles?page=${currentPage}` });
        console.log('Fetched article titles:', fetchedArticles);
  
        console.log('Updating state and localStorage with merged articles');
        localStorage.setItem('articles', JSON.stringify({
          articles: mergedArticles,
          currentPage: currentPage,
          totalPages: totalPages
        }));
        set({
          articles: {
            articles: mergedArticles,
            currentPage: currentPage,
            totalPages: totalPages
          },
          loading: false
        });
      } catch (error) {
        console.error('Error fetching article titles:', error);
        set({ loading: false });
      }
    };
  
    console.log('Initializing state from local storage');
    initializeStateFromLocalStorage();
  
    console.log('Fetching and comparing articles');
    await fetchAndCompareArticles();
  
    console.log('Setting articleIds:', mergedArticles.map(article => article.articleId));
    set({ articleIds: mergedArticles.map(article => article.articleId) });
  },
  addVideo: (video) => {
    set((state) => {
      const updatedArticles = {
        ...state.articles,
        articles: [video, ...(state.articles?.articles || [])],
      };
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
