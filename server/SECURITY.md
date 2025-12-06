# WORK360 Security Documentation

## Security Level 1 - Multi-Tenant Isolation & Error Handling

This document outlines the security invariants and practices implemented in WORK360 to ensure strict separation between companies and safe error handling.

---

## Core Security Invariants

### 1. Multi-Tenant Isolation

**Rule**: Every user can ONLY access data from their own company.

**Implementation**:
- All database queries filter by `company: req.user.company`
- All site-related operations verify site ownership via `assertSiteBelongsToCompany()`
- Cross-company access attempts return `404` (not `403`) to avoid information leakage

**Affected Resources**:
- Construction Sites
- Photos
- Materials (manual and catalog)
- Economies (overtime records)
- Notes
- Reported Materials
- Work Activities
- Analytics/Reports

### 2. Site Ownership Validation

**Rule**: All site-related operations MUST verify that the site belongs to the logged user's company.

**Implementation**:
- Use `assertSiteBelongsToCompany(siteId, companyId)` helper before any operation
- Throws `SecurityError` with `statusCode: 404` if site not found or doesn't belong to company
- Applied in all controllers that accept `siteId` parameter

### 3. Error Handling

**Rule**: Generic error messages to client, detailed logs server-side only.

**Implementation**:
- Global error handler in `server/server.js`
- Detailed logging: timestamp, user, company, status, message, stack
- Client receives:
  - `500` errors → Generic message: "Si è verificato un errore interno"
  - `400/401/403/404` errors → Specific message (e.g., "Cantiere non trovato")
  - NEVER stack traces or internal details

### 4. CORS Configuration

**Rule**: Strict origin whitelisting in production.

**Development**:
- Allows `localhost:3000`, `localhost:5173`, `127.0.0.1:*`
- Allows requests with no origin (Postman, curl)

**Production**:
- Requires `CORS_ALLOWED_ORIGINS` environment variable
- Comma-separated explicit origins only
- NO wildcard patterns (removed `*.vercel.app`)
- Fails to start if not configured (logs fatal error)

**Example**:
```bash
CORS_ALLOWED_ORIGINS="https://work360.vercel.app,https://work360-production.vercel.app"
```

---

## Security Utilities

### File: `server/utils/security.js`

#### `SecurityError`
Custom error class with `statusCode` property.

```javascript
throw new SecurityError(404, 'Cantiere non trovato');
```

#### `assertSiteBelongsToCompany(siteId, companyId)`
Verifies site exists and belongs to company.

**Usage**:
```javascript
const { assertSiteBelongsToCompany } = require('../utils/security');

// In controller
const companyId = req.user.company._id || req.user.company;
await assertSiteBelongsToCompany(siteId, companyId);
```

**Throws**: `SecurityError(404, 'Cantiere non trovato')` if invalid

#### `assertEconomiaBelongsToCompany(economiaId, companyId)`
Verifies economia exists and belongs to company (via site).

#### `assertResourceBelongsToCompany(Model, resourceId, companyId, errorMessage)`
Generic helper for any resource with direct `company` field.

---

## Controller Security Checklist

All controllers with site-related operations have been updated:

### ✅ Updated Controllers

- **analyticsController.js**
  - `getSiteReport`: Validates site ownership before aggregations

- **economiaController.js**
  - `createEconomia`: Validates site before creation
  - `getEconomiesBySite`: Validates site before listing
  - `deleteEconomia`: Validates economia ownership via site

- **photoController.js**
  - `uploadPhoto`: Validates site before upload
  - `getPhotos`: Validates site if filtering, or gets all company sites

- **materialController.js**
  - `createMaterial`: Validates site before creation
  - `getMaterials`: Validates site if filtering by siteId

- **noteController.js**
  - `createNote`: Validates site before creation
  - `getNotes`: Validates site if filtering
  - `deleteNote`: Validates note belongs to company

- **reportedMaterialController.js**
  - `reportNewMaterial`: Validates site before reporting

### Controller Pattern

All updated controllers follow this pattern:

```javascript
const { assertSiteBelongsToCompany } = require('../utils/security');

/**
 * SECURITY INVARIANTS:
 * - All site-related operations verify site belongs to req.user.company
 * - Cross-company access attempts return 404
 * - Never expose internal error details to client
 */

const someFunction = async (req, res, next) => {
    try {
        const { siteId } = req.params; // or req.body/req.query
        const companyId = req.user.company._id || req.user.company;

        // SECURITY: Verify site belongs to company
        await assertSiteBelongsToCompany(siteId, companyId);

        // ... rest of logic ...

        res.json(result);
    } catch (error) {
        next(error); // Pass to global error handler
    }
};
```

---

## Testing Cross-Company Access

To verify security is working:

1. Create two companies (Company A and Company B)
2. Create sites for each company
3. Login as Company A owner
4. Try to access Company B resources:

**Expected Results**: All return `404 "Cantiere non trovato"`

```bash
# Get analytics for Company B site
GET /api/analytics/site-report/:companyBSiteId
# Response: 404 "Cantiere non trovato"

# Upload photo to Company B site
POST /api/photos { siteId: companyBSiteId, ... }
# Response: 404 "Cantiere non trovato"

# Create economia for Company B site
POST /api/economia { site: companyBSiteId, ... }
# Response: 404 "Cantiere non trovato"

# Get materials for Company B site
GET /api/materials?siteId=companyBSiteId
# Response: 404 "Cantiere non trovato"
```

---

## Environment Variables

### Required in Production

```bash
# CORS Configuration (REQUIRED)
CORS_ALLOWED_ORIGINS="https://your-app.vercel.app,https://your-app-production.vercel.app"

# JWT Secret (already required)
JWT_SECRET="your-secret-key"

# MongoDB URI (already required)
MONGO_URI="mongodb://..."
```

---

## Migration Notes

### Breaking Changes
None. All API response shapes remain the same for successful requests.

### New Behavior
- Cross-company access attempts now return `404` instead of potentially returning data
- Error messages are more generic in production
- CORS blocks non-whitelisted origins in production

### Backwards Compatibility
- All existing frontend code works without changes
- Only affects unauthorized access attempts (which should not exist)

---

## Future Enhancements (Level 2+)

Potential future security improvements:

1. **Rate Limiting**: Add per-IP rate limiting with `express-rate-limit`
2. **Request Validation**: Add input sanitization with `express-validator`
3. **Audit Logging**: Log all data modifications with user/company/timestamp
4. **Session Management**: Add refresh tokens and session expiry
5. **HTTPS Enforcement**: Force HTTPS in production
6. **SQL Injection Prevention**: Already using Mongoose, but add extra sanitization
7. **CSRF Protection**: Add CSRF tokens for sensitive operations
8. **Two-Factor Authentication**: Add 2FA for owners

---

## Support

For security issues or questions, contact the development team.

**Last Updated**: 2025-12-06
**Version**: 1.0 (Level 1 Security Hardening)
