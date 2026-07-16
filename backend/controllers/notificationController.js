const {
  listNotificationsForUser,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  NOTIFICATION_AUDIENCE,
} = require("../services/notificationService");
const { normalizeNotificationAudience } = require("../constants/notificationAudience");
const { success } = require("../utils/apiResponse");

function resolveAudience(req) {
  return normalizeNotificationAudience(
    req.query.audience ?? req.body?.audience,
    NOTIFICATION_AUDIENCE.BUYER
  );
}

exports.listMyNotifications = async (req, res) => {
  const audience = resolveAudience(req);
  const data = await listNotificationsForUser(req.currentUser._id, {
    page: req.query.page,
    limit: req.query.limit,
    audience,
  });

  return success(res, { data });
};

exports.markAsRead = async (req, res) => {
  const audience = resolveAudience(req);
  const notification = await markNotificationAsRead(req.currentUser._id, req.params.id, {
    audience,
  });
  return success(res, {
    message: "Đã đánh dấu đã đọc.",
    data: { notification },
  });
};

exports.markAllAsRead = async (req, res) => {
  const audience = resolveAudience(req);
  const result = await markAllNotificationsAsRead(req.currentUser._id, { audience });
  return success(res, {
    message: "Đã đánh dấu tất cả thông báo là đã đọc.",
    data: result,
  });
};
