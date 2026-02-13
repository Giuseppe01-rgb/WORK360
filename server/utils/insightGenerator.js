/**
 * InsightGenerator - Rule-based dashboard insights
 * 
 * This module generates human-readable insights for the Owner Home dashboard.
 * It uses a rule-based "Smart Template" approach that can be replaced with
 * an LLM provider (OpenAI, Google Gemini) in the future.
 * 
 * Architecture:
 *   generateHomeInsights(data) → { status, insights }
 *   
 * To integrate AI in the future, replace the body of generateHomeInsights()
 * with an API call to an LLM, passing `data` as context.
 */

// ─── Status Thresholds ───────────────────────────────────────────────
// Based on Italian construction market growth benchmarks:
//   < 0.5%  → CRITICITÀ  (Red)
//   0.5-1.5% → STABILE   (Yellow)
//   1.5-2.5% → SANA      (Green)
//   > 2.5%  → ALTA EFF.  (Indigo)
const THRESHOLDS = {
    critical: 0.5,
    stable: 1.5,
    healthy: 2.5
};

/**
 * Determine the company health status based on margin growth percentage.
 * @param {number} growthPercent - The margin growth percentage
 * @returns {{ label: string, level: string, color: string }}
 */
function getCompanyStatus(growthPercent) {
    if (growthPercent >= THRESHOLDS.healthy) {
        return { label: 'ALTA EFFICIENZA', level: 'excellent', color: 'indigo' };
    }
    if (growthPercent >= THRESHOLDS.stable) {
        return { label: 'AZIENDA SANA', level: 'healthy', color: 'green' };
    }
    if (growthPercent >= THRESHOLDS.critical) {
        return { label: 'STABILE', level: 'stable', color: 'yellow' };
    }
    return { label: 'CRITICITÀ', level: 'critical', color: 'red' };
}

/**
 * Generate the main status insight text.
 * @param {string} level - One of: excellent, healthy, stable, critical
 * @param {number} growthPercent - The margin growth percentage
 * @returns {string}
 */
function getStatusInsight(level, growthPercent) {
    const pct = growthPercent.toFixed(1);
    const templates = {
        excellent: `Con una crescita del ${pct}%, l'azienda opera in alta efficienza. I costi sono sotto controllo e i margini superano le aspettative del settore edile italiano.`,
        healthy: `La crescita del ${pct}% indica un'azienda sana. I ricavi coprono ampiamente i costi e c'è margine per investimenti strategici.`,
        stable: `Una crescita del ${pct}% indica stabilità. L'azienda copre i costi ma il margine è limitato. Ottimizzare le ore lavorate potrebbe migliorare la situazione.`,
        critical: `Attenzione: la crescita è al ${pct}%. I costi si avvicinano ai ricavi. Verificare l'incidenza della manodopera e i tempi di lavorazione.`
    };
    return templates[level] || templates.stable;
}

/**
 * Generate the margin insight text.
 * @param {object} params
 * @param {number} params.marginPercent - Current margin percentage
 * @param {number} params.laborPercent - Labor cost incidence percentage
 * @param {number} params.materialsPercent - Materials cost incidence percentage
 * @returns {string}
 */
function getMarginInsight({ marginPercent, laborPercent, materialsPercent }) {
    const marginPct = marginPercent.toFixed(1);
    const laborPct = laborPercent.toFixed(0);
    const matPct = materialsPercent.toFixed(0);

    if (marginPercent >= 20) {
        return `Margine attuale al ${marginPct}%. Manodopera incide per il ${laborPct}%, materiali per il ${matPct}%. Ottimo equilibrio.`;
    }
    if (marginPercent >= 10) {
        return `Margine al ${marginPct}%. Manodopera al ${laborPct}% e materiali al ${matPct}%. Buona gestione, monitorare le ore extra.`;
    }
    if (marginPercent >= 0) {
        return `Margine ridotto al ${marginPct}%. Manodopera incide per il ${laborPct}%. Valutare ottimizzazione turni e acquisti materiali.`;
    }
    return `Margine negativo (${marginPct}%). I costi superano i ricavi. Urgente: rivedere preventivi e costi di manodopera (${laborPct}%).`;
}

/**
 * Generate the labor insight text.
 * @param {object} params
 * @param {number} params.laborPercent - Labor incidence percentage
 * @param {number} params.monthlyHours - Monthly hours worked
 * @param {number} params.totalWorkers - Number of active workers
 * @returns {string}
 */
function getLaborInsight({ laborPercent, monthlyHours, totalWorkers }) {
    const avgHoursPerWorker = totalWorkers > 0 ? (monthlyHours / totalWorkers).toFixed(0) : 0;

    if (laborPercent > 70) {
        return `Manodopera al ${laborPercent.toFixed(0)}% dei costi totali, sopra la media. Media ${avgHoursPerWorker}h/operaio questo mese. Valutare efficienza cantieri.`;
    }
    if (laborPercent > 50) {
        return `Manodopera al ${laborPercent.toFixed(0)}% dei costi. Media di ${avgHoursPerWorker}h per operaio. Incidenza nella norma per il settore.`;
    }
    return `Manodopera al ${laborPercent.toFixed(0)}% dei costi, ben contenuta. Media ${avgHoursPerWorker}h/operaio. Buona ottimizzazione del personale.`;
}

/**
 * Generate site-specific insight.
 * @param {object} params
 * @param {number} params.activeSites - Number of active construction sites
 * @param {number} params.totalSites - Total number of sites
 * @param {number} params.sitesWithMargin - Number of sites with defined contract values
 * @returns {string}
 */
function getSiteInsight({ activeSites, totalSites, sitesWithMargin }) {
    if (activeSites === 0) {
        return 'Nessun cantiere attivo al momento. I dati si aggiorneranno all\'avvio dei lavori.';
    }
    const coverage = sitesWithMargin > 0
        ? ` ${sitesWithMargin} su ${activeSites} hanno un prezzo pattuito.`
        : ' Nessun cantiere ha un prezzo pattuito. Inseriscilo per vedere i margini.';
    return `${activeSites} cantieri attivi su ${totalSites} totali.${coverage}`;
}

/**
 * Main entry point: generate all insights for the Home dashboard.
 * 
 * @param {object} data - Dashboard data from getDashboard()
 * @param {number} data.marginGrowthPercent - Company margin growth %
 * @param {number} data.marginPercent - Current overall margin %
 * @param {number} data.laborPercent - Labor cost incidence %
 * @param {number} data.materialsPercent - Materials cost incidence %
 * @param {number} data.monthlyHours - Hours worked this month
 * @param {number} data.totalWorkers - Active workers count
 * @param {number} data.activeSites - Active construction sites
 * @param {number} data.totalSites - Total construction sites
 * @param {number} data.sitesWithMargin - Sites with contract values
 * @returns {{ status: object, insights: object }}
 */
function generateHomeInsights(data) {
    const growthPercent = data.marginGrowthPercent || 0;
    const status = getCompanyStatus(growthPercent);

    const insights = {
        status: getStatusInsight(status.level, growthPercent),
        margin: getMarginInsight({
            marginPercent: data.marginPercent || 0,
            laborPercent: data.laborPercent || 0,
            materialsPercent: data.materialsPercent || 0
        }),
        labor: getLaborInsight({
            laborPercent: data.laborPercent || 0,
            monthlyHours: data.monthlyHours || 0,
            totalWorkers: data.totalWorkers || 0
        }),
        sites: getSiteInsight({
            activeSites: data.activeSites || 0,
            totalSites: data.totalSites || 0,
            sitesWithMargin: data.sitesWithMargin || 0
        })
    };

    return {
        status,
        growthPercent,
        thresholds: THRESHOLDS,
        insights
    };
}

module.exports = {
    generateHomeInsights,
    getCompanyStatus,
    THRESHOLDS
};
