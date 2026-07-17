import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    email: {
      type: String,
      lowercase: true,
      trim: true
    },
    phone: String,
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      pincode: String
    },
    logo: String,
    website: String,
    settings: {
      dateFormat: { type: String, default: 'DD/MM/YYYY' },
      currency: { type: String, default: 'INR' },
      timezone: { type: String, default: 'Asia/Kolkata' }
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    },
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

organizationSchema.pre(/^find/, function (next) {
  this.where({ isDeleted: { $ne: true } });
  next();
});

const Organization = mongoose.model('Organization', organizationSchema);
export default Organization;
