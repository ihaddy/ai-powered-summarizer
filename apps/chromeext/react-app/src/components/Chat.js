import React, { useEffect, useState } from 'react';
import useChatStore from '../chatstore';
import useHttp from '../useHttp';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import Skeleton from 'react-loading-skeleton';
import useSocketStore from '../useSocketStore';

const Chat = ({ articleId }) => {
  const { getChatHistory, setChatHistory, getArticle, setArticles, setThumbnail, getThumbnail } = useChatStore();
  const { sendRequest } = useHttp();
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const { sendChatMessage } = useSocketStore();

  useEffect(() => {
    const fetchChatHistory = async () => {
      try {
        setIsLoading(true);
        const data = await sendRequest({ url: `/chat/${articleId}` });
        setChatHistory(articleId, data.chats || []);
        setThumbnail(articleId, data.thumbnail);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching chat history:', error);
        setIsLoading(false);
      }
    };

    if (articleId) {
      fetchChatHistory();
    }
  }, [articleId, sendRequest, setChatHistory, setArticles, setThumbnail]);
// WRONG way to subscribe to zustand state
  // const history = getChatHistory(articleId) || [];
  const history = useChatStore(state => state.chatHistories[articleId] || []);

  const thumbnail = getThumbnail(articleId);

  const createMarkup = (text) => {
    if (!text) return { __html: '' };
    const rawMarkup = marked(text);
    const sanitizedMarkup = DOMPurify.sanitize(rawMarkup);
    return { __html: sanitizedMarkup };
  };
  

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() !== '') {
      sendChatMessage(articleId, message);
      setMessage('');
    }
  };

  return (
    <div className="chat-wrapper">
      {isLoading ? (
        <div>
          <Skeleton height={200} />
          <Skeleton count={3} />
        </div>
      ) : (
        <>
          <div className="chat-content">
            {thumbnail && (
              <img src={thumbnail} alt="Article Thumbnail" className="thumbnail" />
            )}
            <div className="chat-container">
              {history.length === 0 ? (
                <p>No chat history currently available.</p>
              ) : (
                history.map((chat, index) => (
                  <div key={index} className={`chat-message ${chat.sender || chat.role}`}>
                    <div className="message-content" dangerouslySetInnerHTML={createMarkup(chat.message || chat.content)}></div>
                    <div className="message-timestamp">{new Date(chat.timestamp).toLocaleTimeString()}</div>
                  </div>
                ))
              )}
            </div>
          </div>
          <form onSubmit={handleSubmit} className="chat-input">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
            />
          </form>
        </>
      )}
      <style>{`
        .chat-wrapper {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .chat-content {
          flex: 1;
          overflow-y: auto;
        }
        .thumbnail {
          width: 100%;
          height: auto;
        }
        .chat-container {
          display: flex;
          flex-direction: column;
          padding: 10px;
        }
        .chat-message {
          max-width: 100%;
          word-wrap: break-word;
          margin-bottom: 10px;
          padding: 10px;
          border-radius: 20px;
        }
        .chat-message.system,
        .chat-message.ai {
          align-self: flex-start;
          background-color: #e5e5ea;
          color: black;
        }
        .chat-message.user {
          align-self: flex-end;
          background-color: #007aff;
          color: white;
        }
        .chat-input {
          padding: 10px;
        }
        .chat-input input {
          width: 100%;
          padding: 10px;
        }
      `}</style>
    </div>
  );
};

export default Chat;
