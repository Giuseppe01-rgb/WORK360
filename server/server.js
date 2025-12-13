// PostgreSQL Migration v1.0 - All fixes verified locally 2024-12-08
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize, testConnection } = require('./config/database');

// Security: Validate critical environment variables
if (!process.env.JWT_SECRET) {
    console.error('FATAL ERROR: JWT_SECRET is not defined in environment variables');
    process.exit(1);
}

// Validate DATABASE_URL from Railway PostgreSQL
const dbUrl = process.env.DATABASE_URL
    || process.env.POSTGRES_URL
    || process.env.DATABASE_PRIVATE_URL
    || process.env.PGURL;

if (!dbUrl) {
    console.error('FATAL ERROR: No PostgreSQL connection string found');
    console.error('Checked: DATABASE_URL, POSTGRES_URL, DATABASE_PRIVATE_URL, PGURL');
    process.exit(1);
}

const helmet = require('helmet');

// Configure Cloudinary for photo uploads (required for Railway - no persistent disk storage)
const cloudinary = require('cloudinary').v2;
if (process.env.CLOUDINARY_CLOUD_NAME) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
    console.log('✅ Cloudinary configured:', process.env.CLOUDINARY_CLOUD_NAME);
} else {
    console.warn('⚠️ Cloudinary not configured - photo uploads will fail');
}

// Initialize express
const app = express();

// Import logger for global error handlers
const { logFatal } = require('./utils/logger');

// =============================================================================
// GLOBAL ERROR HANDLERS (Level 6 Security)
// Must be registered early, before any async operations start
// =============================================================================

/**
 * Handle unhandled promise rejections
 * Common causes: forgotten .catch(), database connection failures, external API timeouts
 * 
 * We log the error but do NOT exit the process:
 * - Railway will detect repeated unhealthy responses and restart if needed
 * - Exiting on every rejection could cause restart loops
 * - Some rejections are recoverable (e.g., a single failed DB query)
 */
process.on('unhandledRejection', (reason, promise) => {
    logFatal('Unhandled Promise Rejection', {
        type: 'unhandledRejection',
        reason: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined
    });
    // Do NOT exit - let the healthcheck detect if the app is truly broken
});

/**
 * Handle uncaught synchronous exceptions
 * These are more serious - the process may be in an unstable state
 * 
 * We log and exit:
 * - Uncaught exceptions leave the process in undefined state
 * - Railway will automatically restart the container
 * - This is the recommended Node.js best practice
 */
process.on('uncaughtException', (err) => {
    logFatal('Uncaught Exception - Process will exit', {
        type: 'uncaughtException',
        message: err.message,
        stack: err.stack
    });
    // Exit with error code - Railway will restart the container
    process.exit(1);
});

// Test PostgreSQL connection
testConnection().catch(err => {
    console.error('Failed to connect to PostgreSQL:', err);
    process.exit(1);
});

// Import models to establish associations
require('./models');

// Security Headers
app.use(helmet());

// Trust proxy - required for Railway/production deployments
app.set('trust proxy', true);

// Middleware
// CORS configuration
const getAllowedOrigins = () => {
    const isDevelopment = process.env.NODE_ENV !== 'production';

    if (isDevelopment) {
        // In development, allow localhost
        return [
            'http://localhost:5173',
            'http://localhost:3000',
            'http://localhost:5174',
            'http://127.0.0.1:5173',
            'http://127.0.0.1:3000'
        ];
    } else {
        // PRODUCTION: Require explicit whitelist
        const origins = process.env.CORS_ALLOWED_ORIGINS;

        if (!origins) {
            console.error('=====================================================');
            console.error('FATAL: CORS_ALLOWED_ORIGINS not set in production!');
            console.error('Please set CORS_ALLOWED_ORIGINS in environment variables.');
            console.error('Example: CORS_ALLOWED_ORIGINS="https://work360.vercel.app,https://work360-production.vercel.app"');
            console.error('=====================================================');
            // Return empty array - will block all CORS requests
            return [];
        }

        return origins.split(',').map(origin => origin.trim());
    }
};

const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = getAllowedOrigins();
        const isDevelopment = process.env.NODE_ENV !== 'production';

        // In development, allow requests with no origin (Postman, curl, etc.)
        if (isDevelopment && !origin) {
            return callback(null, true);
        }

        // In production, verify against whitelist
        if (allowedOrigins.length === 0 && !isDevelopment) {
            console.error('CORS: No allowed origins configured');
            return callback(new Error('CORS not configured'));
        }

        // Allow requests with no origin for migrate endpoint (handled separately)
        if (!origin) {
            // This will be handled by the migrate route's own CORS bypass
            return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`BLOCKED BY CORS: ${origin}`);
            console.warn(`Allowed origins: ${allowedOrigins.join(', ')}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400 // 24 hours
};

// CORS bypass for migration endpoint (temporary - remove after migration)
// This MUST come BEFORE the general CORS middleware
app.use('/api/migrate', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

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
app.use('/api/migrate', require('./routes/migrate')); // Temporary migration endpoint
app.use('/api/work-activities', require('./routes/workActivityRoutes'));
app.use('/api/communication', require('./routes/communicationRoutes'));
app.use('/api/economia', require('./routes/economiaRoutes'));
app.use('/api/audit-logs', require('./routes/auditLogRoutes'));
app.use('/api/backup', require('./routes/backupRoutes')); // Data backup/export endpoints

// Colora Material Tracking System
app.use('/api/coloura-materials', require('./routes/colouraMaterialRoutes'));
app.use('/api/material-usage', require('./routes/materialUsageRoutes'));
app.use('/api/reported-materials', require('./routes/reportedMaterialRoutes'));
app.use('/api/fix-fk', require('./routes/fixMaterialFK')); // Temporary FK fix

// Push Notifications
app.use('/api/push', require('./routes/push'));

// =============================================================================
// HEALTHCHECK ENDPOINT (Level 6 Security)
// Used by Railway for service health monitoring
// =============================================================================
app.get('/api/health', async (req, res) => {
    let dbStatus = 'error';

    try {
        // Quick database connectivity check
        await sequelize.query('SELECT 1');
        dbStatus = 'ok';
    } catch (error) {
        // Log DB health check failure but don't crash - let Railway know via response
        console.error('[HEALTH] Database check failed:', error.message);
    }

    // Return comprehensive health status
    res.json({
        status: 'ok',
        uptime: Math.floor(process.uptime()),  // Server uptime in seconds
        timestamp: new Date().toISOString(),    // Current server time
        db: dbStatus                             // Database connectivity
    });
});

// Global error handling middleware
app.use((err, req, res, next) => {
    const { logError, logSecurity } = require('./utils/logger');

    const statusCode = err.statusCode || 500;

    const meta = {
        ip: req.ip,
        path: req.originalUrl,
        method: req.method,
        userId: req.user?._id || null,
        companyId: req.user?.company || null,
        userAgent: req.get('user-agent'),
        statusCode
    };

    // Log based on error type
    if (statusCode >= 500) {
        // Server errors - full logging with stack trace
        logError(err.message || 'Internal server error', {
            ...meta,
            errorName: err.name,
            stack: err.stack
        });
    } else if (statusCode === 401 || statusCode === 403) {
        // Security-relevant errors (unauthorized/forbidden)
        logSecurity(`${statusCode} ${err.name || 'Authentication error'}: ${err.message}`, meta);
    } else {
        // Client errors (400, 404, etc.)
        logError(`${statusCode} ${err.name || 'Client error'}: ${err.message}`, meta);
    }

    // Generic message for 500 errors, specific for others
    const message = statusCode >= 500
        ? 'Si è verificato un errore interno. Riprova più tardi.'
        : err.message || 'Si è verificato un errore.';

    // NEVER send stack trace to client
    res.status(statusCode).json({
        message,
        // Only include error name in development (not stack)
        ...(process.env.NODE_ENV !== 'production' && { error: err.name })
    });
});

const PORT = process.env.PORT || 5001;

// Sync database and start server
sequelize.sync({ alter: process.env.NODE_ENV === 'development' })
    .then(async () => {
        console.log('✅ Database synced successfully');

        // Run one-time migrations
        try {
            // Ensure activity_type column is TEXT (not VARCHAR(255)) for long descriptions
            await sequelize.query(`
                DO $$ 
                BEGIN 
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'work_activities' 
                        AND column_name = 'activity_type' 
                        AND data_type = 'character varying'
                    ) THEN
                        ALTER TABLE work_activities ALTER COLUMN activity_type TYPE TEXT;
                        RAISE NOTICE 'Migrated activity_type to TEXT';
                    END IF;
                END $$;
            `);

            // Ensure economias.hours is DECIMAL(10,2) for bulk entries (not DECIMAL(4,1))
            await sequelize.query(`
                DO $$ 
                BEGIN 
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'economias' 
                        AND column_name = 'hours' 
                        AND numeric_precision = 4
                    ) THEN
                        ALTER TABLE economias ALTER COLUMN hours TYPE DECIMAL(10,2);
                        RAISE NOTICE 'Migrated economias.hours to DECIMAL(10,2)';
                    END IF;
                END $$;
            `);

            console.log('✅ Migrations checked');
        } catch (migrationError) {
            console.error('[Migration] Error:', migrationError.message);
            // Don't exit - let the app continue even if migration fails
        }

        // Initialize notification scheduler after DB is ready
        try {
            const { initScheduler } = require('./jobs/notificationScheduler');
            initScheduler();
        } catch (error) {
            console.error('[Scheduler] Failed to initialize:', error.message);
        }

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`Database: PostgreSQL (Sequelize)`);
        });
    })
    .catch(err => {
        console.error('❌ Failed to sync database:', err);
        process.exit(1);
    });