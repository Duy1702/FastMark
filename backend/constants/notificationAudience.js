const NOTIFICATION_AUDIENCE = {
  BUYER: "buyer",
  SELLER: "seller",
  /** Hiện ở cả chế độ buyer và seller (thông báo hệ thống/tài khoản). */
  SYSTEM: "system",
};

function normalizeNotificationAudience(value, fallback = NOTIFICATION_AUDIENCE.SYSTEM) {
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  if (Object.values(NOTIFICATION_AUDIENCE).includes(raw)) {
    return raw;
  }
  return fallback;
}

module.exports = {
  NOTIFICATION_AUDIENCE,
  normalizeNotificationAudience,
};
