'use strict';

/**
 * src/config/swagger.js
 *
 * WHAT THIS FILE DOES:
 *   Configures swagger-jsdoc with OpenAPI 3.0 metadata.
 *   Returns the swagger specification used by swagger-ui-express.
 *
 * OVERALL DESIGN:
 *   Swagger is set up as a documentation layer only.
 *   The spec is generated from JSDoc annotations in route files.
 *   No business logic lives here.
 *
 * ELEMENTS:
 *   swaggerSpec  — generated OpenAPI 3.0 spec object
 *   swaggerUiOptions — ui-express configuration options
 *
 * FINAL OUTPUT:
 *   module.exports = { swaggerSpec, swaggerUiOptions }
 *
 * IMPORTED BY:
 *   src/app.js (mounts /api/docs endpoint)
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 2 (API docs: swagger-jsdoc)
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CAMSO Mobile App API',
      version: '1.0.0',
      description:
        'REST API for the CAMSO Mobile App (Compact Construction Tires & Tracks). ' +
        'Backend Team: Aary (Support/Content/Engagement) & Vishal (Catalogue/Search/Identity).',
      contact: {
        name: 'CAMSO Backend Team',
      },
    },
    servers: [
      {
        url: '/api/v1',
        description: 'API v1',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT access token. Obtain via POST /auth/login or /admin/auth/login.',
        },
      },
      schemas: {
        ApiError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: [
                    'VALIDATION_ERROR',
                    'UNAUTHORIZED',
                    'FORBIDDEN',
                    'NOT_FOUND',
                    'INTERNAL_ERROR',
                  ],
                },
                message: { type: 'string' },
                details: { type: 'object' },
              },
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            pageSize: { type: 'integer', example: 20 },
            total: { type: 'integer', example: 100 },
            totalPages: { type: 'integer', example: 5 },
          },
        },
      },
    },
  },
  // Scan all route files for @openapi annotations
  apis: ['./src/modules/**/*.routes.js', './src/modules/**/*.admin.routes.js'],
};

/**
 * swaggerSpec
 *
 * USE: The generated OpenAPI 3.0 specification object, served at /api/docs.
 *
 * HOW IT WORKS:
 *   swagger-jsdoc scans the file patterns in `apis` for JSDoc @openapi annotations
 *   and combines them with the `definition` above into a spec object.
 *
 * IMPORTED BY: src/app.js
 */
const swaggerSpec = swaggerJsdoc(options);

/**
 * swaggerUiOptions
 *
 * USE: Configuration for swagger-ui-express middleware.
 */
const swaggerUiOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  swaggerOptions: {
    persistAuthorization: true,
  },
};

module.exports = { swaggerSpec, swaggerUiOptions };
