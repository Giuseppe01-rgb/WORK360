/**
 * Centralized Input Validation Middleware for WORK360
 * Level 3 Security - Input validation and sanitization
 */

const { body, param, validationResult } = require('express-validator');
const { logError } = require('../utils/logger');

// =============================================================================
// GENERIC VALIDATION HANDLER
// =============================================================================

/**
 * Middleware to check validation results and return 400 with Italian error messages
 * Logs validation errors for debugging purposes
 */
const handleValidation = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Log validation errors for debugging
        if (typeof logError === 'function') {
            logError('Validation error', {
                errors: errors.array(),
                path: req.originalUrl,
                method: req.method,
                ip: req.ip,
                userId: req.user ? req.user.id : null,
            });
        }

        return res.status(400).json({
            message: 'Alcuni dati inseriti non sono validi.',
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg,
            })),
        });
    }
    next();
};

// =============================================================================
// AUTH VALIDATORS
// =============================================================================

/**
 * Validator for user registration
 * Fields: username, password, firstName, lastName
 */
const validateRegister = [
    body('username')
        .notEmpty().withMessage('Lo username è obbligatorio.')
        .isLength({ max: 100 }).withMessage('Lo username è troppo lungo.')
        .trim(),
    body('password')
        .notEmpty().withMessage('La password è obbligatoria.')
        .isLength({ min: 8, max: 100 }).withMessage('La password deve avere almeno 8 caratteri.'),
    body('firstName')
        .optional()
        .isLength({ max: 100 }).withMessage('Il nome è troppo lungo.')
        .trim(),
    body('lastName')
        .optional()
        .isLength({ max: 100 }).withMessage('Il cognome è troppo lungo.')
        .trim(),
    handleValidation,
];

/**
 * Validator for user login
 * Fields: username, password
 */
const validateLogin = [
    body('username')
        .notEmpty().withMessage('Lo username è obbligatorio.')
        .isLength({ max: 100 }).withMessage('Lo username è troppo lungo.')
        .trim(),
    body('password')
        .notEmpty().withMessage('La password è obbligatoria.')
        .isLength({ max: 100 }).withMessage('La password è troppo lunga.'),
    handleValidation,
];

// =============================================================================
// CONSTRUCTION SITE VALIDATORS
// =============================================================================

/**
 * Validator for creating a construction site
 * Fields: name, address, startDate, endDate, contractValue
 */
const validateCreateSite = [
    body('name')
        .notEmpty().withMessage('Il nome del cantiere è obbligatorio.')
        .isLength({ max: 150 }).withMessage('Il nome del cantiere è troppo lungo.')
        .trim(),
    body('address')
        .optional()
        .isLength({ max: 200 }).withMessage("L'indirizzo è troppo lungo.")
        .trim(),
    body('startDate')
        .optional({ checkFalsy: true })
        .isISO8601().withMessage('La data di inizio non è valida.')
        .toDate(),
    body('endDate')
        .optional({ checkFalsy: true })
        .isISO8601().withMessage('La data di fine non è valida.')
        .toDate(),
    body('contractValue')
        .optional()
        .isFloat({ min: 0 }).withMessage('Il valore del contratto deve essere un numero positivo.'),
    handleValidation,
];

/**
 * Validator for updating a construction site
 * Same as create but all fields are optional
 */
const validateUpdateSite = [
    body('name')
        .optional()
        .isLength({ max: 150 }).withMessage('Il nome del cantiere è troppo lungo.')
        .trim(),
    body('address')
        .optional()
        .isLength({ max: 200 }).withMessage("L'indirizzo è troppo lungo.")
        .trim(),
    body('startDate')
        .optional({ checkFalsy: true })
        .isISO8601().withMessage('La data di inizio non è valida.')
        .toDate(),
    body('endDate')
        .optional({ checkFalsy: true })
        .isISO8601().withMessage('La data di fine non è valida.')
        .toDate(),
    body('contractValue')
        .optional()
        .isFloat({ min: 0 }).withMessage('Il valore del contratto deve essere un numero positivo.'),
    handleValidation,
];

// =============================================================================
// MATERIAL USAGE VALIDATORS
// =============================================================================

/**
 * Validator for recording material usage (catalogato flow)
 * Fields: siteId, materialId, numeroConfezioni, note
 */
const validateMaterialUsage = [
    body('siteId')
        .notEmpty().withMessage('Il cantiere è obbligatorio.')
        .isLength({ max: 50 }).withMessage('ID cantiere non valido.'),
    body('materialId')
        .notEmpty().withMessage('Il materiale è obbligatorio.')
        .isLength({ max: 50 }).withMessage('ID materiale non valido.'),
    body('numeroConfezioni')
        .notEmpty().withMessage('La quantità è obbligatoria.')
        .isInt({ gt: 0 }).withMessage('La quantità deve essere un numero intero maggiore di zero.'),
    body('note')
        .optional()
        .isLength({ max: 500 }).withMessage('La nota è troppo lunga.')
        .trim(),
    handleValidation,
];

// =============================================================================
// REPORTED MATERIAL VALIDATORS
// =============================================================================

/**
 * Validator for reporting a new material (segnalazione flow)
 * Fields: siteId, fotoUrl, nomeDigitato, categoriaDigitata, numeroConfezioni
 */
const validateReportMaterial = [
    body('siteId')
        .notEmpty().withMessage('Il cantiere è obbligatorio.')
        .isLength({ max: 50 }).withMessage('ID cantiere non valido.'),
    body('fotoUrl')
        .notEmpty().withMessage('La foto è obbligatoria.')
        // Allow both URLs (Cloudinary) and local paths (./uploads/...)
        .isLength({ max: 500 }).withMessage("L'URL della foto è troppo lungo."),
    body('nomeDigitato')
        .notEmpty().withMessage('Il nome del materiale è obbligatorio.')
        .isLength({ max: 150 }).withMessage('Il nome del materiale è troppo lungo.')
        .trim(),
    body('categoriaDigitata')
        .optional()
        .isLength({ max: 100 }).withMessage('La categoria è troppo lunga.')
        .trim(),
    body('codiceLetto')
        .optional()
        .isLength({ max: 100 }).withMessage('Il codice è troppo lungo.')
        .trim(),
    body('numeroConfezioni')
        .notEmpty().withMessage('La quantità è obbligatoria.')
        .isInt({ gt: 0 }).withMessage('La quantità deve essere un numero intero maggiore di zero.'),
    handleValidation,
];

// =============================================================================
// ECONOMIA VALIDATORS
// =============================================================================

/**
 * Validator for creating economia (overtime record)
 * Fields: site, hours, description
 */
const validateEconomiaCreate = [
    body('site')
        .notEmpty().withMessage('Il cantiere è obbligatorio.')
        .isLength({ max: 50 }).withMessage('ID cantiere non valido.'),
    body('hours')
        .notEmpty().withMessage('Le ore sono obbligatorie.')
        .isFloat({ gt: 0, max: 24 }).withMessage('Le ore devono essere un numero tra 0 e 24.'),
    body('description')
        .notEmpty().withMessage('La descrizione è obbligatoria.')
        .isLength({ min: 10, max: 500 }).withMessage('La descrizione deve avere tra 10 e 500 caratteri.')
        .trim(),
    handleValidation,
];

// =============================================================================
// NOTE VALIDATORS
// =============================================================================

/**
 * Validator for creating notes
 * Fields: siteId, content, type
 */
const validateNote = [
    body('siteId')
        .notEmpty().withMessage('Il cantiere è obbligatorio.')
        .isLength({ max: 50 }).withMessage('ID cantiere non valido.'),
    body('content')
        .notEmpty().withMessage('Il contenuto della nota è obbligatorio.')
        .isLength({ max: 2000 }).withMessage('La nota è troppo lunga (max 2000 caratteri).')
        .trim(),
    body('type')
        .optional()
        .isIn(['note', 'warning', 'info']).withMessage('Tipo di nota non valido.'),
    handleValidation,
];

// =============================================================================
// WORK ACTIVITY VALIDATORS
// =============================================================================

/**
 * Validator for creating work activities
 * Fields: siteId, activityType, quantity, unit, notes, date
 */
const validateWorkActivity = [
    body('siteId')
        .notEmpty().withMessage('Il cantiere è obbligatorio.')
        .isLength({ max: 50 }).withMessage('ID cantiere non valido.'),
    body('activityType')
        .notEmpty().withMessage("Il tipo di attività è obbligatorio.")
        .isLength({ max: 1000 }).withMessage("Il tipo di attività è troppo lungo (max 1000 caratteri).")
        .trim(),
    body('quantity')
        .optional()
        .isFloat({ min: 0 }).withMessage('La quantità deve essere un numero positivo.'),
    body('unit')
        .optional()
        .isLength({ max: 20 }).withMessage("L'unità di misura è troppo lunga.")
        .trim(),
    body('notes')
        .optional()
        .isLength({ max: 500 }).withMessage('Le note sono troppo lunghe.')
        .trim(),
    body('date')
        .optional()
        .isISO8601().withMessage('La data non è valida.')
        .toDate(),
    handleValidation,
];

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
    handleValidation,
    // Auth
    validateRegister,
    validateLogin,
    // Sites
    validateCreateSite,
    validateUpdateSite,
    // Materials
    validateMaterialUsage,
    validateReportMaterial,
    // Economia
    validateEconomiaCreate,
    // Notes
    validateNote,
    // Work Activities
    validateWorkActivity,
};
