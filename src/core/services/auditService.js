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
 * @param {string|null} [params.actorId]
 * @param {string|null} [params.actor_id]
 * @param {string|null} [params.actorEmail]
 * @param {string|null} [params.actor_email]
 * @param {'CREATE'|'UPDATE'|'DELETE'|'LOGIN'|'STATUS_CHANGE'|'PUBLISH'|'UNPUBLISH'} params.action
 * @param {string} params.entityType
 * @param {string|null} [params.entityId]
 * @param {object|null} [params.details]
 * @param {object|null} [params.before]
 * @param {object|null} [params.after]
 * @param {object|null} [params.changes]
 * @param {string|null} [params.ip]
 * @param {string|null} [params.ip_address]
 * @param {string|null} [params.userAgent]
 * @param {string|null} [params.user_agent]
 */
async function recordAudit(params) {
  try {
    const actorId = params.actorId || params.actor_id || null;
    const actorEmail = params.actorEmail || params.actor_email || null;
    const action = params.action;
    const entityType = params.entityType || params.entity_type;
    const entityId = params.entityId || params.entity_id ? String(params.entityId || params.entity_id) : null;
    
    let changes = params.changes || null;
    if (!changes && (params.before !== undefined || params.after !== undefined)) {
      changes = { before: params.before || null, after: params.after || null };
    }

    const ipAddress = params.ip || params.ip_address || null;
    const userAgent = params.userAgent || params.user_agent || null;
    const details = params.details || undefined;

    return await prisma.auditLog.create({
      data: {
        actor_id: actorId,
        actor_email: actorEmail,
        action,
        entity_type: entityType,
        entity_id: entityId,
        details,
        changes: changes || undefined,
        ip_address: ipAddress,
        user_agent: userAgent,
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


