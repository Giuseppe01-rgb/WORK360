const xlsx = require('xlsx');

/**
 * Parse Excel/CSV file and extract attendance data
 */
const parseAttendanceExcel = (buffer) => {
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
            if (rowStr.includes('data') || rowStr.includes('date') ||
                rowStr.includes('dipendente') || rowStr.includes('ore')) {
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
 * Parse date value from various formats
 */
const parseDate = (dateRaw) => {
    if (!dateRaw || dateRaw === '') return null;

    let str = String(dateRaw).trim();

    // Try parsing DD/MM/YYYY format
    const ddmmyyyy = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (ddmmyyyy) {
        const [, day, month, year] = ddmmyyyy;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // Try parsing YYYY-MM-DD format
    const yyyymmdd = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
    if (yyyymmdd) {
        const [, year, month, day] = yyyymmdd;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // Try parsing Excel serial date number
    const serialDate = Number.parseFloat(str);
    if (!Number.isNaN(serialDate) && serialDate > 40000 && serialDate < 60000) {
        // Excel serial date (days since 1900-01-01)
        const excelEpoch = new Date(1899, 11, 30); // Excel epoch
        const date = new Date(excelEpoch.getTime() + serialDate * 86400000);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    return null;
};

/**
 * Parse hours value
 */
const parseHours = (hoursRaw) => {
    if (!hoursRaw || hoursRaw === '') return null;

    let str = String(hoursRaw).trim();

    // Remove any text like "h", "ore", etc.
    str = str.replace(/[hHoO][a-zA-Z]*/g, '').trim();

    // Handle Italian decimal format (comma as decimal)
    str = str.replace(',', '.');

    const val = Number.parseFloat(str);
    return Number.isNaN(val) ? null : val;
};

/**
 * Calculate clock out time based on hours worked
 * Default start time is 07:00
 * Assumes lunch break is included for 8-hour shifts
 */
const calculateClockTimes = (hours) => {
    const clockIn = '07:00';

    // Simply add hours to 7:00 (lunch break is included in the 8 hours)
    const startMinutes = 7 * 60; // 7:00 AM = 420 minutes
    const totalMinutes = startMinutes + (hours * 60);

    const endHours = Math.floor(totalMinutes / 60);
    const endMins = Math.round(totalMinutes % 60);

    const clockOut = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;

    return { clockIn, clockOut };
};

/**
 * Map Excel row to attendance format
 */
const mapRowToAttendance = (row) => {
    const dateRaw = findValue(row, ['Data', 'data', 'DATE', 'Date', 'Giorno']);
    const employeeRaw = findValue(row, ['Dipendente', 'dipendente', 'Nome', 'nome', 'Employee', 'Operaio', 'operaio', 'Lavoratore']);
    const hoursRaw = findValue(row, ['Ore', 'ore', 'Hours', 'hours', 'Orario', 'H', 'h']);
    const siteRaw = findValue(row, ['Cantiere', 'cantiere', 'Site', 'site', 'Sito', 'sito', 'Luogo', 'luogo']);

    const date = parseDate(dateRaw);
    const hours = parseHours(hoursRaw);
    const { clockIn, clockOut } = hours ? calculateClockTimes(hours) : { clockIn: null, clockOut: null };

    return {
        date,
        employeeName: employeeRaw,
        siteName: siteRaw,
        hours,
        clockIn,
        clockOut,
        rawData: { dateRaw, employeeRaw, hoursRaw, siteRaw }
    };
};

/**
 * Validate attendance data
 */
const validateAttendance = (attendance, rowIndex) => {
    const errors = [];

    if (!attendance.date) {
        errors.push(`Riga ${rowIndex + 2}: Data non valida o mancante`);
    }
    if (!attendance.employeeName) {
        errors.push(`Riga ${rowIndex + 2}: Nome dipendente mancante`);
    }
    if (attendance.hours === null || attendance.hours <= 0) {
        errors.push(`Riga ${rowIndex + 2}: Ore non valide o mancanti`);
    }
    if (attendance.hours && attendance.hours > 24) {
        errors.push(`Riga ${rowIndex + 2}: Ore superiori a 24`);
    }

    return errors;
};

/**
 * Find employee by name (fuzzy matching)
 */
const findEmployee = (employeeName, users) => {
    const searchName = employeeName.toLowerCase().trim();

    // Try exact match first (firstName + lastName)
    let match = users.find(u => {
        const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase().trim();
        return fullName === searchName;
    });
    if (match) return match;

    // Try reversed order (lastName + firstName)
    match = users.find(u => {
        const fullNameReversed = `${u.lastName || ''} ${u.firstName || ''}`.toLowerCase().trim();
        return fullNameReversed === searchName;
    });
    if (match) return match;

    // Try partial match on firstName
    match = users.find(u => {
        const firstName = (u.firstName || '').toLowerCase();
        return firstName === searchName || searchName.includes(firstName);
    });
    if (match) return match;

    // Try partial match on lastName
    match = users.find(u => {
        const lastName = (u.lastName || '').toLowerCase();
        return lastName === searchName || searchName.includes(lastName);
    });
    if (match) return match;

    // Try username
    match = users.find(u => {
        const username = (u.username || '').toLowerCase();
        return username === searchName;
    });
    if (match) return match;

    return null;
};

/**
 * Find site by name (fuzzy matching)
 */
const findSite = (siteName, sites) => {
    if (!siteName) return null;

    const searchName = siteName.toLowerCase().trim();

    // Try exact match first
    let match = sites.find(s => {
        return (s.name || '').toLowerCase().trim() === searchName;
    });
    if (match) return match;

    // Try partial match (site name contains search or vice versa)
    match = sites.find(s => {
        const name = (s.name || '').toLowerCase();
        return name.includes(searchName) || searchName.includes(name);
    });
    if (match) return match;

    return null;
};

module.exports = {
    parseAttendanceExcel,
    mapRowToAttendance,
    validateAttendance,
    findEmployee,
    findSite,
    calculateClockTimes,
    parseDate,
    parseHours
};
