import AuditLog from '../modules/audit/auditLog.model.js';
import logger from '../config/logger.js';

export const auditTrail = (moduleName, actionName) => {
  return async (req, res, next) => {
    // Intercept finish event to capture response status
    res.on('finish', async () => {
      try {
        if (res.statusCode >= 400) return; // Only log successful modifications

        const userId = req.user ? req.user._id : null;
        const userName = req.user ? `${req.user.firstName} ${req.user.lastName}` : 'System';
        const userRole = req.user ? req.user.role : 'system';
        const branchId = req.user ? req.user.branchId : null;
        const organizationId = req.user ? req.user.organizationId : null;

        let description = `${userName} performed ${actionName} on ${moduleName}`;
        if (req.params.id) {
          description += ` (ID: ${req.params.id})`;
        }

        await AuditLog.create({
          organizationId,
          userId,
          userName,
          userRole,
          action: actionName,
          module: moduleName,
          entityType: moduleName,
          entityId: req.params.id || null,
          description,
          oldValue: req.body.oldValue || null,
          newValue: req.body ? { ...req.body, password: undefined } : null,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.headers['user-agent'],
          branchId,
          timestamp: new Date()
        });
      } catch (err) {
        logger.error(`Error saving audit log: ${err.message}`);
      }
    });

    next();
  };
};
