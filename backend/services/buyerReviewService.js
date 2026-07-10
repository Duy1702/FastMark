const BuyerReview = require("../models/BuyerReview");

function createServiceError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function pickString(value) {
  return String(value || "").trim();
}

function normalizeRating(value) {
  const rating = Number(value);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw createServiceError("Vui lòng chọn số sao từ 1 đến 5.");
  }
  return Math.round(rating);
}

async function listBuyerReviews(user) {
  const rows = await BuyerReview.find({ userId: user._id })
    .sort({ CreatedAt: -1 })
    .limit(100);
  return rows.map((row) => row.toClientReview());
}

async function createBuyerReview(user, payload = {}) {
  const rating = normalizeRating(payload.rating);
  const storeId = pickString(payload.storeId);
  if (!storeId) {
    throw createServiceError("Thiếu mã gian hàng.");
  }

  const orderCode = pickString(payload.orderCode);
  if (orderCode) {
    const existing = await BuyerReview.findOne({
      userId: user._id,
      orderCode,
    });
    if (existing) {
      throw createServiceError("Bạn đã đánh giá đơn hàng này.", 409);
    }
  }

  const now = new Date();
  const review = await BuyerReview.create({
    userId: user._id,
    storeId,
    storeName: pickString(payload.storeName),
    productName: pickString(payload.productName),
    orderCode: pickString(payload.orderCode),
    rating,
    comment: pickString(payload.comment),
    imageUrl: pickString(payload.imageUrl),
    CreatedAt: now,
    UpdatedAt: now,
  });

  return review.toClientReview();
}

async function updateBuyerReview(user, reviewId, payload = {}) {
  const review = await BuyerReview.findOne({ _id: reviewId, userId: user._id });
  if (!review) {
    throw createServiceError("Không tìm thấy đánh giá.", 404);
  }

  if (payload.rating !== undefined) {
    review.rating = normalizeRating(payload.rating);
  }
  if (payload.comment !== undefined) {
    review.comment = pickString(payload.comment);
  }
  review.UpdatedAt = new Date();
  await review.save();
  return review.toClientReview();
}

async function deleteBuyerReview(user, reviewId) {
  const review = await BuyerReview.findOneAndDelete({ _id: reviewId, userId: user._id });
  if (!review) {
    throw createServiceError("Không tìm thấy đánh giá.", 404);
  }
  return { id: review._id };
}

module.exports = {
  listBuyerReviews,
  createBuyerReview,
  updateBuyerReview,
  deleteBuyerReview,
};
