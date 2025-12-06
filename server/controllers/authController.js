const User = require('../models/User');
const Company = require('../models/Company');
const { generateToken } = require('../utils/generateToken');
const { logSecurity, logInfo, logError } = require('../utils/logger');

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
    try {
        const { username, password, firstName, lastName, companyName, ownerName } = req.body;

        // Parse username to determine role
        // Format: admin.ownername.companyname (owner) or workername.companyname (worker)
        const parts = username.split('.');
        let role, company;

        if (parts.length === 3 && parts[0] === 'admin') {
            // Owner registration
            role = 'owner';
            const compName = parts[2].trim();

            // Check if company exists or create new one (case-insensitive)
            company = await Company.findOne({ name: { $regex: new RegExp(`^${compName}$`, 'i') } });
            if (!company) {
                company = await Company.create({
                    name: compName, // Store as provided, or could force lowercase
                    ownerName: parts[1]
                });
            }
        } else if (parts.length === 2) {
            // Worker registration
            role = 'worker';
            const compName = parts[1].trim();
            console.log(`Worker registration: searching for company '${compName}'`);

            // Company must exist for worker registration (case-insensitive, ignores surrounding spaces in DB)
            company = await Company.findOne({ name: { $regex: new RegExp(`^\\s*${compName}\\s*$`, 'i') } });
            console.log('Company found:', company);

            if (!company) {
                return res.status(400).json({ message: `Azienda "${compName}" non trovata. Verifica il nome o chiedi al titolare.` });
            }
        } else {
            return res.status(400).json({
                message: 'Formato username non valido. Usa: admin.nometitolare.nomeazienda oppure nomeoperaio.nomeazienda'
            });
        }

        // Check if user already exists
        const userExists = await User.findOne({ username });
        if (userExists) {
            return res.status(400).json({ message: 'Username già esistente' });
        }

        // Create user
        const user = await User.create({
            username,
            password,
            role,
            company: company._id,
            firstName: firstName || parts[role === 'owner' ? 1 : 0],
            lastName
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                username: user.username,
                role: user.role,
                company: company,
                token: generateToken(user._id)
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: `Errore nella registrazione: ${error.message}`, error: error.message });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        // Find user
        const user = await User.findOne({ username }).populate('company');

        if (!user) {
            // SECURITY LOG: User not found
            logSecurity('Login failed: user not found', {
                username,
                ip: req.ip,
                userAgent: req.get('user-agent')
            });

            return res.status(401).json({ message: 'Username o password non validi' });
        }

        // Check password
        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            // SECURITY LOG: Wrong password
            logSecurity('Login failed: wrong password', {
                userId: user._id,
                username: user.username,
                companyId: user.company?._id,
                ip: req.ip,
                userAgent: req.get('user-agent')
            });

            return res.status(401).json({ message: 'Username o password non validi' });
        }

        // Success - generate token
        const token = generateToken(user._id);

        // INFO LOG: Successful login
        logInfo('Login successful', {
            userId: user._id,
            username: user.username,
            companyId: user.company?._id,
            companyName: user.company?.name,
            role: user.role,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        res.json({
            _id: user._id,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            company: user.company,
            signature: user.signature,
            token
        });
    } catch (error) {
        logError('Login error', {
            error: error.message,
            stack: error.stack,
            ip: req.ip
        });
        res.status(500).json({ message: 'Errore nel login', error: error.message });
    }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    res.json({
        _id: req.user._id,
        username: req.user.username,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        role: req.user.role,
        company: req.user.company,
        signature: req.user.signature
    });
};

module.exports = { register, login, getMe };
