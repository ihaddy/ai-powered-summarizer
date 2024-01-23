const express = require('express');
const User = require('../models/UserModel');
const validator = require('validator');
const router = express.Router();

router.post('/signin', async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await User.findOne({ username });
  
      if (!user || !(await user.comparePassword(password))) {
        return res.status(401).send('Authentication failed');
      }
  
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.json({ token });
    } catch (error) {
      res.status(500).send('Internal server error');
    }
  });
  

router.post('/signup', async (req, res) => {
    try {
      const { username, password } = req.body;
  
      // Input Validation
      if (!username || !password) {
        return res.status(400).send('Username and password are required');
      }
  
      if (!validator.isAlphanumeric(username)) {
        return res.status(400).send('Username must be alphanumeric');
      }
  
      if (!validator.isLength(password, { min: 6 })) {
        return res.status(400).send('Password must be at least 6 characters long');
      }
  
      // Check if the user already exists
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).send('Username already exists');
      }
  
      // Create a new user
      const user = new User({ username, password });
      await user.save();
  
      res.status(201).send('User created successfully');
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal server error');
    }
  });

  
  module.exports = router;
