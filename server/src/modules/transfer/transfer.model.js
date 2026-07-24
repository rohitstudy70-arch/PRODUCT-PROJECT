import mongoose from 'mongoose';

const transferSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true
    },
    transferId: {
      type: String,
      unique: true,
      required: true
    },
    fromBranchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true
    },
    toBranchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true
    },
    assignedStaffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff'
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'preparing', 'ready_for_dispatch', 'dispatched', 'in_transit', 'arrived', 'received', 'cancelled', 'rejected'],
      default: 'pending'
    },
    notes: String,
    reason: {
      type: String,
      default: 'Branch Transfer'
    },
    expectedDeliveryDate: Date,
    remarks: String,
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff'
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff'
    },
    approvedAt: Date,
    dispatchedAt: Date,
    receivedAt: Date,
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff'
    },
    totalItems: {
      type: Number,
      default: 0
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true
    }
  },
  { timestamps: true }
);

transferSchema.virtual('items', {
  ref: 'TransferItem',
  localField: '_id',
  foreignField: 'transferId'
});

transferSchema.set('toJSON', { virtuals: true });
transferSchema.set('toObject', { virtuals: true });

const Transfer = mongoose.model('Transfer', transferSchema);
export default Transfer;
