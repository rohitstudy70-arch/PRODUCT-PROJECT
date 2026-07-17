import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true
    },
    refreshToken: {
      type: String,
      required: true
    },
    deviceInfo: String,
    ipAddress: String,
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 } // auto TTL index
    }
  },
  { timestamps: true }
);

const Session = mongoose.model('Session', sessionSchema);
export default Session;
