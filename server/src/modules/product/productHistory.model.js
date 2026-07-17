import mongoose from 'mongoose';

const productHistorySchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    action: {
      type: String,
      enum: ['created', 'transferred_out', 'transferred_in', 'dispatched', 'in_transit', 'received', 'assigned', 'returned', 'scrapped', 'missing'],
      required: true
    },
    fromBranchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch'
    },
    toBranchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch'
    },
    transferId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transfer'
    },
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff'
    },
    securityGuardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff'
    },
    gateNumber: String,
    notes: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: false }
);

// Block updates and deletes at the Mongoose level
productHistorySchema.pre('findOneAndUpdate', function() {
  throw new Error('Product history records are immutable and cannot be updated.');
});
productHistorySchema.pre('updateOne', function() {
  throw new Error('Product history records are immutable and cannot be updated.');
});
productHistorySchema.pre('updateMany', function() {
  throw new Error('Product history records are immutable and cannot be updated.');
});
productHistorySchema.pre('deleteOne', function() {
  throw new Error('Product history records are immutable and cannot be deleted.');
});
productHistorySchema.pre('deleteMany', function() {
  throw new Error('Product history records are immutable and cannot be deleted.');
});

const ProductHistory = mongoose.model('ProductHistory', productHistorySchema);
export default ProductHistory;
