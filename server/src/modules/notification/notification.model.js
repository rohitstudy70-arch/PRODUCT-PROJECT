import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization'
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true
    },
    type: {
      type: String,
      enum: ['transfer_created', 'transfer_approved', 'dispatch_started', 'in_transit', 'goods_received', 'mismatch_detected', 'security_alert', 'system'],
      required: true
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    data: mongoose.Schema.Types.Mixed,
    read: {
      type: Boolean,
      default: false
    },
    readAt: Date,
    link: String
  },
  { timestamps: true }
);

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
