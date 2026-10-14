'use strict';

/**
 * auditService — Records sensitive administrative actions and login events to audit_logs table.
 */

const prisma = require('../../config/database');
const logger = require('../logger');

/**
 * Log an audit event.
 *
 * @param {object} params
 * @param {string|null} params.actorId
 * @param {string|null} params.actorEmail
 * @param {'CREATE'|'UPDATE'|'DELETE'|'LOGIN'|'STATUS_CHANGE'} params.action
 * @param {string} params.entityType
 * @param {string|null} params.entityId
 * @param {object|null} params.details
 */
async function recordAudit({ actorId = null, actorEmail = null, action, entityType, entityId = null, details = null }) {
  try {
    return await prisma.auditLog.create({
      data: {
        actor_id: actorId,
        actor_email: actorEmail,
        action,
        entity_type: entityType,
        entity_id: entityId ? String(entityId) : null,
        details: details || undefined,
      },
    });
  } catch (err) {
    logger.error('Failed to write audit log entry:', err);
    // Return null rather than crashing the primary operation
    return null;
  }
}

module.exports = {
  record: recordAudit,
  recordAudit,
};

