/**
 * Janani AI - Maternal Health Backend
 * Main Entry Point for Render Deployment
 */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Route Imports
const authRoutes = require('./routes/auth');
const voiceRoutes = require('./routes/voice');
const inboundRoutes = require('./routes/inbound');
const dashboardRoutes = require('./routes/dashboard');

// Service Imports
const { initSummaryCron } = require('./services/summaryCron');

const app = express();

// --- Middleware ---
// Using '*' for origin to ensure Vercel/Localhost/Render can all communicate
app.use(cors({ 
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Static folder for any public assets (e.g., recorded audio or reports)
app.use('/public', express.static(path.join(__dirname, 'public')));

/**
 * 1. ROOT ROUTE 
 * This specifically fixes the "Cannot GET /" error you are seeing.
 * If this code is deployed, visiting your base URL will show this JSON.
 */
app.get('/', (req, res) => {
    res.json({
        message: "Welcome to the Janani AI Maternal Health API",
        status: "Online",
        version: "1.1.0",
        system_info: {
            service: "riet_maai",
            deployment: "Render Cloud",
            endpoints: [
                "/api/status",
                "/api/voice/webhook",
                "/api/dashboard/logs"
            ]
        }
    });
});

/**
 * 2. HEALTH CHECK ROUTE
 * You confirmed this works at /api/status.
 */
app.get('/api/status', (req, res) => {
    res.json({
        status: "Janani AI Backend is Live",
        mongodb: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
        server_time: new Date().toISOString(),
        node_version: process.version,
        webhook_base: process.env.WEBHOOK_BASE_URL || 'Not Configured'
    });
});

// --- 3. API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/inbound', inboundRoutes);
app.use('/api/dashboard', dashboardRoutes);

// --- 4. Database Connection & Services ---
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000, 
        });
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

        // Start summary cron jobs only after DB is ready
        if (typeof initSummaryCron === 'function') {
            initSummaryCron();
            console.log('⏰ Summary Cron Jobs Initialized');
        }
    } catch (err) {
        console.error('❌ MongoDB connection error:', err.message);
    }
};

connectDB();

// --- 5. Global Error Handling ---
app.use((err, req, res, next) => {
    console.error("🔥 Global Backend Error:", err.stack);
    res.status(err.status || 500).json({ 
        success: false,
        message: 'Internal Server Error', 
        error: process.env.NODE_ENV === 'development' ? err.message : 'Detailed error logged to server' 
    });
});

/**
 * 6. Port Binding (MANDATORY FOR RENDER)
 * Binding to 0.0.0.0 is critical for Render's external connectivity.
 */
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Janani Server is running on port ${PORT}`);
    console.log(`🌐 Live URL: ${process.env.WEBHOOK_BASE_URL}`);
});