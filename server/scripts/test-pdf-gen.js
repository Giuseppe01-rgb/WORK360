const { generateQuotePDFBuffer } = require('../utils/pdfGenerator');
const fs = require('fs');
const path = require('path');

const mockQuote = {
    number: 'TEST-001',
    date: new Date(),
    client: {
        name: 'Mario Rossi',
        address: 'Via Roma 1, Milano',
        vatNumber: 'IT12345678901'
    },
    items: [
        { description: 'Lavoro 1', quantity: 10, unitPrice: 50, total: 500 }
    ],
    subtotal: 500,
    vatRate: 22,
    vatAmount: 110,
    total: 610,
    validityDays: 30,
    paymentTerms: 'Bonifico 30gg',
    safetyCosts: 50,
    workDuration: '30 giorni',
    legalNotes: 'Nessuna'
};

const mockCompany = {
    name: 'Edilizia Srl',
    address: { street: 'Via Lavoro 10', city: 'Roma', province: 'RM', cap: '00100' },
    piva: 'IT00000000000',
    email: 'info@edilizia.it',
    phone: '0612345678',
    reaNumber: 'RM-123456',
    shareCapital: '10.000,00',
    iban: 'IT00X0000000000000000000000'
};

const mockUser = {
    signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
};

const test = async () => {
    try {
        console.log('Generating PDF...');
        const buffer = await generateQuotePDFBuffer(mockQuote, mockCompany, mockUser);
        console.log('PDF generated, size:', buffer.length);
        fs.writeFileSync('test-quote.pdf', buffer);
        console.log('✅ PDF saved to test-quote.pdf');
    } catch (error) {
        console.error('❌ Error generating PDF:', error);
    }
};

test();
