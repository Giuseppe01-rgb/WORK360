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
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9_-]/g, '_');
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
