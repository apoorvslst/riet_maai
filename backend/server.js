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
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:5173'];

const corsOptions = {
    origin: function (origin, callback) {
        // allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        const isAllowed = allowedOrigins.some(allowed => {
            if (allowed.includes('*')) {
                const regex = new RegExp('^' + allowed.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
                return regex.test(origin);
            }
            return allowed === origin;
        });

        // Also allow Vercel subdomains for the project automatically
        const isVercelPreview = origin.endsWith('.vercel.app');

        if (isAllowed || isVercelPreview) {
            callback(null, true);
        } else {
            console.warn(`CORS BLOCKED for origin: ${origin}`);
            console.warn(`Allowed origins are: ${allowedOrigins.join(', ')}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/public', express.static('public'));

// Routes
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
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

