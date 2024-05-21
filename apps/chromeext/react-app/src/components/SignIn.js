/* global chrome */
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Snackbar from '@mui/material/Snackbar';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import React, { useState } from 'react';
import useHttp from '../useHttp';
import useUserStore from '../userStore';

const SignIn = ({ onSignInSuccess, onSwitchToSignUp }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('error');
  const { setUser, toggleSignIn } = useUserStore();
  const { isLoading, error, sendRequest } = useHttp();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const userData = await sendRequest({
        url: '/signin',
        method: 'POST',
        body: { email, password }
      });
  
      // Set user data and JWT in Zustand store and mark as authenticated
      // Assuming userData contains the user object and jwtToken separately
      setUser(userData.user, userData.jwtToken);
  
      // Display a success message
      setSnackbarMessage('Sign in successful');
      setSnackbarSeverity('success');
      setOpenSnackbar(true);
  
      // Close the snackbar after a delay
      setTimeout(() => {
        setOpenSnackbar(false);
      }, 2000);
  
  
      // Send credentials to the background script
      handleLoginSuccess(userData.jwtToken, userData.user.email);
      
    } catch (error) {
      console.error('Login error:', error);
      setSnackbarMessage('Login error');
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
    }
  };
  

const handleLoginSuccess = (jwtToken, userEmail) => {
  chrome.runtime.sendMessage({
    type: "LOGIN_SUCCESS",
    data: {
      jwtToken,
      userEmail
    }
  });
};

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Card style={{ width: 400 }}>
        <CardContent>
          <Typography variant="h5" component="h2" gutterBottom>
            Sign In
          </Typography>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" variant="contained" color="primary">
              Sign In
            </Button>
          </form>
        </CardContent>
        <CardActions style={{ justifyContent: 'center' }}>
          <Button size="small" onClick={onSwitchToSignUp}>
            Don't have an account? Sign Up
          </Button>
        </CardActions>
      </Card>
      <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default SignIn;
