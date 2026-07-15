const {
  listNotificationsForUser,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} = require("../services/notificationService");
const { success } = require("../utils/apiResponse");

exports.listMyNotifications = async (req, res) => {
  const data = await listNotificationsForUser(req.currentUser._id, {
    page: req.query.page,
    limit: req.query.limit,
  });

  return success(res, { data });
};

exports.markAsRead = async (req, res) => {
  const notification = await markNotificationAsRead(req.currentUser._id, req.params.id);
  return success(res, {
    message: "Đã đánh dấu đã đọc.",
    data: { notification },
  });
};

exports.markAllAsRead = async (req, res) => {
  const result = await markAllNotificationsAsRead(req.currentUser._id);
  return success(res, {
    message: "Đã đánh dấu tất cả thông báo là đã đọc.",
    data: result,
  });
};
