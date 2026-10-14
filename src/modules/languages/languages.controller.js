'use strict';

/**
 * languages.controller — HTTP request handlers for languages.
 */

const service = require('./languages.service');
const { sendSuccess } = require('../../core/utils/ApiResponse');

async function getActiveLanguages(req, res, next) {
  try {
    const data = await service.getActiveLanguages();
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

async function getAdminLanguages(req, res, next) {
  try {
    const data = await service.getAdminLanguages();
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

async function createLanguage(req, res, next) {
  try {
    const adminId = req.user?.id || 'admin';
    const data = await service.createLanguage(adminId, req.body);
    return sendSuccess(res, data, 201);
  } catch (err) {
    next(err);
  }
}

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
