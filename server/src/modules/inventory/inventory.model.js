import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      unique: true // Compound unique at DB level is handled since it is one product per inventory item
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch'
    },
    status: {
      type: String,
      enum: ['available', 'reserved', 'in_transit'],
      default: 'available'
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff'
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff'
    }
  },
  { timestamps: true }
);

const Inventory = mongoose.model('Inventory', inventorySchema);
export default Inventory;
