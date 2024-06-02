/* global chrome */
import CircularProgress from '@mui/material/CircularProgress'; // Import a loading indicator component
import React, { useEffect } from 'react';
import { Route, HashRouter as Router, Routes } from 'react-router-dom';
import useHttp from './useHttp';
import useChatStore from './chatstore';
import useSocketStore from './useSocketStore';
import useUserStore from './userStore';
import ChatRoom from './components/ChatRoom';
import Header from './components/Header';
import SignIn from './components/SignIn';
import SignUp from './components/SignUp'; // Import SignUp component
import Summarizer from './components/Summarizer';

function App() {
  const { isSidebarOpen, toggleSidebar, addArticleId, setArticleIds } = useChatStore();
  const { socket } = useSocketStore();

  const connectSocket = useSocketStore(state => state.connectSocket);
  const disconnectSocket = useSocketStore(state => state.disconnectSocket);

  const jwtToken = useUserStore(state => state.jwtToken); // Access JWT token from the user store

    useEffect(() => {
        // Only attempt to connect the socket when jwtToken is available
        if (jwtToken) {
            connectSocket(); // Connect when the JWT token is available

            return () => {
                disconnectSocket(); // Clean up the connection when the component unmounts
            };
        }
    }, [jwtToken, connectSocket, disconnectSocket]);

  const { isAuthenticated, showSignIn, initialize, loading, toggleSignIn } = useUserStore();


  const { sendRequest } = useHttp();
  const setSendRequest = useSocketStore(state => state.setSendRequest);

  useEffect(() => {
    setSendRequest(sendRequest);
  }, [sendRequest, setSendRequest]);

  
  // useEffect(() => {
  //   const handleArticles = ({ page, articles }) => {
  //     console.log(`Received articles for page ${page} from WebSocket:`, articles);
  //     setArticleIds(articles, page, sendRequest);
  //   };

  //   if (socket) {
  //     socket.on('articles', handleArticles);
  //   }

  //   return () => {
  //     if (socket) {
  //       socket.off('articles', handleArticles);
  //     }
  //   };
  // }, [socket, sendRequest]);


  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
      const handleNewArticleId = (message, sender, sendResponse) => {
        if (message.type === "NEW_ARTICLE_ID") {
          addArticleId(message.articleId);
        }
      };

      chrome.runtime.onMessage.addListener(handleNewArticleId);

      return () => {
        chrome.runtime.onMessage.removeListener(handleNewArticleId);
      };
    }
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
        {showSignIn ? <SignIn onSwitchToSignUp={toggleSignIn} /> : <SignUp onSwitchToSignIn={toggleSignIn} />}
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
