import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true
    },
    productId: {
      type: String,
      unique: true,
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductCategory',
      required: true
    },
    serialNumber: {
      type: String,
      unique: true,
      sparse: true
    },
    imei: {
      type: String,
      unique: true,
      sparse: true
    },
    model: String,
    batch: String,
    vendor: String,
    purchaseDate: Date,
    warranty: {
      startDate: Date,
      endDate: Date
    },
    currentBranchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch'
    },
    currentHolderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff'
    },
    status: {
      type: String,
      enum: ['available', 'assigned', 'in_transit', 'delivered', 'missing', 'scrapped'],
      default: 'available'
    },
    qrCode: String,
    rfidTag: {
      type: String,
      unique: true,
      sparse: true
    },
    images: [String],
    specifications: mongoose.Schema.Types.Mixed,
    notes: String,
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: Date,
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff'
    }
  },
  { timestamps: true }
);

productSchema.pre(/^find/, function (next) {
  this.where({ isDeleted: { $ne: true } });
  next();
});

const Product = mongoose.model('Product', productSchema);
export default Product;
