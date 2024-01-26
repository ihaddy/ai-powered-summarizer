import React, { useEffect } from 'react';
import useChatStore from './chatstore';
import {BASE_URL, SECURE_TOKEN} from   '../buildvars'

const Chat = ({ articleId }) => {
    const { getChatHistory, setChatHistory,getVideoTitle, setVideoTitle } = useChatStore();
    const url = `${BASE_URL}/chat/${articleId}`;
    const videoTitle = getVideoTitle(articleId) || `Chat History for ${articleId}`;


    useEffect(() => {
        const loadChatHistory = async () => {
            const history = getChatHistory(articleId);
            if (!history || history.length === 0) {
                try {
                    const response = await fetch(url,  {headers: {
                        'securetoken': SECURE_TOKEN
                    }});
                    if (response.ok) {
                        const data = await response.json();
                        console.log("Received data from server:", data);
                        
                        // Update chat history
                        if (data && data.chats) {
                            setChatHistory(articleId, data.chats);
                        } else {
                            console.error('Unexpected response format:', data);
                            setChatHistory(articleId, []);
                        }

                        // Update video title if available
                        if (data && data.title) {
                            setVideoTitle(articleId, data.title);
                        }
                    } else {
                        console.error(`Failed to fetch chat history: ${response.status} - ${response.statusText}`);
                        setChatHistory(articleId, []);
                    }
                } catch (error) {
                    console.error('Error fetching chat history:', error);
                    setChatHistory(articleId, []);
                }
            }
        };

        if (articleId) {
            loadChatHistory();
        }
    }, [articleId, getChatHistory, setChatHistory, setVideoTitle]);

    const history = getChatHistory(articleId) || [];

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
