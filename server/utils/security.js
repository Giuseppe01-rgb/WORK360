const ConstructionSite = require('../models/ConstructionSite');
const Economia = require('../models/Economia');

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
 * @param {string} siteId - The site ID to check
 * @param {string} companyId - The company ID that should own the site
 * @returns {Promise<ConstructionSite>} The site if found and belongs to company
 * @throws {SecurityError} 404 if site not found or doesn't belong to company
 */
async function assertSiteBelongsToCompany(siteId, companyId) {
    if (!siteId) {
        throw new SecurityError(400, 'ID cantiere mancante');
    }

    const site = await ConstructionSite.findOne({
        _id: siteId,
        company: companyId
    });

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
