import React, { useEffect, useState } from 'react';
import useChatStore from '../chatstore';
import useHttp from '../useHttp';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import Skeleton from 'react-loading-skeleton';

const Chat = ({ articleId }) => {
  const { getChatHistory, setChatHistory, getArticle, setArticles, setThumbnail, getThumbnail } = useChatStore();
  const { sendRequest } = useHttp();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchChatHistory = async () => {
      try {
        setIsLoading(true);
        const data = await sendRequest({ url: `/chat/${articleId}` });
        setChatHistory(articleId, data.chats || []);
        setThumbnail(articleId, data.thumbnail); // Save the thumbnail
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

  const history = getChatHistory(articleId) || [];
  const thumbnail = getThumbnail(articleId); // Retrieve the thumbnail

  const createMarkup = (text) => {
    const rawMarkup = marked(text);
    const sanitizedMarkup = DOMPurify.sanitize(rawMarkup);
    return { __html: sanitizedMarkup };
  };

  return (
    <div style={{ width: '100%', overflow: 'hidden' }}>
      {isLoading ? (
        <div>
          <Skeleton height={200} />
          <Skeleton count={3} />
        </div>
      ) : (
        <>
          {thumbnail && (
            <img src={thumbnail} alt="Article Thumbnail" style={{ width: '100%', height: 'auto' }} />
          )}
          <div className="chat-container" style={{ maxHeight: 'calc(100vh - 150px)', overflowY: 'auto' }}>
            {history.length === 0 ? (
              <p>No chat history currently available.</p>
            ) : (
              history.map((chat, index) => (
                <div key={index} className={`chat-message ${chat.sender}`}>
                  <div className="message-content" dangerouslySetInnerHTML={createMarkup(chat.message)}></div>
                  <div className="message-timestamp">{new Date(chat.timestamp).toLocaleTimeString()}</div>
                </div>
              ))
            )}
          </div>
        </>
      )}
      <style>{`
        .chat-container {
          display: flex;
          flex-direction: column;
          max-height: 60vh;
          overflow-y: auto;
        }
        .chat-message {
          max-width: 100%;
          word-wrap: break-word;
          margin: 10px;
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
      `}</style>
    </div>
  );
};

export default Chat;
