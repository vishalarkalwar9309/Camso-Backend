'use strict';

/**
 * src/core/middleware/auditContext.js
 *
 * WHAT THIS FILE DOES:
 *   Express middleware that attaches audit context (actor identity, IP, User-Agent)
 *   to every /admin/* request. Does NOT write to audit_logs — only prepares context.
 *
 * OVERALL DESIGN:
 *   Runs after adminGuard on /admin/* routes.
 *   Populates req.auditContext so that service methods have everything
 *   they need to call auditService.record() without querying the request again.
 *
 * CRITICAL RULE (master plan Section 11):
 *   This middleware does NOT write to audit_logs.
 *   Writing is the service's responsibility because only the service
 *   has the before/after state of the mutated entity.
 *
 * ELEMENTS:
 *   auditContext(req, res, next) — attaches req.auditContext
 *
 * FINAL OUTPUT:
 *   module.exports = auditContext
 *
 * IMPORTED BY:
 *   src/routes/index.js (applied to all /admin/* routes as a group, after adminGuard)
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 11 (Audit architecture)
 *            docs/CAMSO_Backend_Plan_Aary.md Section 2 (auditContext.js)
 */

/**
 * auditContext
 *
 * USE: Attaches audit context to req for use by downstream service methods.
 *
 * HOW IT WORKS:
 *   Reads actorId from req.admin (set by adminGuard).
 *   Reads ip and userAgent from the request.
 *   Attaches { actorId, role, ip, userAgent } as req.auditContext.
 *
 * CONCEPTS:
 *   Middleware context propagation.
 *   IP extraction: supports X-Forwarded-For for proxied deployments (Render).
 *
 * SERVICE USAGE PATTERN:
 *   At end of each mutating service method:
 *   await auditService.record({
 *     actorId: req.auditContext.actorId,
 *     action: 'UPDATE',
 *     entityType: 'DOCUMENT',
 *     entityId: document.id,
 *     before: beforeState,
 *     after: afterState,
 *     ip: req.auditContext.ip,
 *     userAgent: req.auditContext.userAgent,
 *   });
 *
 * BEFORE: req.auditContext undefined.
 * AFTER:  req.auditContext = { actorId, role, ip, userAgent }
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function auditContext(req, res, next) {
  const actor = req.admin || null;

  req.auditContext = {
    actorId: actor ? actor.id : null,
    role: actor ? actor.role : null,
    // Support proxied deployments (Render uses X-Forwarded-For)
    ip: req.headers['x-forwarded-for']
      ? req.headers['x-forwarded-for'].split(',')[0].trim()
      : req.ip,
    userAgent: req.headers['user-agent'] || null,
  };

  return next();
}

module.exports = auditContext;
