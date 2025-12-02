require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

// Security: Validate critical environment variables
if (!process.env.JWT_SECRET) {
    console.error('FATAL ERROR: JWT_SECRET is not defined in environment variables');
    process.exit(1);
}

const helmet = require('helmet');

// Initialize express
const app = express();

// Connect to database
connectDB();

// Security Headers
app.use(helmet());

// Middleware
// CORS configuration
const getAllowedOrigins = () => {
    if (process.env.NODE_ENV === 'production') {
        // In production, use environment variable
        return process.env.CORS_ALLOWED_ORIGINS
            ? process.env.CORS_ALLOWED_ORIGINS.split(',')
            : [];
    } else {
        // In development, allow localhost
        return ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174'];
    }
};

const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = getAllowedOrigins();

        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Allow all *.vercel.app domains (for Vercel deployments)
        if (origin.endsWith('.vercel.app')) {
            return callback(null, true);
        }

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.warn(`BLOCKED BY CORS: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Log all requests (for debugging)
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} [Origin: ${req.get('origin') || 'None'}]`);
    next();
});

// Static files for uploads
const fs = require('fs');
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/materials', require('./routes/materialRoutes'));
app.use('/api/material-master', require('./routes/materialMasterRoutes'));
app.use('/api/equipment', require('./routes/equipmentRoutes'));
app.use('/api/notes', require('./routes/noteRoutes'));
app.use('/api/photos', require('./routes/photoRoutes'));
app.use('/api/company', require('./routes/companyRoutes'));
app.use('/api/quotes', require('./routes/quoteRoutes'));
app.use('/api/sals', require('./routes/salRoutes'));
app.use('/api/sites', require('./routes/siteRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/suppliers', require('./routes/supplierRoutes'));
app.use('/api/work-activities', require('./routes/workActivityRoutes'));
app.use('/api/communication', require('./routes/communicationRoutes'));
app.use('/api/economia', require('./routes/economiaRoutes'));

// Colora Material Tracking System
app.use('/api/coloura-materials', require('./routes/colouraMaterialRoutes'));
app.use('/api/material-usage', require('./routes/materialUsageRoutes'));
app.use('/api/reported-materials', require('./routes/reportedMaterialRoutes'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'WORK360 API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        message: 'Qualcosa è andato storto!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});