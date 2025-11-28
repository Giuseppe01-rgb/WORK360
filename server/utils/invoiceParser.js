const Tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');

/**
 * Parse invoice using Tesseract OCR
 * Extracts material data from PDF/PNG/JPG invoices
 */
const parseInvoiceWithOCR = async (fileBuffer, mimeType) => {
    try {
        let textContent = '';

        // Handle PDF files
        if (mimeType === 'application/pdf') {
            const pdfData = await pdfParse(fileBuffer);
            textContent = pdfData.text;
        }
        // Handle image files (PNG, JPG)
        else if (mimeType.startsWith('image/')) {
            const result = await Tesseract.recognize(fileBuffer, 'ita', {
                logger: info => console.log('OCR Progress:', info)
            });
            textContent = result.data.text;
        } else {
            throw new Error('Formato file non supportato');
        }

        console.log('Extracted text:', textContent);

        // Parse extracted text to find materials
        const materials = extractMaterialsFromText(textContent);

        return {
            success: true,
            materials,
            rawText: textContent
        };
    } catch (error) {
        console.error('Invoice parsing error:', error);
        return {
            success: false,
            error: error.message,
            materials: []
        };
    }
};

/**
 * Extract materials from text using pattern matching
 * Optimized for Italian invoice formats
 */
const extractMaterialsFromText = (text) => {
    const materials = [];
    const lines = text.split('\n');

    // Find supplier name (usually in first few lines)
    const supplier = findSupplierName(lines);

    // Improved regex patterns for Italian invoices
    const patterns = [
        // Table format with pipes: "Material | Quantity | Unit | Price | Total"
        /^(.+?)\s*\|?\s*(\d+[.,]?\d*)\s*\|?\s*(pz|kg|m|l|mq|mc|sacchi|litri|metri|rotoli|taniche|cartucce)\s*\|?\s*€?\s*(\d+[.,]?\d*)/i,

        // Spaced format: "Material    Quantity    Unit    Price    Total"
        /^(.+?)\s{2,}(\d+[.,]?\d*)\s{1,}(pz|kg|m|l|mq|mc|sacchi|litri|metri|rotoli|taniche|cartucce)\s{1,}€?\s*(\d+[.,]?\d*)/i,

        // Compact format: "Material Qty Unit €Price"
        /^(.+?)\s+(\d+)\s+(pz|kg|m|l|mq|mc|sacchi|litri|metri|rotoli|taniche|cartucce)\s+€?\s*(\d+[.,]?\d*)/i,

        // With description in parentheses: "Material (description) Qty Unit Price"
        /^(.+?)\s*\([^)]+\)?\s*(\d+[.,]?\d*)\s*(pz|kg|m|l|mq|mc|sacchi|litri|metri|rotoli|taniche|cartucce)\s*€?\s*(\d+[.,]?\d*)/i,

        // Multi-column with tabs: "Material\tQty\tUnit\tPrice"
        /^(.+?)\t+(\d+[.,]?\d*)\t+(pz|kg|m|l|mq|mc|sacchi|litri|metri|rotoli|taniche|cartucce)\t+€?\s*(\d+[.,]?\d*)/i,
    ];

    for (let line of lines) {
        line = line.trim();

        // Skip empty lines, headers, totals
        if (!line || line.length < 5) continue;
        if (/^(totale|subtotale|iva|sconto|total|subtotal|imponibile|imposta)/i.test(line)) continue;
        if (/^(descrizione|description|articolo|codice|code|materiale|quantità|unità|prezzo|quantity|unit|price)/i.test(line)) continue;
        if (/^(fornitore|cliente|data|fattura|n\.|numero)/i.test(line)) continue;

        // Try each pattern
        for (const pattern of patterns) {
            const match = line.match(pattern);
            if (match) {
                const [_, name, quantity, unit, price] = match;

                // Clean and validate
                const cleanName = cleanMaterialName(name);
                const cleanQuantity = parseFloat(quantity.replace(',', '.'));
                const cleanUnit = normalizeUnit(unit);
                const cleanPrice = parseFloat(price.replace(',', '.'));

                // Only add if name is reasonable (not too short/long) and quantity is valid
                if (cleanName.length > 2 && cleanName.length < 150 && cleanQuantity > 0 && !isNaN(cleanQuantity)) {
                    materials.push({
                        displayName: cleanName,
                        quantity: cleanQuantity,
                        unit: cleanUnit,
                        price: cleanPrice > 0 && !isNaN(cleanPrice) ? cleanPrice : null,
                        supplier: supplier || ''
                    });
                }
                break; // Pattern matched, move to next line
            }
        }
    }

    return materials;
};

/**
 * Clean material name - remove codes, extra whitespace, special chars
 */
const cleanMaterialName = (name) => {
    let clean = name.trim();

    // Remove leading codes like "PQE-4" or "REI 120"
    clean = clean.replace(/^[A-Z]{2,4}-?\d+\s*[-–]?\s*/i, '');
    clean = clean.replace(/^REI\s+\d+\s*[-–]?\s*/i, '');
    clean = clean.replace(/^[A-Z]\d+\s*[-–]?\s*/i, '');

    // Remove trailing codes in parentheses
    clean = clean.replace(/\s*\([^)]*cod\.[^)]*\)\s*$/i, '');

    // Remove multiple spaces
    clean = clean.replace(/\s+/g, ' ');

    // Remove trailing pipes or dashes
    clean = clean.replace(/[\|–-]+$/, '');

    return clean.trim();
};

/**
 * Find supplier name in first lines of text
 */
const findSupplierName = (lines) => {
    // Look for "Fornitore:" label
    for (const line of lines.slice(0, 10)) {
        const match = line.match(/fornitore:\s*(.+)/i);
        if (match) {
            return match[1].trim();
        }
    }

    // Usually supplier is in first 5 lines
    const topLines = lines.slice(0, 5);

    for (const line of topLines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.length < 3) continue;

        // Look for lines with company indicators
        if (/s\.r\.l\.|s\.p\.a\.|s\.n\.c\.|ltd|inc|gmbh/i.test(trimmed)) {
            // Extract just the company name (first part before address/numbers)
            const companyName = trimmed.split(/\s{2,}|via|viale|piazza|corso/i)[0].trim();
            return companyName;
        }

        // Or lines that are all caps and reasonable length
        if (trimmed === trimmed.toUpperCase() && trimmed.length > 5 && trimmed.length < 60) {
            // Skip if it looks like a title or header
            if (!/fattura|invoice|documento|document/i.test(trimmed)) {
                return trimmed;
            }
        }
    }

    return '';
};

/**
 * Normalize unit abbreviations
 */
const normalizeUnit = (unit) => {
    const unitMap = {
        'pezzi': 'pz',
        'pezzo': 'pz',
        'pc': 'pz',
        'pcs': 'pz',
        'n.': 'pz',
        'chilogrammi': 'kg',
        'chilogrammo': 'kg',
        'kilo': 'kg',
        'litri': 'l',
        'litro': 'l',
        'lt': 'l',
        'metri': 'm',
        'metro': 'm',
        'mt': 'm',
        'metri quadri': 'mq',
        'metro quadro': 'mq',
        'm2': 'mq',
        'm²': 'mq',
        'metri cubi': 'mc',
        'metro cubo': 'mc',
        'm3': 'mc',
        'm³': 'mc',
        'sacco': 'sacchi',
        'sack': 'sacchi',
        'rotolo': 'rotoli',
        'roll': 'rotoli',
        'tanica': 'taniche',
        'tank': 'taniche',
        'cartuccia': 'cartucce',
        'cartridge': 'cartucce'
    };

    const lower = unit.toLowerCase().trim();
    return unitMap[lower] || lower;
};

module.exports = {
    parseInvoiceWithOCR
};
