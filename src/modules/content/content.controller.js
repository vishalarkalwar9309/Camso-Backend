'use strict';

/**
 * content.controller — HTTP request handlers for content and dynamic configuration.
 */

const service = require('./content.service');
const { sendSuccess } = require('../../core/utils/ApiResponse');

async function getPublicContentByKey(req, res, next) {
  try {
    const { key } = req.params;
    const data = await service.getPublicContentByKey(key);
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

async function getAllPublicContent(req, res, next) {
  try {
    const data = await service.getAllPublicContent();
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

async function getAdminContentByKey(req, res, next) {
  try {
    const { key } = req.params;
    const data = await service.getAdminContentByKey(key);
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

async function updateContent(req, res, next) {
  try {
    const adminId = req.user?.id || 'admin';
    const { key } = req.params;
    const data = await service.updateContent(adminId, key, req.body);
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPublicContentByKey,
  getAllPublicContent,
  getAdminContentByKey,
  updateContent,
};
