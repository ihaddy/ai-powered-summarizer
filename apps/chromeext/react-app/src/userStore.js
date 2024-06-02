/* global chrome */
import { create } from 'zustand';
import useChatStore from './chatstore';

const useUserStore = create(set => ({
  user: null,
  jwtToken: null, // JWT token added as a separate line
  isAuthenticated: false,
  showSignIn: true,
  loading: true, // Add a loading state
  setUser: (user, jwt) => {
    set({ user, jwtToken: jwt, isAuthenticated: true });
    // Save JWT token to localStorage in non-Chrome extension mode
    if (typeof chrome === "undefined" || !chrome.storage) {
      localStorage.setItem('jwtToken', jwt);
      localStorage.setItem('userEmail', user);
    }
  },
  logout: () => {
    if (typeof chrome !== "undefined" && chrome.storage) {
      // Clear all data from local storage for the extension
      chrome.storage.local.clear(() => {
        console.log('Local storage cleared on logout');
      });
    } else {
      // Clear JWT token from localStorage in non-Chrome extension mode
      localStorage.removeItem('jwtToken');
      localStorage.removeItem('userEmail');
    }
    // Reset the chat store state
    useChatStore.setState({
      isSidebarOpen: true,
      articleIds: [],
      activeChatId: null,
      chatHistories: {},
      videoTitles: {},
      articles: [],
      videos: []
    });
    // Update Zustand store state
    set({ user: null, jwtToken: null, isAuthenticated: false, showSignIn: true });
  },
  toggleSignIn: () => set(state => ({ showSignIn: !state.showSignIn })),
  initialize: async () => {
    if (typeof chrome !== "undefined" && chrome.storage) {
      // Fetch credentials from local storage in Chrome extension mode
      const credentials = await new Promise(resolve => {
        chrome.storage.local.get(['jwtToken', 'userEmail'], function (result) {
          if (result.jwtToken && result.userEmail) {
            resolve({ jwtToken: result.jwtToken, userEmail: result.userEmail });
          } else {
            resolve(null);
          }
        });
      });
      if (credentials) {
        set({ user: credentials.userEmail, jwtToken: credentials.jwtToken, isAuthenticated: true, loading: false });
      } else {
        set({ loading: false }); // Set loading to false if no credentials are found
      }
    } else {
      // Fetch credentials from localStorage in non-Chrome extension mode
      const jwtToken = localStorage.getItem('jwtToken');
      const userEmail = localStorage.getItem('userEmail');
      if (jwtToken && userEmail) {
        set({ user: userEmail, jwtToken: jwtToken, isAuthenticated: true, loading: false });
      } else {
        set({ loading: false }); // Set loading to false if no credentials are found
      }
    }
  },
}));

export default useUserStore;