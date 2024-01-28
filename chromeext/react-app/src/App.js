/* global chrome */
import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Summarizer from './components/Summarizer';
import ChatRoom from './components/ChatRoom';
import SignIn from './components/SignIn';
import SignUp from './components/SignUp'; // Import SignUp component
import useChatStore from './components/chatstore';
import useUserStore from './components/userStore';
import { BASE_URL, SECURE_TOKEN } from '../src/buildvars';
import CircularProgress from '@mui/material/CircularProgress'; // Import a loading indicator component
import useHttp from './hooks/useHttp';


function App() {
  const { isSidebarOpen, toggleSidebar, addArticleId, setArticleIds } = useChatStore();
  
  const { isAuthenticated, showSignIn, initialize, loading } = useUserStore();

  const { sendRequest } = useHttp();

  useEffect(() => {
    const fetchArticleIds = async () => {
      try {
        if (isAuthenticated) {
          const articleIds = await sendRequest({
            url: '/articles',
          });
          setArticleIds(articleIds);
        }
      } catch (error) {
        console.error('Error fetching article IDs:', error);
      }
    };

    fetchArticleIds();
  }, [isAuthenticated, sendRequest, setArticleIds]);

  useEffect(() => {
    const handleNewArticleId = (message, sender, sendResponse) => {
      if (message.type === "NEW_ARTICLE_ID") {
        addArticleId(message.articleId);
      }
    };

    chrome.runtime.onMessage.addListener(handleNewArticleId);

    return () => {
      chrome.runtime.onMessage.removeListener(handleNewArticleId);
    };
  }, [addArticleId]);

  useEffect(() => {
    // Initialize user store
    initialize();
  }, [initialize]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div>
        {showSignIn ? <SignIn /> : <SignUp />}
      </div>
    );
  }

  return (
    <Router>
      <div>
        <Routes>
          <Route path="/" element={<Header showHamburgerMenu={false} handleDrawerToggle={toggleSidebar} />} />
          <Route path="/chat-room" element={<Header showHamburgerMenu={true} handleDrawerToggle={toggleSidebar} />} />
        </Routes>
        <Routes>
          <Route path="/" element={<Summarizer />} />
          <Route path="/chat-room" element={<ChatRoom />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
