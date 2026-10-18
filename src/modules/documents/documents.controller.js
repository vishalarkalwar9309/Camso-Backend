'use strict';

/**
 * src/modules/documents/documents.controller.js
 *
 * WHAT THIS FILE DOES:
 *   Controller module for handling public document HTTP requests.
 *   Validates request input, calls documentsService, and returns standardized ApiResponse envelopes.
 *
 * OVERALL DESIGN:
 *   Thin controller layer. Contains NO database queries or business rules.
 *   Uses documentsValidation for input validation and ApiResponse for response shaping.
 *
 * ELEMENTS IN THIS FILE:
 *   - list(req, res)     — handler for GET /api/v1/documents
 *   - getById(req, res)  — handler for GET /api/v1/documents/:id
 *
 * FINAL OUTPUT OF THE FILE:
 *   Exported object containing Express controller handlers for documents.
 *
 * IMPORTED BY:
 *   src/modules/documents/documents.routes.js
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 8
 */

const documentsService = require('./documents.service');
const { validateListQuery, validateDetailParams } = require('./documents.validation');
const ApiResponse = require('../../core/utils/ApiResponse');

const documentsController = {
  /**
   * list
   *
   * USE: Express handler for GET /api/v1/documents.
   *
   * HOW IT WORKS:
   *   1. Validates query parameters via validateListQuery.
   *   2. Invokes documentsService.listPublishedDocuments.
   *   3. Sends ApiResponse.paginated response envelope.
   *
   * CONCEPTS: Express controller pattern, response envelope.
   *
   * PLACES IMPORTED AND USED: src/modules/documents/documents.routes.js
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async list(req, res) {
    const validatedQuery = validateListQuery(req.query);
    const { product_id, category_id, document_type, lang } = validatedQuery;

    const filters = { product_id, category_id, document_type };
    const { documents, pagination } = await documentsService.listPublishedDocuments(filters, { ...req.query, lang });

    return ApiResponse.paginated(res, documents, pagination);
  },

  /**
   * getById
   *
   * USE: Express handler for GET /api/v1/documents/:id.
   *
   * HOW IT WORKS:
   *   1. Validates params and query via validateDetailParams.
   *   2. Invokes documentsService.getPublishedDocumentById.
   *   3. Sends ApiResponse.success response envelope.
   *
   * CONCEPTS: Express controller pattern.
   *
   * PLACES IMPORTED AND USED: src/modules/documents/documents.routes.js
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async getById(req, res) {
    const { id, lang } = validateDetailParams(req.params, req.query);
    const document = await documentsService.getPublishedDocumentById(id, lang);

    return ApiResponse.success(res, document);
  },

  /**
   * download
   *
   * USE: Express handler for GET /api/v1/documents/:id/download.
   */
  async download(req, res) {
    const { id, lang } = validateDetailParams(req.params, req.query);
    let actor = req.user || req.businessUser || req.adminUser || null;

    if (!actor && req.headers && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7).trim();
        try {
          const { verifyAccessToken } = require('../../core/utils/tokenService');
          const decoded = verifyAccessToken(token);
          if (decoded) {
            actor = {
              id: decoded.sub || decoded.id,
              email: decoded.email || null,
              role: decoded.role || (decoded.is_guest ? 'GUEST' : 'END_USER'),
              is_guest: Boolean(decoded.is_guest),
              org_id: decoded.org_id || null,
            };
          }
        } catch (err) {
          if (err.name === 'TokenExpiredError') {
            throw require('../../core/utils/ApiError').unauthorized('Access token expired.', 'TOKEN_EXPIRED');
          }
          throw require('../../core/utils/ApiError').unauthorized('Invalid access token.', 'INVALID_TOKEN');
        }
      }
    }

    const downloadData = await documentsService.downloadDocument(id, lang, actor, req);

    return ApiResponse.success(res, downloadData);
  },

  async adminList(req, res) {
    const validatedQuery = require('./documents.validation').validateListQuery(req.query);
    const { product_id, category_id, document_type, lang } = validatedQuery;
    let is_published = undefined;
    if (req.query.is_published === 'true') is_published = true;
    else if (req.query.is_published === 'false') is_published = false;

    const filters = { product_id, category_id, document_type, is_published };
    const { documents, pagination } = await documentsService.listAdminDocuments(filters, { ...req.query, lang });

    return ApiResponse.paginated(res, documents, pagination);
  },

  async adminGetById(req, res) {
    const { id, lang } = require('./documents.validation').validateDetailParams(req.params, req.query);
    const document = await documentsService.getAdminDocumentById(id, lang);
    return ApiResponse.success(res, document);
  },

  async adminCreate(req, res) {
    const data = require('./documents.validation').validateCreateDocument(req.body);
    const document = await documentsService.createDocument(data, req.auditContext);
    return ApiResponse.success(res, document, 201);
  },

  async adminUpdate(req, res) {
    const { validateCuid } = require('../../core/utils/idValidation');
    const id = validateCuid(req.params.id);
    const data = require('./documents.validation').validateUpdateDocument(req.body);
    
    const document = await documentsService.updateDocument(id, data, req.auditContext);
    return ApiResponse.success(res, document);
  },

  async adminUploadFile(req, res) {
    const { validateCuid } = require('../../core/utils/idValidation');
    const id = validateCuid(req.params.id);
    const languageCode = req.body.language_code || 'en';
    if (!req.file) throw require('../../core/utils/ApiError').validation('No file uploaded');

    const docFile = await documentsService.uploadDocumentFile(id, req.file, languageCode, req.admin.id, req.auditContext);
    return ApiResponse.success(res, docFile, 201);
  },
};

module.exports = documentsController;
