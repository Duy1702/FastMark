const mongoose = require("mongoose");
const { NOTIFICATION_AUDIENCE } = require("../constants/notificationAudience");

const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },

  title: String,
  content: String,

  /** buyer | seller | system — tách thông báo gian hàng khỏi người mua */
  audience: {
    type: String,
    enum: Object.values(NOTIFICATION_AUDIENCE),
    default: NOTIFICATION_AUDIENCE.SYSTEM,
    index: true,
  },

  isRead: { type: Number, default: 0 },

  CreatedAt: { type: Date, default: Date.now },
  UpdatedAt: { type: Date, default: Date.now },
});

NotificationSchema.index({ userId: 1, audience: 1, CreatedAt: -1 });

module.exports = mongoose.model("Notification", NotificationSchema);
