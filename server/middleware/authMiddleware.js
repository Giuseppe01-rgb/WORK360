const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Validate token structure
            if (!decoded || !decoded.id) {
                return res.status(401).json({ message: 'Non autorizzato, token non valido' });
            }

            // Get user from token
            req.user = await User.findById(decoded.id).select('-password').populate('company');

            if (!req.user) {
                return res.status(401).json({ message: 'Utente non trovato' });
            }

            next();
        } catch (error) {
            console.error(error);
            return res.status(401).json({ message: 'Non autorizzato, token non valido' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Non autorizzato, nessun token' });
    }
};

// Require owner role
const requireOwner = (req, res, next) => {
    if (req.user && req.user.role === 'owner') {
        next();
    } else {
        res.status(403).json({ message: 'Accesso negato. Solo i titolari possono accedere a questa risorsa.' });
    }
};

// Require worker role (or owner, since owner can do everything worker can)
const requireWorker = (req, res, next) => {
    if (req.user && (req.user.role === 'worker' || req.user.role === 'owner')) {
        next();
    } else {
        res.status(403).json({ message: 'Accesso negato.' });
    }
};

module.exports = { protect, requireOwner, requireWorker };
