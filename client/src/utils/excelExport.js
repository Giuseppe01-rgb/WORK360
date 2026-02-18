/**
 * Excel Export Utility
 * Uses SheetJS (xlsx) to generate Excel files client-side
 */
import * as XLSX from 'xlsx';

/**
 * Format currency for Italian locale
 */
const formatCurrency = (value) => {
    if (value === null || value === undefined) return '€0.00';
    return `€${Number(value).toFixed(2)}`;
};

/**
 * Format date for Italian locale
 */
const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('it-IT');
};

/**
 * Download workbook as Excel file
 */
const downloadWorkbook = (workbook, fileName) => {
    const sanitizedName = fileName.replaceAll(/[^a-zA-Z0-9_-]/g, '_');
    XLSX.writeFile(workbook, `${sanitizedName}.xlsx`);
};

/**
 * Export Site Report to Excel
 * Includes: summary, employee hours, materials, economie
 */
export function exportSiteReport(site, report, employeeHours = [], economie = []) {
    const workbook = XLSX.utils.book_new();

    // === Sheet 1: Riepilogo ===
    const summaryData = [
        ['REPORT CANTIERE'],
        [''],
        ['Cantiere', site.name || ''],
        ['Indirizzo', site.address || ''],
        ['Stato', site.status || ''],
        ['Data inizio', formatDate(site.startDate)],
        ['Data fine', formatDate(site.endDate)],
        ['Valore contratto', formatCurrency(site.contractValue)],
        [''],
        ['COSTI'],
        ['Costo Manodopera', formatCurrency(report?.laborCost || 0)],
        ['Costo Materiali', formatCurrency(report?.materialCost || 0)],
        ['Totale Costi', formatCurrency((report?.laborCost || 0) + (report?.materialCost || 0))],
        [''],
        ['STATISTICHE'],
        ['Ore Totali', `${report?.totalHours?.toFixed(1) || 0}h`],
        ['Presenze Totali', report?.totalAttendances || 0],
        ['Dipendenti Unici', report?.uniqueWorkers || 0],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    summarySheet['!cols'] = [{ wch: 20 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Riepilogo');

    // === Sheet 2: Dipendenti ===
    if (employeeHours && employeeHours.length > 0) {
        const employeeData = [
            ['DIPENDENTE', 'ORE LAVORATE', 'COSTO ORARIO', 'COSTO TOTALE'],
            ...employeeHours.map(emp => [
                emp.employeeName || 'N/A',
                `${Number(emp.totalHours || 0).toFixed(1)}h`,
                formatCurrency(emp.hourlyRate || 0),
                formatCurrency((emp.totalHours || 0) * (emp.hourlyRate || 0))
            ])
        ];

        const employeeSheet = XLSX.utils.aoa_to_sheet(employeeData);
        employeeSheet['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(workbook, employeeSheet, 'Dipendenti');
    }

    // === Sheet 3: Materiali ===
    if (report?.materials && report.materials.length > 0) {
        const materialData = [
            ['MATERIALE', 'QUANTITÀ', 'UNITÀ', 'PREZZO UNITARIO', 'TOTALE'],
            ...report.materials.map(mat => [
                mat.materialName || mat.name || 'N/A',
                mat.quantity || 0,
                mat.unit || 'pz',
                formatCurrency(mat.unitPrice || 0),
                formatCurrency((mat.quantity || 0) * (mat.unitPrice || 0))
            ])
        ];

        const materialSheet = XLSX.utils.aoa_to_sheet(materialData);
        materialSheet['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(workbook, materialSheet, 'Materiali');
    }

    // === Sheet 4: Economie ===
    if (economie && economie.length > 0) {
        const economieData = [
            ['DATA', 'TIPO', 'DESCRIZIONE', 'IMPORTO'],
            ...economie.map(eco => [
                formatDate(eco.date || eco.createdAt),
                eco.type || 'Altro',
                eco.description || '',
                formatCurrency(eco.amount || 0)
            ])
        ];

        const economieSheet = XLSX.utils.aoa_to_sheet(economieData);
        economieSheet['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 35 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(workbook, economieSheet, 'Economie');
    }

    // Download
    downloadWorkbook(workbook, `Report_${site.name}_${new Date().toISOString().split('T')[0]}`);
}

/**
 * Export Analytics Dashboard to Excel
 * Includes: company summary, per-site breakdown
 */
export function exportAnalyticsReport(analytics, siteStats = []) {
    const workbook = XLSX.utils.book_new();
    const today = new Date().toLocaleDateString('it-IT');

    // === Sheet 1: Riepilogo Generale ===
    const summaryData = [
        ['REPORT ECONOMICO WORK360'],
        [`Generato il ${today}`],
        [''],
        ['COSTI TOTALI'],
        ['Manodopera', formatCurrency(analytics?.companyCosts?.labor || 0)],
        ['Materiali', formatCurrency(analytics?.companyCosts?.materials || 0)],
        ['TOTALE', formatCurrency(analytics?.companyCosts?.total || 0)],
        [''],
        ['STATISTICHE GENERALI'],
        ['Cantieri Attivi', analytics?.activeSites || 0],
        ['Dipendenti Totali', analytics?.totalWorkers || 0],
        ['Ore Lavorate Totale', `${analytics?.totalHours?.toFixed(1) || 0}h`],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    summarySheet['!cols'] = [{ wch: 25 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Riepilogo');

    // === Sheet 2: Per Cantiere ===
    if (siteStats && siteStats.length > 0) {
        const siteData = [
            ['CANTIERE', 'STATO', 'ORE LAVORATE', 'DIPENDENTI', 'VALORE CONTRATTO'],
            ...siteStats.map(stat => [
                stat.site?.name || 'N/A',
                stat.site?.status || 'N/A',
                `${Number(stat.totalHours || 0).toFixed(1)}h`,
                stat.uniqueWorkers || 0,
                formatCurrency(stat.site?.contractValue || 0)
            ])
        ];

        const siteSheet = XLSX.utils.aoa_to_sheet(siteData);
        siteSheet['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 18 }];
        XLSX.utils.book_append_sheet(workbook, siteSheet, 'Per Cantiere');
    }

    // Download
    downloadWorkbook(workbook, `WORK360_Report_Economico_${new Date().toISOString().split('T')[0]}`);
}

/**
 * Export Attendance List to Excel
 * Includes: all attendances with details
 */
export function exportAttendanceReport(attendances = [], filters = {}) {
    const workbook = XLSX.utils.book_new();
    const today = new Date().toLocaleDateString('it-IT');

    // Helper to calculate hours worked
    const calculateHours = (clockIn, clockOut) => {
        if (!clockIn?.time || !clockOut?.time) return '-';
        const start = new Date(clockIn.time);
        const end = new Date(clockOut.time);
        const diffMs = end - start;
        const diffHrs = diffMs / 3600000;
        return `${diffHrs.toFixed(1)}h`;
    };

    // === Sheet 1: Presenze ===
    const attendanceData = [
        ['REGISTRO PRESENZE'],
        [`Generato il ${today}`],
        filters.siteName ? [`Cantiere: ${filters.siteName}`] : [],
        filters.dateRange ? [`Periodo: ${filters.dateRange}`] : [],
        [''],
        ['DATA', 'DIPENDENTE', 'CANTIERE', 'ENTRATA', 'USCITA', 'ORE', 'STATUS'],
        ...attendances.map(att => {
            const clockInTime = att.clockIn?.time;
            const clockOutTime = att.clockOut?.time;
            const userName = att.user?.name || att.userName || 'N/A';
            const siteName = att.site?.name || att.siteName || 'N/A';

            return [
                clockInTime ? new Date(clockInTime).toLocaleDateString('it-IT') : '-',
                userName,
                siteName,
                clockInTime ? new Date(clockInTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '-',
                clockOutTime ? new Date(clockOutTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : 'In corso',
                calculateHours(att.clockIn, att.clockOut),
                clockOutTime ? 'Completato' : 'In corso'
            ];
        })
    ];


    const attendanceSheet = XLSX.utils.aoa_to_sheet(attendanceData);
    attendanceSheet['!cols'] = [
        { wch: 12 }, { wch: 20 }, { wch: 20 },
        { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 12 }
    ];
    XLSX.utils.book_append_sheet(workbook, attendanceSheet, 'Presenze');

    // Download
    const fileName = filters.siteName
        ? `Presenze_${filters.siteName}_${new Date().toISOString().split('T')[0]}`
        : `Presenze_${new Date().toISOString().split('T')[0]}`;
    downloadWorkbook(workbook, fileName);
}

// ================================================================
// FOGLIO PRESENZE — Structured monthly attendance sheet
// ================================================================

/**
 * Calculate Easter Sunday for a given year (Anonymous Gregorian algorithm)
 */
function getEasterDate(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
}

/**
 * Get all Italian national holidays for a given year
 * Returns a Set of date strings in 'YYYY-MM-DD' format
 */
function getItalianHolidays(year) {
    const holidays = new Set();

    // Fixed holidays
    const fixed = [
        [0, 1],   // 1 Gennaio - Capodanno
        [0, 6],   // 6 Gennaio - Epifania
        [3, 25],  // 25 Aprile - Liberazione
        [4, 1],   // 1 Maggio - Festa del Lavoro
        [5, 2],   // 2 Giugno - Festa della Repubblica
        [7, 15],  // 15 Agosto - Ferragosto
        [10, 1],  // 1 Novembre - Tutti i Santi
        [11, 8],  // 8 Dicembre - Immacolata
        [11, 25], // 25 Dicembre - Natale
        [11, 26], // 26 Dicembre - Santo Stefano
    ];

    for (const [month, day] of fixed) {
        const d = new Date(year, month, day);
        holidays.add(d.toISOString().split('T')[0]);
    }

    // Easter Sunday & Easter Monday
    const easter = getEasterDate(year);
    holidays.add(easter.toISOString().split('T')[0]);
    const easterMonday = new Date(easter);
    easterMonday.setDate(easterMonday.getDate() + 1);
    holidays.add(easterMonday.toISOString().split('T')[0]);

    return holidays;
}

/**
 * Round work hours according to business rules:
 * ≤ 10h → 8h (standard full day)
 * > 10h → overtime kicks in
 * For short shifts (< 6h30m), keep proportional rounding
 */
function roundWorkHours(rawDecimalHours) {
    if (rawDecimalHours <= 0) return 0;
    // Any shift ≥ 6h30m and ≤ 10h → full day = 8h
    if (rawDecimalHours >= 6.5) return 8;
    // Short shifts: round to nearest hour
    if (rawDecimalHours >= 5.5) return 6;
    if (rawDecimalHours >= 4.5) return 5;
    if (rawDecimalHours >= 3.5) return 4;
    if (rawDecimalHours >= 2.5) return 3;
    if (rawDecimalHours >= 1.5) return 2;
    if (rawDecimalHours >= 0.5) return 1;
    return 0;
}

/**
 * Italian month names
 */
const MONTH_NAMES_IT = [
    'GENNAIO', 'FEBBRAIO', 'MARZO', 'APRILE', 'MAGGIO', 'GIUGNO',
    'LUGLIO', 'AGOSTO', 'SETTEMBRE', 'OTTOBRE', 'NOVEMBRE', 'DICEMBRE'
];

/**
 * Export structured "Foglio Presenze" monthly attendance sheet
 *
 * @param {Array} attendances - All attendance records for the month
 * @param {Array} absences - Approved absence requests overlapping the month
 * @param {Array} users - All employees (with id, firstName, lastName)
 * @param {string} companyName - Company name for header
 * @param {number} month - Month (1-12)
 * @param {number} year - Year (e.g. 2026)
 */
export function exportFoglioPresenze(attendances = [], absences = [], users = [], companyName = '', month, year) {
    const workbook = XLSX.utils.book_new();

    const daysInMonth = new Date(year, month, 0).getDate();
    const holidays = getItalianHolidays(year);
    const monthName = MONTH_NAMES_IT[month - 1];

    // --- Build per-employee, per-day data ---

    // Map: employeeId -> { name, days: { dayNum -> { rawHours, absenceType, absenceHours } } }
    const employeeMap = new Map();

    // Initialize all employees
    for (const user of users) {
        const fullName = `${(user.lastName || '').toUpperCase()} ${(user.firstName || '').toUpperCase()}`.trim();
        if (!fullName) continue;
        employeeMap.set(user.id, {
            name: fullName,
            days: {}
        });
    }

    // 1. Aggregate attendance hours per employee per day (sum across sites)
    for (const att of attendances) {
        if (!att.clockIn?.time || !att.clockOut?.time) continue;

        const userId = att.user?.id || att.userId;
        if (!userId) continue;

        const start = new Date(att.clockIn.time);
        const end = new Date(att.clockOut.time);
        const rawHours = (end - start) / 3600000;
        if (rawHours <= 0) continue;

        const dayNum = start.getDate();
        const attMonth = start.getMonth() + 1;
        const attYear = start.getFullYear();

        // Only include attendance for the target month
        if (attMonth !== month || attYear !== year) continue;

        // Ensure employee exists in map (could be a new user not in the users list)
        if (!employeeMap.has(userId)) {
            const userName = att.user
                ? `${(att.user.lastName || '').toUpperCase()} ${(att.user.firstName || att.user.username || '').toUpperCase()}`.trim()
                : 'N/A';
            employeeMap.set(userId, { name: userName, days: {} });
        }

        const emp = employeeMap.get(userId);
        if (!emp.days[dayNum]) {
            emp.days[dayNum] = { rawHours: 0, absenceType: null, absenceHours: 0 };
        }
        emp.days[dayNum].rawHours += rawHours;

        // Safety cap: max 16h per day (prevent impossible sums from duplicate records)
        if (emp.days[dayNum].rawHours > 16) {
            emp.days[dayNum].rawHours = 16;
        }
    }

    // 2. Apply approved absences (FER, PNR, ROL)
    for (const abs of absences) {
        if (abs.status !== 'APPROVED') continue;

        const employeeId = abs.employeeId || abs.employee?.id;
        if (!employeeId || !employeeMap.has(employeeId)) continue;

        // Determine absence type code
        let absType = 'PNR'; // default for PERMESSO
        if (abs.type === 'FERIE') {
            absType = 'FER';
        } else if (abs.type === 'PERMESSO') {
            if (abs.category === 'LEGGE_104') {
                absType = 'ROL';
            } else {
                absType = 'PNR';
            }
        }

        // Determine affected days within our month
        const absStart = new Date(abs.startDate + 'T00:00:00');
        const absEnd = abs.endDate ? new Date(abs.endDate + 'T00:00:00') : absStart;
        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month - 1, daysInMonth);

        const rangeStart = absStart < monthStart ? monthStart : absStart;
        const rangeEnd = absEnd > monthEnd ? monthEnd : absEnd;

        for (let d = new Date(rangeStart); d <= rangeEnd; d.setDate(d.getDate() + 1)) {
            const dayNum = d.getDate();
            const dayOfWeek = d.getDay(); // 0=Sun, 6=Sat

            // Skip weekends for absence marking
            if (dayOfWeek === 0 || dayOfWeek === 6) continue;

            const emp = employeeMap.get(employeeId);
            if (!emp.days[dayNum]) {
                emp.days[dayNum] = { rawHours: 0, absenceType: null, absenceHours: 0 };
            }

            // Calculate absence hours
            let absHours = 8; // full day default
            if (abs.mode === 'HOURS' && abs.durationMinutes) {
                absHours = Math.round(abs.durationMinutes / 60);
            } else if (abs.dayPart === 'AM' || abs.dayPart === 'PM') {
                absHours = 4; // half day
            }

            emp.days[dayNum].absenceType = absType;
            emp.days[dayNum].absenceHours = absHours;
        }
    }

    // 3. Detect FES (holidays) and MAL (by exclusion) for each employee
    for (const [, emp] of employeeMap) {
        for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
            const dateObj = new Date(year, month - 1, dayNum);
            const dateStr = dateObj.toISOString().split('T')[0];
            const dayOfWeek = dateObj.getDay(); // 0=Sun, 6=Sat
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const isHoliday = holidays.has(dateStr);

            const dayData = emp.days[dayNum];
            const hasAttendance = dayData && dayData.rawHours > 0;
            const hasAbsence = dayData && dayData.absenceType;

            if (!hasAttendance && !hasAbsence) {
                if (isHoliday && !isWeekend) {
                    // Holiday on a weekday with no attendance → FES
                    if (!emp.days[dayNum]) {
                        emp.days[dayNum] = { rawHours: 0, absenceType: null, absenceHours: 0 };
                    }
                    emp.days[dayNum].absenceType = 'FES';
                    emp.days[dayNum].absenceHours = 8;
                } else if (!isWeekend && !isHoliday) {
                    // Weekday, not holiday, no attendance, no leave → MAL
                    // Only mark if the date is in the past (or today)
                    const today = new Date();
                    today.setHours(23, 59, 59, 999);
                    if (dateObj <= today) {
                        if (!emp.days[dayNum]) {
                            emp.days[dayNum] = { rawHours: 0, absenceType: null, absenceHours: 0 };
                        }
                        emp.days[dayNum].absenceType = 'MAL';
                        emp.days[dayNum].absenceHours = 8;
                    }
                }
                // Weekend with no attendance → leave empty (rest day)
            } else if (hasAttendance && !hasAbsence && isHoliday) {
                // Worked on a holiday — hours count normally, no FES
            }
        }
    }

    // --- Build the Excel sheet ---
    const data = [];

    // Header rows
    data.push(['IMPRESA', companyName || '', '', '', 'CASSA EDILE', '']);
    data.push([]); // empty row

    // Title row
    const titleRow = ['', '', `FOGLIO PRESENZE ${monthName} ${year}`];
    data.push(titleRow);
    data.push([]); // empty row

    // Column headers
    const headerRow1 = ['DIPENDENTE', ''];
    for (let d = 1; d <= daysInMonth; d++) {
        headerRow1.push(d);
    }
    headerRow1.push('TOT. ORD.');
    headerRow1.push('TOT. STRA.');
    headerRow1.push('TOT. ASS.');
    data.push(headerRow1);

    // Sort employees alphabetically
    const sortedEmployees = [...employeeMap.entries()].sort((a, b) =>
        a[1].name.localeCompare(b[1].name, 'it')
    );

    // Build rows for each employee
    for (const [, emp] of sortedEmployees) {
        const ordRow = [emp.name, 'ORD.'];
        const straRow = ['', 'STRA.'];
        const tassRow = ['', 'T. ASS'];
        const assRow = ['', 'ASS.'];

        let totalOrd = 0;
        let totalStra = 0;
        let totalAss = 0;

        for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
            const dayData = emp.days[dayNum];

            if (!dayData || (dayData.rawHours <= 0 && !dayData.absenceType)) {
                // Empty day
                ordRow.push('');
                straRow.push('');
                tassRow.push('');
                assRow.push('');
                continue;
            }

            // Calculate ORD and STRA from raw hours
            let ordHours = 0;
            let straHours = 0;

            if (dayData.rawHours > 0) {
                if (dayData.rawHours > 10) {
                    // Overtime: only if > 10h
                    ordHours = 8;
                    const extra = dayData.rawHours - 8;
                    straHours = Math.round(extra);
                    if (straHours < 1) straHours = 1;
                } else {
                    // Normal day: apply rounding (≥6h30m → 8h)
                    ordHours = roundWorkHours(dayData.rawHours);
                    straHours = 0;
                }
            }

            // Fill ORD
            ordRow.push(ordHours > 0 ? ordHours : '');
            totalOrd += ordHours;

            // Fill STRA
            straRow.push(straHours > 0 ? straHours : '');
            totalStra += straHours;

            // Fill T.ASS and ASS
            if (dayData.absenceType) {
                tassRow.push(dayData.absenceType);
                assRow.push(dayData.absenceHours || 8);
                totalAss += (dayData.absenceHours || 8);
            } else {
                tassRow.push('');
                assRow.push('');
            }
        }

        // Add totals — all on the ORD row for clean alignment
        ordRow.push(totalOrd);
        ordRow.push(totalStra);
        ordRow.push(totalAss);

        // Empty cells for STRA/T.ASS/ASS rows in total columns
        straRow.push('', '', '');
        tassRow.push('', '', '');
        assRow.push('', '', '');

        data.push(ordRow);
        data.push(straRow);
        data.push(tassRow);
        data.push(assRow);
        data.push([]); // separator row between employees
    }

    // Create sheet
    const sheet = XLSX.utils.aoa_to_sheet(data);

    // Set column widths
    const cols = [
        { wch: 22 }, // DIPENDENTE
        { wch: 6 },  // ORD./STRA./T.ASS/ASS.
    ];
    for (let d = 1; d <= daysInMonth; d++) {
        cols.push({ wch: 5 }); // day columns
    }
    cols.push({ wch: 10 }); // TOT. ORD.
    cols.push({ wch: 10 }); // TOT. STRA.
    cols.push({ wch: 10 }); // TOT. ASS.
    sheet['!cols'] = cols;

    XLSX.utils.book_append_sheet(workbook, sheet, 'Foglio Presenze');

    // Download
    const fileName = `Foglio_Presenze_${monthName}_${year}`;
    downloadWorkbook(workbook, fileName);
}

