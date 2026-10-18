'use strict';

/**
 * languages.controller.js
 *
 * 1. What this file does:
 *    Handles HTTP requests for active public language listings and administrative language management.
 * 2. Overall design:
 *    Controller layer delegating to languages.service and formatting API payloads with ApiResponse.
 *    Provides field aliases (`native`, `is_default`) to maintain contract compatibility with mobile clients.
 * 3. Elements in the file:
 *    - getActiveLanguages: Public handler returning active languages.
 *    - getAdminLanguages: Admin handler returning all configured languages.
 *    - createLanguage: Admin handler creating a new language.
 *    - updateLanguage: Admin handler updating language configurations.
 * 4. Final output of the file:
 *    Exports route handler functions for languages routing.
 */

const service = require('./languages.service');
const { sendSuccess } = require('../../core/utils/ApiResponse');

/**
 * getActiveLanguages
 *
 * 1. The use of function:
 *    Retrieves active languages for mobile application localization.
 * 2. How does the specific function work:
 *    Invokes service.getActiveLanguages() and formats records with `native` and `is_default` field aliases.
 * 3. Concepts used in the function:
 *    Localization cataloguing, field aliasing, ApiResponse serialization.
 * 4. Places where this function is imported and used:
 *    Imported in `languages.routes.js` and mounted at `GET /api/v1/languages`.
 * 5. Final output of the function, before and after:
 *    Before: Raw HTTP GET request.
 *    After: Standard HTTP 200 response containing list of languages with native and is_default flags.
 */
async function getActiveLanguages(req, res, next) {
  try {
    const rawData = await service.getActiveLanguages();
    const data = (rawData || []).map((l) => ({
      ...l,
      native: l.native_name || l.name,
      native_name: l.native_name || l.name,
      is_default: l.is_default !== undefined ? l.is_default : (l.code === 'en'),
    }));
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

/**
 * getAdminLanguages
 *
 * 1. The use of function:
 *    Retrieves all languages for the CMS Admin management console.
 * 2. How does the specific function work:
 *    Calls service.getAdminLanguages() and emits standard success response.
 * 3. Concepts used in the function:
 *    Admin management query.
 * 4. Places where this function is imported and used:
 *    Imported in `languages.admin.routes.js` and mounted at `GET /api/v1/admin/languages`.
 * 5. Final output of the function, before and after:
 *    Before: Authenticated admin HTTP GET request.
 *    After: HTTP 200 response with all languages.
 */
async function getAdminLanguages(req, res, next) {
  try {
    const data = await service.getAdminLanguages();
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

/**
 * createLanguage
 *
 * 1. The use of function:
 *    Creates a new supported language in the system.
 * 2. How does the specific function work:
 *    Extracts authenticated admin ID and body, delegates to service.createLanguage(), and responds with 201 Created.
 * 3. Concepts used in the function:
 *    Entity creation, audit attribution.
 * 4. Places where this function is imported and used:
 *    Mounted at `POST /api/v1/admin/languages`.
 * 5. Final output of the function, before and after:
 *    Before: HTTP POST with language configuration.
 *    After: HTTP 201 Created with new language entity.
 */
async function createLanguage(req, res, next) {
  try {
    const adminId = req.user?.id || 'admin';
    const data = await service.createLanguage(adminId, req.body);
    return sendSuccess(res, data, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * updateLanguage
 *
 * 1. The use of function:
 *    Updates an existing language configuration.
 * 2. How does the specific function work:
 *    Extracts code from params and payload from body, delegates to service.updateLanguage().
 * 3. Concepts used in the function:
 *    Entity modification, audit logging.
 * 4. Places where this function is imported and used:
 *    Mounted at `PATCH /api/v1/admin/languages/:code`.
 * 5. Final output of the function, before and after:
 *    Before: HTTP PATCH with updated fields.
 *    After: HTTP 200 with updated language record.
 */
async function updateLanguage(req, res, next) {
  try {
    const adminId = req.user?.id || 'admin';
    const { code } = req.params;
    const data = await service.updateLanguage(adminId, code, req.body);
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getActiveLanguages,
  getAdminLanguages,
  createLanguage,
  updateLanguage,
};
