import { create } from "zustand";

const useChatStore = create((set, get) => ({
  isSidebarOpen: true,
  articleIds: [],
  activeChatId: null,
  chatHistories: {},
  videoTitles: {}, // New state for video titles
  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  addArticleId: (articleId) =>
    set((state) => ({ articleIds: [...state.articleIds, articleId] })),
  setActiveChatId: (articleId) => set({ activeChatId: articleId }),
  setChatHistory: (articleId, history) =>
    set((state) => {
      console.log(`Updating chat history for articleId ${articleId}:`, history);
      return {
        chatHistories: { ...state.chatHistories, [articleId]: history },
      };
    }),
  setArticleIds: (articleIds) => set({ articleIds }),
  getChatHistory: (articleId) => get().chatHistories[articleId],
  setVideoTitle: (articleId, title) =>
    set((state) => ({
      videoTitles: { ...state.videoTitles, [articleId]: title },
    })),

  getVideoTitle: (articleId) => get().videoTitles[articleId],
}));

export default useChatStore;
