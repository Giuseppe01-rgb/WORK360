/**
 * Helper utilities for Sequelize migration
 */

/**
 * Get company ID from request user object
 * Works with both direct companyId field and nested company object
 */
const getCompanyId = (req) => {
    return req.user?.companyId || req.user?.company?.id;
};

/**
 * Get user ID from request user object
 * Sequelize uses 'id' not '_id'
 */
const getUserId = (req) => {
    return req.user?.id;
};

module.exports = {
    getCompanyId,
    getUserId
};
