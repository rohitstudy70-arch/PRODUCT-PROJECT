import mongoose from 'mongoose';

const qrCodeSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization'
    },
    entityType: {
      type: String,
      enum: ['staff', 'product'],
      required: true
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    code: {
      type: String,
      required: true,
      unique: true // UUID code
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'revoked'],
      default: 'active'
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true
    },
    scanHistory: [
      {
        scannedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Staff'
        },
        scannedAt: {
          type: Date,
          default: Date.now
        },
        location: String,
        purpose: String
      }
    ]
  },
  { timestamps: true }
);

const QRCode = mongoose.model('QRCode', qrCodeSchema);
export default QRCode;
