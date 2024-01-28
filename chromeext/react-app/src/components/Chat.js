import React, { useEffect } from 'react';
import useChatStore from './chatstore';
import useHttp from '../hooks/useHttp';

const Chat = ({ articleId }) => {
    const { getChatHistory, setChatHistory, getArticle } = useChatStore();
    const { sendRequest } = useHttp();

    useEffect(() => {
        const fetchChatHistory = async () => {
            try {
                const data = await sendRequest({ url: `/chat/${articleId}` });
                setChatHistory(articleId, data.chats || []);
            } catch (error) {
                console.error('Error fetching chat history:', error);
            }
        };

        if (articleId) {
            fetchChatHistory();
        }
    }, [articleId, sendRequest, setChatHistory]);

    const history = getChatHistory(articleId) || [];
    const article = getArticle(articleId) || {};
    const videoTitle = article.title || `Chat History for ${articleId}`

    return (
        <div style={{ width: '100%', overflow: 'hidden' }}>
            <h3>Chat History for SUMMARY of "{videoTitle}"</h3>
            <div className="chat-container" style={{ maxHeight: 'calc(100vh - 150px)', overflowY: 'auto' }}>
                {history.length === 0 ? (
                    <p>No chat history currently available.</p>
                ) : (
                    history.map((chat, index) => (
                        <div key={index} className={`chat-message ${chat.sender}`}>
                            <div className="message-content">{chat.message}</div>
                            <div className="message-timestamp">{new Date(chat.timestamp).toLocaleTimeString()}</div>
                        </div>
                    ))
                )}
            </div>
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
