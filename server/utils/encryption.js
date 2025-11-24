const crypto = require('crypto');

// Encryption configuration
const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'work360-default-encryption-key-32char'; // Must be 32 characters

// Ensure key is exactly 32 bytes
const getKey = () => {
    const key = Buffer.from(ENCRYPTION_KEY);
    if (key.length !== 32) {
        // Pad or truncate to 32 bytes
        const paddedKey = Buffer.alloc(32);
        key.copy(paddedKey, 0, 0, Math.min(32, key.length));
        return paddedKey;
    }
    return key;
};

/**
 * Encrypt sensitive data
 * @param {string} text - Plain text to encrypt
 * @returns {string} Encrypted text in format iv:encrypted
 */
exports.encrypt = (text) => {
    if (!text) return null;

    try {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        // Return iv:encrypted format
        return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt data');
    }
};

/**
 * Decrypt sensitive data
 * @param {string} text - Encrypted text in format iv:encrypted
 * @returns {string} Decrypted plain text
 */
exports.decrypt = (text) => {
    if (!text) return null;

    try {
        const parts = text.split(':');
        if (parts.length !== 2) {
            throw new Error('Invalid encrypted format');
        }

        const iv = Buffer.from(parts[0], 'hex');
        const encryptedText = parts[1];

        const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt data');
    }
};
