const AuditLog = require('../models/AuditLog');
const logger = require('./logger');

// Append-only audit trail for admin actions. Best-effort: a logging failure
// must never block the action it's recording, so errors are swallowed (and
// logged) rather than thrown.
async function recordAudit(req, { action, entityType, entityId, before, after }) {
  try {
    await AuditLog.create({
      actor: req.user._id,
      action,
      entityType,
      entityId,
      before,
      after,
      ip: req.ip,
    });
  } catch (err) {
    logger.error(`Audit log write failed for ${action} on ${entityType}:${entityId}: ${err.message}`);
  }
}

module.exports = { recordAudit };
