'use strict';

/**
 * business-auth.controller.js
 *
 * 1. What this file does:
 *    Handles HTTP requests and responses for dealer, distributor, and OEM partner authentication,
 *    including business registration, credentials login, token rotation, revocation, and session profile retrieval.
 * 2. Overall design:
 *    Adheres to the Clean Architecture controller pattern — handles request unpacking, delegates business
 *    validation and cryptographic operations to business-auth.service, and normalizes API payloads using ApiResponse.
 * 3. Elements in the file:
 *    - register: HTTP handler for business self-onboarding.
 *    - login: HTTP handler for business credentials authentication and token issuance.
 *    - refresh: HTTP handler for rotating business refresh tokens.
 *    - logout: HTTP handler for revoking active business refresh tokens.
 *    - getMe: HTTP handler for retrieving the authenticated business actor's profile.
 * 4. Final output of the file:
 *    Exports an object containing express route handler middleware functions bound with asyncHandler.
 */

const service = require('./business-auth.service');
const { sendSuccess } = require('../../core/utils/ApiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');

/**
 * register
 *
 * 1. Use of function:
 *    Handles business onboarding requests by registering a new business organization and primary staff user.
 * 2. How does the specific function work:
 *    Extracts organization and user registration payload from req.body, invokes service.register(), and emits a 201 Created response.
 * 3. Concepts used in the function:
 *    Async request handling, Clean Architecture delegation, HTTP status 201 Created.
 * 4. Places where this function is imported and used:
 *    Imported in `src/modules/business-auth/business-auth.routes.js` and mounted at `POST /api/v1/business-auth/register`.
 * 5. Final output of the function, before and after:
 *    Before: Raw HTTP request containing organization and administrator data.
 *    After: HTTP 201 JSON response containing success message, sanitized organization, and sanitized user data.
 */
const register = asyncHandler(async (req, res) => {
  const result = await service.register(req.body);
  sendSuccess(res, result, 201);
});

/**
 * login
 *
 * 1. Use of function:
 *    Authenticates dealer, distributor, or OEM staff and provides access/refresh tokens.
 * 2. How does the specific function work:
 *    Passes credentials to service.login(). To resolve Issue 31 and maintain backwards compatibility,
 *    it unpacks `access_token` and `refresh_token` to the root of `data` while preserving `tokens`.
 * 3. Concepts used in the function:
 *    Token contract normalization, backward compatibility payload reshaping, asynchronous error forwarding.
 * 4. Places where this function is imported and used:
 *    Imported in `src/modules/business-auth/business-auth.routes.js` and mounted at `POST /api/v1/business-auth/login`.
 * 5. Final output of the function, before and after:
 *    Before: Raw HTTP request with email and password in body.
 *    After: HTTP 200 response with data containing access_token, refresh_token, tokens, user, and organization.
 */
const login = asyncHandler(async (req, res) => {
  const result = await service.login(req.body);
  const payload = {
    ...result,
    access_token: result.tokens ? result.tokens.access_token : undefined,
    refresh_token: result.tokens ? result.tokens.refresh_token : undefined,
  };
  sendSuccess(res, payload, 200);
});

/**
 * refresh
 *
 * 1. Use of function:
 *    Issues a fresh business access token and rotated refresh token using an existing valid refresh token.
 * 2. How does the specific function work:
 *    Passes raw token from req.body to service.refresh(). Returns rotated tokens flattened and nested for client compatibility.
 * 3. Concepts used in the function:
 *    Cryptographic token rotation, atomic revocation, contract compatibility.
 * 4. Places where this function is imported and used:
 *    Imported in `src/modules/business-auth/business-auth.routes.js` and mounted at `POST /api/v1/business-auth/refresh`.
 * 5. Final output of the function, before and after:
 *    Before: HTTP request with refresh_token string.
 *    After: HTTP 200 response with fresh access_token and rotated refresh_token.
 */
const refresh = asyncHandler(async (req, res) => {
  const { tokens } = await service.refresh(req.body);
  const payload = {
    ...tokens,
    tokens,
  };
  sendSuccess(res, payload, 200);
});

/**
 * logout
 *
 * 1. Use of function:
 *    Revokes an active business refresh token upon user logout.
 * 2. How does the specific function work:
 *    Passes refresh token from req.body to service.logout() to mark it revoked in the database.
 * 3. Concepts used in the function:
 *    Session revocation, state invalidation.
 * 4. Places where this function is imported and used:
 *    Imported in `src/modules/business-auth/business-auth.routes.js` and mounted at `POST /api/v1/business-auth/logout`.
 * 5. Final output of the function, before and after:
 *    Before: HTTP request containing refresh_token.
 *    After: HTTP 200 response indicating successful token revocation.
 */
const logout = asyncHandler(async (req, res) => {
  const result = await service.logout(req.body);
  sendSuccess(res, result, 200);
});

/**
 * getMe
 *
 * 1. Use of function:
 *    Retrieves the currently authenticated business user profile and associated organization.
 * 2. How does the specific function work:
 *    Extracts authenticated user ID from req.businessUser, queries service.getMe(), and returns sanitized records.
 * 3. Concepts used in the function:
 *    Contextual actor identification, authentication guard downstream consumption.
 * 4. Places where this function is imported and used:
 *    Imported in `src/modules/business-auth/business-auth.routes.js` and mounted at `GET /api/v1/business-auth/me`.
 * 5. Final output of the function, before and after:
 *    Before: Authenticated request containing req.businessUser.
 *    After: HTTP 200 response with sanitized user profile and organization metadata.
 */
const getMe = asyncHandler(async (req, res) => {
  const result = await service.getMe(req.businessUser.id);
  sendSuccess(res, result, 200);
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  getMe,
};
