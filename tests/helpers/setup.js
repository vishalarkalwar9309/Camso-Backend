'use strict';

/**
 * Jest global setup file.
 *
 * Loaded before every test file via jest.setupFiles in package.json.
 * Ensures dotenv variables are available to modules that read process.env
 * (env.js, config/jwt.js, etc.) before any test module is imported.
 */

require('dotenv').config();
