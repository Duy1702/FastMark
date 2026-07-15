const express = require("express");
const verifyFirebaseToken = require("../middleware/authMiddleware");
const asyncHandler = require("../utils/asyncHandler");
const notificationController = require("../controllers/notificationController");

const router = express.Router();

router.get(
  "/",
  verifyFirebaseToken,
  asyncHandler(notificationController.listMyNotifications)
);

router.post(
  "/read-all",
  verifyFirebaseToken,
  asyncHandler(notificationController.markAllAsRead)
);

router.post(
  "/:id/read",
  verifyFirebaseToken,
  asyncHandler(notificationController.markAsRead)
);

module.exports = router;
