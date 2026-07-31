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

        let description = `${userName} (${userRole.replace('_', ' ')}) performed ${actionName} on ${moduleName}`;

        if (moduleName === 'product' && actionName === 'create' && req.body?.name) {
          description = `${userName} registered new Product asset "${req.body.name}" (Serial: ${req.body.serialNumber || 'N/A'}, Rack: ${req.body.rackNumber || 'RACK-01'})`;
        } else if (moduleName === 'product' && actionName === 'update' && req.body?.name) {
          description = `${userName} updated Product asset details for "${req.body.name}" (Rack: ${req.body.rackNumber || 'RACK-01'})`;
        } else if (moduleName === 'staff' && actionName === 'create' && req.body?.firstName) {
          description = `${userName} created new Staff member account for ${req.body.firstName} ${req.body.lastName} (Role: ${req.body.role})`;
        } else if (moduleName === 'staff' && actionName === 'update' && req.body?.firstName) {
          description = `${userName} updated Staff profile for ${req.body.firstName} ${req.body.lastName}`;
        } else if (moduleName === 'transfer' && actionName === 'assign_imei') {
          description = `${userName} assigned Product to Courier for Transfer (Reason: ${req.body.reason || 'Branch Transfer'})`;
        } else if (req.params.id) {
          description += ` (Ref ID: ${req.params.id})`;
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
