import express, { Response } from 'express';
import User from '../models/UserModel';
import validator from 'validator';
import jwt from 'jsonwebtoken'; // make sure jwt is imported
import { Request } from '../customTypes/request';
const router = express.Router();

router.post('/signin', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      console.log(`Failed login attempt for email: ${email}`);
      return res.status(401).json({ error: 'Authentication failed' });
    }

    const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET as string, { expiresIn: '24h' });

    // Include user email (and any other necessary user data) in the response along with the token
    res.json({ user: { email: user.email }, jwtToken: token }); // Adjust based on the data you want to send
  } catch (error) {
    console.error('Sign-in error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Input Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (!validator.isLength(password, { min: 6 })) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const user = new User({ email, password });
    await user.save();

    console.log(`User created: ${email}`);

    const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET as string, { expiresIn: '24h' });
    res.status(201).json({ user: { email: user.email }, jwtToken: token });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
export default router;
