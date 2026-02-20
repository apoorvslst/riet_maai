const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Sign up
router.post('/signup', async (req, res) => {
    try {
        const { name, email, phoneNumber, password } = req.body;

        // Check if user already exists
        if (email) {
            const existingUser = await User.findOne({ email });
            if (existingUser) return res.status(400).json({ message: 'Email already in use' });
        }
        if (phoneNumber) {
            const existingUser = await User.findOne({ phoneNumber });
            if (existingUser) return res.status(400).json({ message: 'Phone number already in use' });
        }

        if (!email && !phoneNumber) {
            return res.status(400).json({ message: 'Email or phone number is required' });
        }

        const user = new User({ name, email, phoneNumber, password });
        await user.save();

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

        res.status(201).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phoneNumber: user.phoneNumber
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { identifier, password } = req.body; // identifier can be email or phone

        const user = await User.findOne({
            $or: [{ email: identifier }, { phoneNumber: identifier }]
        });

        if (!user) return res.status(400).json({ message: 'Invalid credentials' });

        const isMatch = await user.comparePassword(password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phoneNumber: user.phoneNumber
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
