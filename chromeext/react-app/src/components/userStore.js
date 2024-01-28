/* global chrome */
import { create } from 'zustand';

const useUserStore = create(set => ({
  user: null,
  jwtToken: null,  // JWT token added as a separate line
  isAuthenticated: false,
  showSignIn: true,
  loading: true, // Add a loading state
  setUser: (user, jwt) => set({ user, jwtToken: jwt, isAuthenticated: true }),
  logout: () => set({ user: null, jwtToken: null, isAuthenticated: false }),
  toggleSignIn: () => set(state => ({ showSignIn: !state.showSignIn })),
  initialize: async () => {
    // Fetch credentials from local storage
    const credentials = await new Promise(resolve => {
      chrome.storage.local.get(['jwtToken', 'userEmail'], function(result) {
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
  },
  logout: () => {
    // Clear credentials from local storage
    chrome.storage.local.remove(['jwtToken', 'userEmail']);
    // Update Zustand store state
    set({ user: null, jwtToken: null, isAuthenticated: false });
  },
}));

export default useUserStore;
