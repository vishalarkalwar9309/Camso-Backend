'use strict';

/**
 * src/core/middleware/auditContext.js
 *
 * Express middleware that attaches audit context (actor identity, IP, User-Agent)
 * to every /admin/* request.
 */

function auditContext(req, res, next) {
  const actor = req.admin || req.user || null;

  req.auditContext = {
    actorId: actor ? actor.id : null,
    role: actor ? actor.role : null,
    ip: req.headers['x-forwarded-for']
      ? req.headers['x-forwarded-for'].split(',')[0].trim()
      : req.ip,
    userAgent: req.headers['user-agent'] || null,
  };

  return next();
}

module.exports = auditContext;
