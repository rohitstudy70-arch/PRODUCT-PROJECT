import mongoose from 'mongoose';

const stockMovementSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
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
    type: {
      type: String,
      enum: ['transfer_out', 'transfer_in', 'adjustment', 'initial', 'return', 'scrap'],
      required: true
    },
    quantity: {
      type: Number,
      default: 1
    },
    transferId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transfer'
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff'
    },
    notes: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: false }
);

stockMovementSchema.pre('findOneAndUpdate', function() {
  throw new Error('Stock movements are immutable and cannot be updated.');
});
stockMovementSchema.pre('updateOne', function() {
  throw new Error('Stock movements are immutable and cannot be updated.');
});
stockMovementSchema.pre('updateMany', function() {
  throw new Error('Stock movements are immutable and cannot be updated.');
});
stockMovementSchema.pre('deleteOne', function() {
  throw new Error('Stock movements are immutable and cannot be deleted.');
});
stockMovementSchema.pre('deleteMany', function() {
  throw new Error('Stock movements are immutable and cannot be deleted.');
});

const StockMovement = mongoose.model('StockMovement', stockMovementSchema);
export default StockMovement;
