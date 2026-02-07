/**
 * Calculate site margin info with status classification
 * @param {Object} params - Input parameters
 * @param {number|null} params.contractValue - Contract value (prezzo pattuito)
 * @param {number} params.totalCost - Total cost (manodopera + materiali)
 * @returns {Object} Margin info with value, percent, and status
 */
function getSiteMarginInfo({ contractValue, totalCost }) {
    // If no contract value or invalid, return unknown
    if (!contractValue || contractValue <= 0) {
        return {
            marginValue: null,
            marginPercent: null,
            status: 'unknown'
        };
    }

    const marginValue = contractValue - totalCost;
    const marginPercent = (marginValue / contractValue) * 100;

    // Classify margin status (semaforo)
    let status = 'unknown';
    if (marginPercent < 10) {
        status = 'low';      // Rosso - margine basso
    } else if (marginPercent < 20) {
        status = 'medium';   // Giallo - margine medio
    } else {
        status = 'high';     // Verde - margine buono
    }

    return {
        marginValue: Number.parseFloat(marginValue.toFixed(2)),
        marginPercent: Number.parseFloat(marginPercent.toFixed(1)),
        status
    };
}

module.exports = { getSiteMarginInfo };
