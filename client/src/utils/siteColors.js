/**
 * Shared pastel color palette for sites
 * Each site gets a consistent color based on its ID or name
 */

// Harmonious pastel palette - soft, elegant, easy on the eyes
export const siteColorPalette = [
    { bg: 'bg-teal-100', text: 'text-teal-600', iconBg: 'bg-teal-50', name: 'Teal' },        // Verde acqua
    { bg: 'bg-sky-100', text: 'text-sky-600', iconBg: 'bg-sky-50', name: 'Sky' },            // Azzurro cielo
    { bg: 'bg-violet-100', text: 'text-violet-600', iconBg: 'bg-violet-50', name: 'Violet' }, // Viola pastello
    { bg: 'bg-rose-100', text: 'text-rose-500', iconBg: 'bg-rose-50', name: 'Rose' },         // Rosa pastello
    { bg: 'bg-amber-100', text: 'text-amber-600', iconBg: 'bg-amber-50', name: 'Amber' },     // Ambra morbida
    { bg: 'bg-emerald-100', text: 'text-emerald-600', iconBg: 'bg-emerald-50', name: 'Emerald' }, // Verde smeraldo
    { bg: 'bg-indigo-100', text: 'text-indigo-600', iconBg: 'bg-indigo-50', name: 'Indigo' }, // Indaco
    { bg: 'bg-orange-100', text: 'text-orange-500', iconBg: 'bg-orange-50', name: 'Orange' }, // Arancio pastello
    { bg: 'bg-cyan-100', text: 'text-cyan-600', iconBg: 'bg-cyan-50', name: 'Cyan' },         // Ciano
    { bg: 'bg-fuchsia-100', text: 'text-fuchsia-500', iconBg: 'bg-fuchsia-50', name: 'Fuchsia' }, // Fucsia
    { bg: 'bg-lime-100', text: 'text-lime-600', iconBg: 'bg-lime-50', name: 'Lime' },         // Lime
    { bg: 'bg-pink-100', text: 'text-pink-500', iconBg: 'bg-pink-50', name: 'Pink' },         // Rosa chiaro
];

/**
 * Get a consistent color for a site based on its ID or name
 * Uses improved DJB2 hash for better distribution
 * @param {string|number} identifier - Site ID or name to generate color from
 * @returns {object} Color object with bg, text, iconBg, and name properties
 */
export const getSiteColor = (identifier) => {
    if (!identifier) return siteColorPalette[0];

    const str = String(identifier);

    // DJB2 hash algorithm - better distribution for sequential numbers
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) ^ str.codePointAt(i);
    }

    // Add extra mixing for numeric IDs
    hash = Math.abs(hash);
    hash = ((hash >> 16) ^ hash) * 0x45d9f3b;
    hash = ((hash >> 16) ^ hash) * 0x45d9f3b;
    hash = (hash >> 16) ^ hash;

    return siteColorPalette[Math.abs(hash) % siteColorPalette.length];
};

/**
 * Create a color map for all sites (useful for caching)
 * @param {Array} sites - Array of site objects
 * @returns {Map} Map of siteId -> color object
 */
export const createSiteColorMap = (sites) => {
    const colorMap = new Map();
    sites.forEach(site => {
        // Use site ID for consistency across app
        colorMap.set(site.id, getSiteColor(site.id));
    });
    return colorMap;
};
