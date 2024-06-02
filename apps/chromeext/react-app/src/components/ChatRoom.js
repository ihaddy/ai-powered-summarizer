import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import SearchIcon from '@mui/icons-material/Search';
import { Box, CircularProgress, Drawer, IconButton, InputAdornment, List, ListItem, ListItemText, TextField, Toolbar } from '@mui/material';
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
  const { isSidebarOpen, toggleSidebar, setActiveChatId, activeChatId, articles, searchResults, setArticles, clearSearchResults, setSearchResults } = useChatStore();
  const drawerWidth = 240;
  const socket = useSocketStore((state) => state.socket);
  const [isLoading, setIsLoading] = React.useState(true);  // Set initial loading to true
  const [searchTerm, setSearchTerm] = React.useState('');


  React.useEffect(() => {
    if (!socket) return;

    const handleArticles = (articles) => {
      setIsLoading(false);  // Set loading to false when articles are received
    };

    const handleSearchResults = (results) => {
      setSearchResults(results);
      setIsLoading(false);  // Set loading to false when search results are received
    };

    socket.on('articles', handleArticles);
    socket.on('search-results', handleSearchResults);

    return () => {
      socket.off('articles', handleArticles);
      socket.off('search-results', handleSearchResults);
    };
  }, [socket, setArticles, setSearchResults]);

  React.useEffect(() => {
    if (articles !== null || searchResults !== null) {
      setIsLoading(false);
    }
  }, [articles, searchResults]);

  const handleChatClick = (article) => {
    const articleId = article.articleId || article.id;
    setActiveChatId(articleId);
    socket.emit('getChatDetails', articleId);
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

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    if (e.target.value === '') {
      clearSearchResults();
    }
  };

  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter' && searchTerm && socket) {
      setIsLoading(true);
      socket.emit('searchMessages', searchTerm);
    }
  };

  const displayedArticles = searchResults || articles?.articles || [];

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
        <Box sx={{ p: 2 }}>
          <TextField
            variant="outlined"
            fullWidth
            placeholder="Search..."
            value={searchTerm}
            onChange={handleSearchChange}
            onKeyDown={handleSearchSubmit}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>
        <List>
          {isLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" p={2}>
              <CircularProgress />
            </Box>
          ) : (
            Array.isArray(displayedArticles) && displayedArticles.length > 0 ? (
              displayedArticles.map((article, index) => (
                <ListItem button key={article.articleId || article.id} onClick={() => handleChatClick(article)}>
                  <ListItemText primary={article.title || `Chat ${index + 1}`} />
                </ListItem>
              ))
            ) : (
              <ListItem>
                <ListItemText primary="No articles available" />
              </ListItem>
            )
          )}
        </List>
      </StyledDrawer>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: `calc(100% - ${isSidebarOpen ? drawerWidth : 0}px)`,
          transition: (theme) => theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        {activeChatId ? <Chat articleId={activeChatId} /> : <div>Select a chat to view</div>}
      </Box>
    </Box>
  );
}

export default ChatRoom;
