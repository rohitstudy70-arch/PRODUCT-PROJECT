import mongoose from 'mongoose';

const dutySessionSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true
    },
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true
    },
    startTime: {
      type: Date,
      default: Date.now,
      required: true
    },
    endTime: Date,
    status: {
      type: String,
      enum: ['ON_DUTY', 'OFF_DUTY', 'PAUSED'],
      default: 'ON_DUTY',
      required: true
    },
    exitGateNumber: {
      type: String,
      default: 'Gate 1'
    },
    entryGateNumber: String,
    totalDistanceKm: {
      type: Number,
      default: 0
    },
    totalStops: {
      type: Number,
      default: 0
    },
    movingTimeMinutes: {
      type: Number,
      default: 0
    },
    idleTimeMinutes: {
      type: Number,
      default: 0
    },
    notes: String
  },
  {
    timestamps: true
  }
);

dutySessionSchema.index({ staffId: 1, status: 1 });
dutySessionSchema.index({ branchId: 1, startTime: -1 });

const DutySession = mongoose.model('DutySession', dutySessionSchema);
export default DutySession;
