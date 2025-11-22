/**
 * WhatsApp Service
 * Supports two modes:
 * 1. wa.me link (manual, free) - generates a link that opens WhatsApp
 * 2. Twilio API (automatic, paid) - sends message programmatically
 */

/**
 * Generate WhatsApp web link (wa.me)
 * This opens WhatsApp with pre-filled message
 * User needs to manually click send
 * @param {string} phone - Phone number with country code (e.g., +393201234567)
 * @param {string} message - Message text
 * @param {string} pdfUrl - URL to PDF file (must be publicly accessible)
 */
exports.generateWhatsAppLink = (phone, message, pdfUrl) => {
    // Remove + and spaces from phone number
    const cleanPhone = phone.replace(/[\s+]/g, '');

    // Compose message with PDF link
    const fullMessage = pdfUrl
        ? `${message}\n\nScarica PDF: ${pdfUrl}`
        : message;

    // URL encode the message
    const encodedMessage = encodeURIComponent(fullMessage);

    // Generate wa.me link
    const whatsappLink = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;

    console.log('📱 WhatsApp link generated for:', cleanPhone);
    return whatsappLink;
};

/**
 * Send WhatsApp message via Twilio (requires Twilio account)
 * @param {string} to - Recipient phone with country code
 * @param {string} body - Message text
 * @param {string} mediaUrl - URL to media file (PDF, image, etc.)
 */
exports.sendWhatsAppMessage = async (to, body, mediaUrl) => {
    // Check if Twilio is configured
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
        console.warn('⚠️  Twilio not configured. Use generateWhatsAppLink instead.');
        throw new Error('Twilio credentials not configured');
    }

    const twilio = require('twilio');
    const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
    );

    try {
        // Ensure phone number has + prefix
        const formattedTo = to.startsWith('+') ? to : `+${to}`;
        const fromNumber = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886'; // Twilio Sandbox

        const messageOptions = {
            from: fromNumber,
            to: `whatsapp:${formattedTo}`,
            body
        };

        // Add media if provided
        if (mediaUrl) {
            messageOptions.mediaUrl = [mediaUrl];
        }

        const message = await client.messages.create(messageOptions);

        console.log('📱 WhatsApp message sent:', message.sid);
        return message;
    } catch (error) {
        console.error('❌ WhatsApp send error:', error);
        throw error;
    }
};

/**
 * Format phone number for WhatsApp
 * @param {string} phone - Phone number (various formats accepted)
 * @returns {string} - Formatted phone with country code
 */
exports.formatPhoneNumber = (phone) => {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');

    // If number doesn't start with country code, assume Italy (+39)
    if (!cleaned.startsWith('39') && cleaned.length === 10) {
        cleaned = '39' + cleaned;
    }

    return '+' + cleaned;
};
