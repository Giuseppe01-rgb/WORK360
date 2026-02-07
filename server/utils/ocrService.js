const { createWorker } = require('tesseract.js');

/**
 * Extract text from image using Tesseract OCR
 * @param {Buffer} imageBuffer - Image buffer
 * @returns {Promise<string>} - Extracted text
 */
const extractTextFromImage = async (imageBuffer) => {
    try {
        const worker = await createWorker('ita', 1, {
            logger: m => {
                if (m.status === 'recognizing text') {
                    console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
                }
            }
        });

        const { data: { text } } = await worker.recognize(imageBuffer);
        await worker.terminate();

        // Clean and normalize text
        const cleanedText = text
            .trim()
            .replaceAll(/\s+/g, ' ')
            .replaceAll(/[^\w\s\-]/g, '');

        console.log('OCR extracted text:', cleanedText);
        return cleanedText;
    } catch (error) {
        console.error('OCR Error:', error);
        throw new Error('Errore nella lettura del testo dall\'immagine');
    }
};

/**
 * Search for product code in extracted text
 * Looks for patterns like: ABC123, XYZ-456, etc.
 * @param {string} text - Extracted text
 * @returns {string[]} - Array of potential product codes
 */
const findProductCodes = (text) => {
    // Pattern for typical product codes (letters + numbers, 4-15 chars)
    const codePattern = /\b[A-Z]{2,4}[\-\s]?\d{2,6}\b/gi;
    const matches = text.match(codePattern) || [];

    // Remove duplicates and clean
    const uniqueCodes = [...new Set(matches.map(code =>
        code.replaceAll(/[\s\-]/g, '').toUpperCase()
    ))];

    console.log('Found product codes:', uniqueCodes);
    return uniqueCodes;
};

module.exports = {
    extractTextFromImage,
    findProductCodes
};
