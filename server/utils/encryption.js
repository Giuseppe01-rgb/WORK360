const crypto = require('crypto');

// Encryption configuration - Using GCM mode for authenticated encryption (AEAD)
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM recommends 12 bytes IV
const AUTH_TAG_LENGTH = 16; // 128 bits auth tag
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
 * Encrypt sensitive data using AES-256-GCM (authenticated encryption)
 * @param {string} text - Plain text to encrypt
 * @returns {string} Encrypted text in format iv:authTag:encrypted
 */
exports.encrypt = (text) => {
    if (!text) return null;

    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv, {
            authTagLength: AUTH_TAG_LENGTH
        });
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();

        // Return iv:authTag:encrypted format
        return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt data');
    }
};

/**
 * Decrypt sensitive data using AES-256-GCM (authenticated encryption)
 * @param {string} text - Encrypted text in format iv:authTag:encrypted or iv:encrypted (legacy CBC)
 * @returns {string} Decrypted plain text
 */
exports.decrypt = (text) => {
    if (!text) return null;

    try {
        const parts = text.split(':');

        // Support legacy CBC format (iv:encrypted) for backwards compatibility
        if (parts.length === 2) {
            const iv = Buffer.from(parts[0], 'hex');
            const encryptedText = parts[1];
            const decipher = crypto.createDecipheriv('aes-256-cbc', getKey(), iv);
            let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        }

        // New GCM format (iv:authTag:encrypted)
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted format');
        }

        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encryptedText = parts[2];

        const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv, {
            authTagLength: AUTH_TAG_LENGTH
        });
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt data');
    }
};
