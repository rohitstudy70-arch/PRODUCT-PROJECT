import mongoose from 'mongoose';

const securityScanSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization'
    },
    transferId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transfer',
      required: true
    },
    type: {
      type: String,
      enum: ['exit', 'entry'],
      required: true
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch'
    },
    gateNumber: String,
    securityGuardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true
    },
    staffQR: {
      scanned: { type: Boolean, default: false },
      valid: Boolean,
      staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' }
    },
    productsScanned: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        productQR: String,
        valid: Boolean,
        status: String
      }
    ],
    result: {
      type: String,
      enum: ['approved', 'rejected'],
      required: true
    },
    mismatches: {
      missing: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
      extra: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }]
    },
    notes: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: false }
);

securityScanSchema.pre('findOneAndUpdate', function() {
  throw new Error('Security scans are immutable and cannot be updated.');
});
securityScanSchema.pre('updateOne', function() {
  throw new Error('Security scans are immutable and cannot be updated.');
});
securityScanSchema.pre('updateMany', function() {
  throw new Error('Security scans are immutable and cannot be updated.');
});
securityScanSchema.pre('deleteOne', function() {
  throw new Error('Security scans are immutable and cannot be deleted.');
});
securityScanSchema.pre('deleteMany', function() {
  throw new Error('Security scans are immutable and cannot be deleted.');
});

const SecurityScan = mongoose.model('SecurityScan', securityScanSchema);
export default SecurityScan;
