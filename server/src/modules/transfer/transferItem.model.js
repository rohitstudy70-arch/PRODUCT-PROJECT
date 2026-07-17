import mongoose from 'mongoose';

const transferItemSchema = new mongoose.Schema(
  {
    transferId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transfer',
      required: true
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'scanned', 'dispatched', 'in_transit', 'received', 'missing', 'extra'],
      default: 'pending'
    }
  },
  { timestamps: true }
);

// Compound index to speed up validation checks
transferItemSchema.index({ transferId: 1, productId: 1 }, { unique: true });

const TransferItem = mongoose.model('TransferItem', transferItemSchema);
export default TransferItem;
