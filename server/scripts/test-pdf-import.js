try {
    const pdfGen = require('../utils/pdfGenerator');
    console.log('Module loaded successfully');
    console.log('Exports:', Object.keys(pdfGen));
    if (typeof pdfGen.generateQuotePDFBuffer === 'function') {
        console.log('✅ generateQuotePDFBuffer is a function');
    } else {
        console.error('❌ generateQuotePDFBuffer is NOT a function');
    }
} catch (error) {
    console.error('❌ Error loading module:', error);
}
