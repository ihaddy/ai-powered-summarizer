import React, { useEffect } from 'react';
import { Box, Drawer, List, ListItem, ListItemText, IconButton, Toolbar } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import useChatStore from './chatstore';
import Chat from './Chat';
import useHttp from '../hooks/useHttp';

function ChatRoom() {
    const { sendRequest } = useHttp();
    const { isSidebarOpen, toggleSidebar, articleIds, setActiveChatId, activeChatId, setArticleIds } = useChatStore();
    const drawerWidth = 240;

    const fetchArticleTitles = async () => {
        try {
            const articleTitles = await sendRequest({ url: `/article-titles` });
            setArticleIds(articleTitles);
        } catch (error) {
            console.error('Error fetching article titles:', error);
        }
    };

    useEffect(() => {
        fetchArticleTitles();
    }, []);

    const handleChatClick = (articleId) => {
        setActiveChatId(articleId);
    };

    return (
        <Box sx={{ display: 'flex', width: '100%', height: '100vh' }}>
            <Drawer
                variant="permanent"
                open={isSidebarOpen}
                sx={{
                    width: isSidebarOpen ? drawerWidth : 0,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: isSidebarOpen ? drawerWidth : 0,
                        boxSizing: 'border-box',
                        transition: (theme) => theme.transitions.create('width', {
                            easing: theme.transitions.easing.sharp,
                            duration: theme.transitions.duration.enteringScreen,
                        }),
                        overflowX: 'hidden',
                    },
                }}
            >
                <Toolbar>
                    <IconButton onClick={toggleSidebar}>
                        <ChevronLeftIcon />
                    </IconButton>
                </Toolbar>
                <List>
                    {articleIds.map((article, index) => (
                        <ListItem button key={article.articleId} onClick={() => handleChatClick(article.articleId)}>
                            <ListItemText primary={article.title || `Chat ${index + 1}`} />
                        </ListItem>
                    ))}
                </List>
            </Drawer>
            <Box component="main" sx={{ flexGrow: 1, overflow: 'hidden' }}>
                <Toolbar />
                <h2>Chat Room</h2>
                {activeChatId ? <Chat articleId={activeChatId} /> : <p>Select a chat to view the conversation.</p>}
            </Box>
        </Box>
    );
}

export default ChatRoom;
