import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization'
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff'
    },
    userName: String,
    userRole: String,
    action: {
      type: String,
      required: true
    },
    module: {
      type: String,
      required: true
    },
    entityType: String,
    entityId: String,
    description: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String,
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: false }
);

auditLogSchema.pre('findOneAndUpdate', function() {
  throw new Error('Audit logs are immutable and cannot be updated.');
});
auditLogSchema.pre('updateOne', function() {
  throw new Error('Audit logs are immutable and cannot be updated.');
});
auditLogSchema.pre('updateMany', function() {
  throw new Error('Audit logs are immutable and cannot be updated.');
});
auditLogSchema.pre('deleteOne', function() {
  throw new Error('Audit logs are immutable and cannot be deleted.');
});
auditLogSchema.pre('deleteMany', function() {
  throw new Error('Audit logs are immutable and cannot be deleted.');
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
