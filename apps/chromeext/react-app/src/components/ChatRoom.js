import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { Box, CircularProgress, Drawer, IconButton, List, ListItem, ListItemText, Toolbar } from '@mui/material';
import { styled } from '@mui/material/styles';
import React from 'react';
import useChatStore from '../chatstore';
import Chat from './Chat';
import useSocketStore from '../useSocketStore';

const StyledDrawer = styled(Drawer)({
  '& .MuiDrawer-paper': {
    '&::-webkit-scrollbar': {
      width: '8px',
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: '#888',
      borderRadius: '4px',
    },
    '&::-webkit-scrollbar-thumb:hover': {
      backgroundColor: '#555',
    },
    '&::-webkit-scrollbar-track': {
      backgroundColor: '#f1f1f1',
    },
  },
});

function ChatRoom() {
  const { isSidebarOpen, toggleSidebar, setActiveChatId, activeChatId, articles, currentPage } = useChatStore();
  const drawerWidth = 240;
  const socket = useSocketStore((state) => state.socket);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (!socket) return;

    const handleArticles = () => {
        setIsLoading(false);
    };

    socket.on('articles', handleArticles);

    return () => {
        socket.off('articles', handleArticles);
    };
  }, [socket]);

  React.useEffect(() => {
    if (articles !== null) {
      setIsLoading(false);
    }
  }, [articles]);

  const handleChatClick = (articleId) => {
    setActiveChatId(articleId);
  };

  const handleScroll = (e) => {
    const { scrollHeight, scrollTop, clientHeight } = e.target;
    const threshold = 5;
    const bottom = scrollHeight - scrollTop <= clientHeight + threshold;
    const hasMorePages = articles.currentPage < articles.totalPages;

    if (bottom && !isLoading && hasMorePages && socket) {
      setIsLoading(true);
      socket.emit('getMoreArticles');
    }
  };

  React.useEffect(() => {
    const list = document.querySelector('.MuiDrawer-paper');
    if (list) {
      list.addEventListener('scroll', handleScroll);
      return () => list.removeEventListener('scroll', handleScroll);
    }
  }, [articles, socket]);

  return (
    <Box sx={{ display: 'flex', width: '100%', height: '100vh' }}>
      <StyledDrawer
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
            overflowY: 'auto',
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
            Array.isArray(articles?.articles) && articles.articles.map((article, index) => (
              <ListItem button key={article.articleId} onClick={() => handleChatClick(article.articleId)}>
                <ListItemText primary={article.title || `Chat ${index + 1}`} />
              </ListItem>
            ))
          )}
        </List>
      </StyledDrawer>
      <Box component="main" sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <Toolbar />
        <h2>Chat Room</h2>
        {activeChatId ? <Chat articleId={activeChatId} /> : <p>Select a chat to view the conversation.</p>}
      </Box>
    </Box>
  );
}

export default ChatRoom;
