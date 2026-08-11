'use strict';

/**
 * src/core/services/auditService.js
 *
 * WHAT THIS FILE DOES:
 *   Provides the generic audit logging service used across all mutating operations.
 *   Records admin actions to the audit_logs table.
 *
 * OVERALL DESIGN:
 *   This is NOT automatic middleware. Each service.js is responsible for calling
 *   auditService.record() at the end of every mutating method.
 *   Only the service that performed the mutation has the before/after state in memory.
 *
 * CRITICAL DESIGN RULE (master plan Section 11):
 *   auditContext.js middleware (runs on every /admin/* request) attaches req.auditContext
 *   = { actorId, role, ip, userAgent } — it does NOT write to audit_logs.
 *   This service is what actually writes.
 *
 *   Pattern:
 *     controller → service → mutation → auditService.record(req.auditContext + entityInfo)
 *
 * AUDIT ACTIONS:
 *   CREATE | UPDATE | DELETE | PUBLISH | UNPUBLISH | LOGIN
 *
 * SPECIAL CASE:
 *   LOGIN is recorded directly by admin-auth.service.js (not by a mutation service).
 *   Failed logins go to Winston ONLY — never to audit_logs (avoids brute-force noise).
 *
 * ELEMENTS:
 *   auditService.record(params) — writes one audit_log row
 *
 * FINAL OUTPUT:
 *   module.exports = auditService
 *
 * IMPORTED BY:
 *   Every *.service.js that performs mutations (documents, faqs, dealers, etc.)
 *   src/modules/admin-auth/admin-auth.service.js (for LOGIN events)
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 11 (Audit architecture)
 *            docs/CAMSO_Backend_Plan_Aary.md Section 2 (Shared core services)
 */

const auditLogRepository = require('../repositories/auditLog.repository');
const logger = require('../logger/winston');

/**
 * auditService
 *
 * USE: Singleton service object for writing audit log records.
 *
 * CONTAINS:
 *   record(params) — creates one row in audit_logs via auditLogRepository
 *
 * KEY DESIGN:
 *   - Does not import any business module.
 *   - Does not enforce business rules.
 *   - Delegates database persistence to auditLogRepository.
 *   - Logs a warning if the write fails (audit failure must not crash the primary operation).
 */
const auditService = {
  /**
   * record
   *
   * USE: Writes one audit log entry to the database via auditLogRepository.
   *
   * HOW IT WORKS:
   *   Calls auditLogRepository.createAuditLog with the provided fields.
   *   If the write fails (e.g. DB temporarily unavailable), logs a warning
   *   and does NOT re-throw — audit failure must never break the primary operation.
   *
   * CONCEPTS:
   *   Append-only audit log. Repository pattern. before/after JSON state capture.
   *   Actor context from req.auditContext (populated by auditContext.js middleware).
   *
   * IMPORTED BY:
   *   Every mutating service method. Called explicitly at the end of each mutation.
   *
   * BEFORE: Mutation has completed successfully.
   * AFTER:  One row exists in audit_logs for this action.
   *
   * @param {object} params
   * @param {number}        params.actorId    — admin user ID
   * @param {'CREATE'|'UPDATE'|'DELETE'|'PUBLISH'|'UNPUBLISH'|'LOGIN'} params.action
   * @param {string}        params.entityType — e.g. "DOCUMENT", "FAQ", "AUTH"
   * @param {number|null}   params.entityId   — the mutated entity's ID (null for LOGIN)
   * @param {object|null}   params.before     — entity state before mutation
   * @param {object|null}   params.after      — entity state after mutation
   * @param {string|null}   params.ip         — request IP address
   * @param {string|null}   params.userAgent  — request User-Agent string
   * @returns {Promise<void>}
   */
  async record({ actorId, action, entityType, entityId = null, before = null, after = null, ip = null, userAgent = null }) {
    try {
      const changes = (before !== null || after !== null) ? { before, after } : undefined;

      await auditLogRepository.createAuditLog({
        actor_type: 'ADMIN',
        actor_id: actorId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        changes,
        ip_address: ip ? String(ip).slice(0, 50) : null,
        user_agent: userAgent ? String(userAgent) : null,
      });
    } catch (err) {
      // Audit write failure must not crash the primary operation.
      logger.warn('[AuditService] Failed to write audit log', {
        actorId,
        action,
        entityType,
        entityId,
        error: err.message,
      });
    }
  },
};

module.exports = auditService;
