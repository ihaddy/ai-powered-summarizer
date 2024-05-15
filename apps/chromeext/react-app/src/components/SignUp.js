/* global chrome */
import React, { useState } from 'react';
import useUserStore from './userStore';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import CardActions from '@mui/material/CardActions';
import Typography from '@mui/material/Typography';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import useHttp from '../../../../shared/hooks/useHttp';

const SignUp = ({ onSwitchToSignIn }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [openErrorSnackbar, setOpenErrorSnackbar] = useState(false);
  const [openSuccessSnackbar, setOpenSuccessSnackbar] = useState(false);
  const setUser = useUserStore((state) => state.setUser);
  const { isLoading, error, sendRequest } = useHttp();

  const handleSignupSuccess = (jwtToken, userEmail) => {
    chrome.runtime.sendMessage({
      type: "LOGIN_SUCCESS",
      data: {
        jwtToken,
        userEmail
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setOpenErrorSnackbar(true);
      return;
    }

    try {
      const userData = await sendRequest({
        url: '/signup',
        method: 'POST',
        body: { email, password }
      });

      setUser({ ...userData, isAuthenticated: true });
      setOpenSuccessSnackbar(true);

      // Assuming the backend now also sends a JWT token upon signup
      handleSignupSuccess(userData.jwtToken, email);
    } catch (error) {
      console.error('Signup error:', error);
      // Handle signup errors
    }
  };

  const handleCloseSnackbar = () => {
    setOpenErrorSnackbar(false);
    setOpenSuccessSnackbar(false);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Card style={{ width: 400 }}>
        <CardContent>
          <Typography variant="h5" component="h2" gutterBottom>
            Sign Up
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
              error={openErrorSnackbar}
              helperText={openErrorSnackbar ? "Passwords don't match" : ""}
            />
            <TextField
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              error={openErrorSnackbar}
            />
            <Button type="submit" variant="contained" color="primary">
              Sign Up
            </Button>
          </form>
        </CardContent>
        <CardActions style={{ justifyContent: 'center' }}>
          <Button size="small" onClick={onSwitchToSignIn}>
            Already have an account? Sign In
          </Button>
        </CardActions>
      </Card>
      <Snackbar open={openErrorSnackbar} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity="error" sx={{ width: '100%' }}>
          Passwords don't match!
        </Alert>
      </Snackbar>
      <Snackbar open={openSuccessSnackbar} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          Registration Successful!
        </Alert>
      </Snackbar>
    </div>
  );
};

export default SignUp;
