const xlsx = require('xlsx');

/**
 * Parse Excel/CSV file and extract material data
 */
const parseExcelFile = (buffer) => {
    try {
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Convert to array of arrays to find header row
        const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: false });

        // Find header row index
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
            const rowStr = JSON.stringify(rawRows[i]).toLowerCase();
            if (rowStr.includes('codice') || rowStr.includes('prezzo') || rowStr.includes('prodotto')) {
                headerRowIndex = i;
                break;
            }
        }

        console.log('Header Row Index:', headerRowIndex);
        console.log('Headers found:', rawRows[headerRowIndex]);

        // Re-parse with correct header row
        const data = xlsx.utils.sheet_to_json(sheet, {
            range: headerRowIndex,
            raw: false
        });

        console.log('Total rows parsed:', data.length);
        if (data.length > 0) {
            console.log('First row sample:', data[0]);
        }

        return data;
    } catch (error) {
        console.error('Excel Parse Error:', error);
        throw new Error('Errore nel parsing del file Excel');
    }
};

/**
 * Helper to find column value with flexible matching
 */
const findValue = (row, possibleNames) => {
    // Try exact match first
    for (const name of possibleNames) {
        if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
            return String(row[name]).trim();
        }
    }

    // Try case-insensitive match
    const rowKeys = Object.keys(row);
    for (const name of possibleNames) {
        const foundKey = rowKeys.find(k => k.trim().toLowerCase() === name.toLowerCase());
        if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null && row[foundKey] !== '') {
            return String(row[foundKey]).trim();
        }
    }

    return '';
};

/**
 * Parse price value
 */
const parsePrice = (priceRaw) => {
    if (!priceRaw || priceRaw === '') return null;

    let str = String(priceRaw).trim();

    // Remove currency symbols and spaces
    str = str.replace(/[€$£\s]/g, '');

    // Handle Italian format (comma as decimal)
    if (str.includes('.') && str.includes(',')) {
        if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
            // IT format: 1.234,56
            str = str.replace(/\./g, '').replace(',', '.');
        } else {
            // US format: 1,234.56
            str = str.replace(/,/g, '');
        }
    } else if (str.includes(',')) {
        // Only comma: decimal separator
        str = str.replace(',', '.');
    }

    const val = Number.parseFloat(str);
    return Number.isNaN(val) ? null : val;
};

/**
 * Map Excel row to material format
 */
const mapRowToMaterial = (row) => {
    console.log('\n=== MAPPING ROW ===');
    console.log('Available columns:', Object.keys(row));

    const quantita = findValue(row, ['Quantità', 'Quantita', 'QuantitÃ ', 'QuantitÃ', 'Q.tà', 'Qta']);
    console.log('Quantita found:', quantita);

    return {
        codice_prodotto: findValue(row, ['Codice', 'Codice prodotto', 'Codice Prodotto', 'Code']).toUpperCase(),
        marca: findValue(row, ['Marca', 'Brand']),
        nome_prodotto: findValue(row, ['Prodotto', 'Nome Prodotto', 'Nome prodotto', 'Nome', 'Descrizione']),
        quantita: quantita,
        prezzo: parsePrice(findValue(row, ['Prezzo', 'Prezzo Unitario', 'Costo', 'Listino'])),
        fornitore: findValue(row, ['Fornitore', 'Supplier']),
        categoria: findValue(row, ['Categoria', 'Category']) || 'Altro',
        attivo: true
    };
};

/**
 * Validate material data
 */
const validateMaterial = (material, rowIndex) => {
    const errors = [];

    if (!material.nome_prodotto) {
        errors.push(`Riga ${rowIndex + 2}: Nome prodotto mancante`);
    }
    if (!material.marca) {
        errors.push(`Riga ${rowIndex + 2}: Marca mancante`);
    }

    return errors;
};

module.exports = {
    parseExcelFile,
    mapRowToMaterial,
    validateMaterial
};
