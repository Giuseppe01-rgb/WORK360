const ConstructionSite = require('../models/ConstructionSite');
const Economia = require('../models/Economia');

/**
 * Simple in-memory cache for site validation
 * Reduces redundant DB queries for same site/company pairs
 * TTL: 5 seconds (enough to avoid N+1 but short enough to stay fresh)
 */
const siteCache = new Map();
const CACHE_TTL = 5000; // 5 seconds

function getCacheKey(siteId, companyId) {
    return `${siteId}-${companyId}`;
}

function getFromCache(siteId, companyId) {
    const key = getCacheKey(siteId, companyId);
    const cached = siteCache.get(key);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.value;
    }

    siteCache.delete(key); // Remove stale entry
    return null;
}

function setCache(siteId, companyId, value) {
    const key = getCacheKey(siteId, companyId);
    siteCache.set(key, {
        value,
        timestamp: Date.now()
    });

    // Cleanup old entries periodically
    if (siteCache.size > 1000) {
        const now = Date.now();
        for (const [k, v] of siteCache.entries()) {
            if (now - v.timestamp > CACHE_TTL) {
                siteCache.delete(k);
            }
        }
    }
}

/**
 * Custom Security Error with status code
 */
class SecurityError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'SecurityError';
    }
}

/**
 * SECURITY: Verify that a construction site belongs to the specified company
 * Uses caching to reduce DB load for repeated checks
 * @param {string} siteId - The site ID to check
 * @param {string} companyId - The company ID that should own the site
 * @returns {Promise<ConstructionSite>} The site if found and belongs to company
 * @throws {SecurityError} 404 if site not found or doesn't belong to company
 */
async function assertSiteBelongsToCompany(siteId, companyId) {
    if (!siteId) {
        throw new SecurityError(400, 'ID cantiere mancante');
    }

    // Check cache first
    const cached = getFromCache(siteId, companyId);
    if (cached !== null) {
        if (!cached) {
            throw new SecurityError(404, 'Cantiere non trovato');
        }
        return cached;
    }

    // Query database
    const site = await ConstructionSite.findOne({
        _id: siteId,
        company: companyId
    });

    // Cache result (both found and not found)
    setCache(siteId, companyId, site);

    if (!site) {
        throw new SecurityError(404, 'Cantiere non trovato');
    }

    return site;
}

/**
 * SECURITY: Verify that an economia belongs to the specified company (via site)
 * @param {string} economiaId - The economia ID to check
 * @param {string} companyId - The company ID that should own the economia
 * @returns {Promise<Economia>} The economia if found and belongs to company
 * @throws {SecurityError} 404 if economia not found or doesn't belong to company
 */
async function assertEconomiaBelongsToCompany(economiaId, companyId) {
    if (!economiaId) {
        throw new SecurityError(400, 'ID economia mancante');
    }

    const economia = await Economia.findById(economiaId).populate('site');

    if (!economia) {
        throw new SecurityError(404, 'Economia non trovata');
    }

    // Check if site exists and belongs to company
    if (!economia.site || economia.site.company.toString() !== companyId.toString()) {
        throw new SecurityError(404, 'Economia non trovata');
    }

    return economia;
}

/**
 * SECURITY: Generic helper for any resource with company field
 * @param {Model} Model - Mongoose model to query
 * @param {string} resourceId - The resource ID to check
 * @param {string} companyId - The company ID that should own the resource
 * @param {string} errorMessage - Custom error message (default: 'Risorsa non trovata')
 * @returns {Promise<any>} The resource if found and belongs to company
 * @throws {SecurityError} 404 if resource not found or doesn't belong to company
 */
async function assertResourceBelongsToCompany(Model, resourceId, companyId, errorMessage = 'Risorsa non trovata') {
    if (!resourceId) {
        throw new SecurityError(400, 'ID risorsa mancante');
    }

    const resource = await Model.findOne({
        _id: resourceId,
        company: companyId
    });

    if (!resource) {
        throw new SecurityError(404, errorMessage);
    }

    return resource;
}

module.exports = {
    SecurityError,
    assertSiteBelongsToCompany,
    assertEconomiaBelongsToCompany,
    assertResourceBelongsToCompany
};
