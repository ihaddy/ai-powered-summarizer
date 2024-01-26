import React, {useEffect} from 'react';
import { Box, Drawer, List, ListItem, ListItemText, IconButton, Toolbar } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import useChatStore from './chatstore';
import Chat from './Chat';
import {BASE_URL, SECURE_TOKEN} from '../buildvars'

function ChatRoom() {
    const { isSidebarOpen, toggleSidebar, articleIds, setActiveChatId, activeChatId, getVideoTitle, setVideoTitle } = useChatStore();
    const drawerWidth = 240;

    const fetchAndUpdateTitle = async (articleId) => {
        try {
            const response = await fetch(`${BASE_URL}/chat/${articleId}`,  {headers: {
                'securetoken': SECURE_TOKEN
            }});
            if (response.ok) {
                const data = await response.json();
                if (data && data.title) {
                    setVideoTitle(articleId, data.title);
                }
            }
        } catch (error) {
            console.error('Error fetching video title:', error);
        }
    };

    useEffect(() => {
        articleIds.forEach(articleId => {
            fetchAndUpdateTitle(articleId);
        });
    }, [articleIds]);

    const handleChatClick = (articleId) => {
        console.log("Chat clicked with articleId:", articleId);
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
                    {articleIds.map((articleId, index) => {
                        const title = getVideoTitle(articleId) || `Chat ${index + 1}: ${articleId}`;
                        return (
                            <ListItem button key={articleId} onClick={() => handleChatClick(articleId)}>
                                <ListItemText primary={title} />
                            </ListItem>
                        );
                    })}
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
