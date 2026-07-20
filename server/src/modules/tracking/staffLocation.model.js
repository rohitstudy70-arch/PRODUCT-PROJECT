import mongoose from 'mongoose';

const staffLocationSchema = new mongoose.Schema(
  {
    dutySessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DutySession',
      required: true
    },
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true
    },
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    },
    accuracy: Number,
    speed: {
      type: Number,
      default: 0
    },
    heading: Number,
    batteryLevel: Number,
    isInternetConnected: {
      type: Boolean,
      default: true
    },
    isGpsEnabled: {
      type: Boolean,
      default: true
    },
    address: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

staffLocationSchema.index({ dutySessionId: 1, timestamp: 1 });
staffLocationSchema.index({ staffId: 1, timestamp: -1 });

const StaffLocation = mongoose.model('StaffLocation', staffLocationSchema);
export default StaffLocation;
