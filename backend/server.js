require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const voiceRoutes = require('./routes/voice');
const inboundRoutes = require('./routes/inbound');
const dashboardRoutes = require('./routes/dashboard');
const { initSummaryCron } = require('./services/summaryCron');

const app = express();

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/public', express.static('public'));

// Routes
app.get('/api/status', (req, res) => {
    res.json({
        status: "Janani AI Backend is Live",
        mongodb: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
        timestamp: new Date().toISOString()
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/inbound', inboundRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Database Connection + Cron Initialization
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected successfully');

        // Start summary cron jobs after DB is ready
        initSummaryCron();
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
        process.exit(1);
    }
};

connectDB();

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
    console.log(`🌐 Webhook Base URL: ${process.env.WEBHOOK_BASE_URL || 'Not Set'}`);
});

