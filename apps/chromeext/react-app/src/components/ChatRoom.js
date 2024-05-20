
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { Box, CircularProgress, Drawer, IconButton, List, ListItem, ListItemText, Toolbar } from '@mui/material';
import React from 'react';
import useChatStore from '../../../../shared/stores/chatstore';
import Chat from './Chat';

function ChatRoom() {
  const { isSidebarOpen, toggleSidebar, setActiveChatId, activeChatId, articles } = useChatStore();
  const drawerWidth = 240;

  // State to handle initial loading
  const [isLoading, setIsLoading] = React.useState(true);

  // UseEffect to control the loading spinner based on articles data
  React.useEffect(() => {
    if (articles.length > 0) {
      setIsLoading(false);
    }
  }, [articles]);

  const handleChatClick = (articleId) => {
    console.log('Setting active chat ID:', articleId);
    setActiveChatId(articleId);
  };

  console.log('Chatroom Rendering with articles:', articles);

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
          {isLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" p={2}>
              <CircularProgress />
            </Box>
          ) : (
            articles.map((article, index) => (
              <ListItem button key={article.articleId} onClick={() => handleChatClick(article.articleId)}>
                <ListItemText primary={article.title || `Chat ${index + 1}`} />
              </ListItem>
            ))
          )}
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
