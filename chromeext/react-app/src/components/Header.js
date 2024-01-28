import React from 'react';
import { AppBar, Toolbar, Typography, IconButton, useTheme, Button } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useLocation, Link as RouterLink } from 'react-router-dom';
import useUserStore from '../components/userStore'; // Adjust the path to your actual file location

function Header({ handleDrawerToggle }) {
  const location = useLocation();
  const theme = useTheme();
  const showHamburgerMenu = location.pathname === '/chat-room';
  const logout = useUserStore(state => state.logout);

  const handleSignOut = () => {
    logout();
  };

 
  return (
    <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
      <Toolbar>
        {showHamburgerMenu && (
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ marginRight: 2 }}
          >
            <MenuIcon />
          </IconButton>
        )}
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          My App
        </Typography>
        <Button color="inherit" component={RouterLink} to="/">
          Summarizer
        </Button>
        <Button color="inherit" component={RouterLink} to="/chat-room">
          Chat Room
        </Button>
        <Button color="inherit" onClick={handleSignOut}>
          Sign Out
        </Button>
      </Toolbar>
    </AppBar>
  );
}

export default Header;
