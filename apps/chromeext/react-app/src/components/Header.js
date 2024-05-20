import MenuIcon from '@mui/icons-material/Menu';
import { AppBar, Button, IconButton, Toolbar, Typography, useTheme } from '@mui/material';
import React from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import useUserStore from '../../../../shared/stores/userStore'; // Adjust the path to your actual file location

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
