/* global chrome */
import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Summarizer from './components/Summarizer';
import ChatRoom from './components/ChatRoom';
// Import the store
import useChatStore from './components/chatstore';
import {BASE_URL} from '../src/buildvars'

function App() {
  const { isSidebarOpen, toggleSidebar, addArticleId, setArticleIds } = useChatStore();

  useEffect(() => {
    // Fetch all article IDs when the component mounts
    fetch(`${BASE_URL}/articles`)
      .then(response => response.json())
      .then(articleIds => {
        // Store the retrieved article IDs in the chat store
        setArticleIds(articleIds); // Replace addArticleId with setArticleIds for setting all at once
      })
      .catch(error => {
        console.error('Error fetching article IDs:', error);
      });

    // Any other initialization code
    console.log('React App component mounted');
  }, [setArticleIds]);


  useEffect(() => {
    console.log('React App component mounted');
    // Any other initialization code
  }, []);


  useEffect(() => {
    const handleNewArticleId = (message, sender, sendResponse) => {
      if (message.type === "NEW_ARTICLE_ID") {
        addArticleId(message.articleId);
      }
    };

    // Add listener for messages from the background script
    chrome.runtime.onMessage.addListener(handleNewArticleId);

    return () => {
      // Remove the listener when the component is unmounted
      chrome.runtime.onMessage.removeListener(handleNewArticleId);
    };
  }, [addArticleId]);
  return (<div>




    <Router>
      <div>
        <h1>hello test</h1>
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
  </div>);

}

export default App;
