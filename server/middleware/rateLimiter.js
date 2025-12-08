const rateLimit = require('express-rate-limit');
const { logSecurity } = require('../utils/logger');

/**
 * Rate Limiters for WORK360 Security
 * 
 * Protects against:
 * - Brute-force login attacks
 * - Heavy endpoint flooding
 * - Server resource exhaustion
 */

/**
 * Login Rate Limiter
 * Prevents brute-force password attacks
 * 
 * Limits: 10 attempts per IP per 15 minutes
 * Response: 429 with friendly Italian message
 */
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per windowMs
    message: {
        message: 'Troppi tentativi di accesso. Riprova tra qualche minuto.'
    },
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    validate: { trustProxy: false }, // Disable trust proxy validation for Railway

    // Custom handler to log security events
    handler: (req, res, next, options) => {
        logSecurity('Login rate limit exceeded', {
            ip: req.ip,
            path: req.originalUrl,
            userAgent: req.get('user-agent'),
            attempts: req.rateLimit?.current || 'unknown'
        });

        return res.status(429).json({
            message: 'Troppi tentativi di accesso. Riprova tra qualche minuto.'
        });
    }
});

/**
 * Heavy Endpoint Rate Limiter
 * Protects resource-intensive endpoints (analytics, OCR, exports)
 * 
 * Limits: 30 requests per IP per minute
 * Response: 429 with friendly Italian message
 */
const heavyEndpointLimiter = rateLimit({
    windowMs: 60 * 1000, // 60 seconds (1 minute)
    max: 30, // Limit each IP to 30 requests per windowMs
    message: {
        message: 'Hai effettuato troppe richieste in poco tempo. Riprova tra un momento.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false }, // Disable trust proxy validation for Railway

    // Custom handler to log security events
    handler: (req, res, next, options) => {
        logSecurity('Heavy endpoint rate limit exceeded', {
            ip: req.ip,
            path: req.originalUrl,
            method: req.method,
            userId: req.user?._id || null,
            companyId: req.user?.company || null,
            userAgent: req.get('user-agent')
        });

        return res.status(429).json({
            message: 'Hai effettuato troppe richieste in poco tempo. Riprova tra un momento.'
        });
    },

    // Don't count successful requests (optional, helps with legitimate heavy use)
    skipSuccessfulRequests: false
});

/**
 * General API Rate Limiter (optional)
 * More permissive limit for general API usage
 * Can be applied globally to all routes
 * 
 * Limits: 100 requests per minute
 */
const generalLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        message: 'Troppe richieste. Rallenta un po\'.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false } // Disable trust proxy validation for Railway
});

module.exports = {
    loginLimiter,
    heavyEndpointLimiter,
    generalLimiter
};
