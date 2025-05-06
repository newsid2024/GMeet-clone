const router = require('express').Router();
const passport = require('passport');
const User = require('../models/user-model');
const { generateToken } = require('../config/jwt');
const { requireAuth } = require('../middleware/authMiddleware');
const express = require('express');

// Add middleware to parse JSON body
router.use(express.json());

// Login page
router.get('/login', (req, res) => {
    res.render('login', { user: req.user });
});

// Logout route
router.get('/logout', (req, res) => {
    // Clear JWT cookie if it exists
    if (res.clearCookie) {
        res.clearCookie('token');
    }
    
    // Also handle session-based logout for passport
    req.logout((err) => {
        if (err) { return next(err); }
        res.redirect('/');
    });
});

// Google OAuth routes
router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email']
}));

// Google OAuth callback - now with JWT token
router.get('/google/redirect', passport.authenticate('google'), (req, res) => {
    // Generate JWT token
    const token = generateToken(req.user);
    
    // Set token as cookie
    res.cookie('token', token, { 
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    });
    
    res.redirect('/profile');
});

// NEW: Email/Password Registration
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // Validate input
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Please provide all required fields' });
        }
        
        // Check if user with this email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already in use' });
        }
        
        // Create new user
        const newUser = new User({
            username,
            email,
            password // Will be hashed by pre-save hook in model
        });
        
        await newUser.save();
        
        // Generate JWT token
        const token = generateToken(newUser);
        
        // Send token in response
        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: newUser._id,
                username: newUser.username,
                email: newUser.email,
                role: newUser.role
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// NEW: Email/Password Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Please provide email and password' });
        }
        
        // Find user by email
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Verify password
        const isMatch = await user.comparePassword(password);
        
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Generate JWT token
        const token = generateToken(user);
        
        // Send token in response
        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// NEW: Get current user info (protected route)
router.get('/me', requireAuth, (req, res) => {
    res.json({
        user: {
            id: req.user._id,
            username: req.user.username,
            email: req.user.email,
            role: req.user.role
        }
    });
});

// NEW: Refresh token
router.post('/refresh-token', requireAuth, (req, res) => {
    // Generate new token
    const token = generateToken(req.user);
    
    res.json({ token });
});

module.exports = router;
