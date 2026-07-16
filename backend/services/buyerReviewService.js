const crypto = require("crypto");
const Review = require("../models/Review");
const Reservation = require("../models/Reservation");
const ShopProfile = require("../models/ShopProfile");
const { uploadImageToSupabase, resolveFileExtension } = require("./uploadService");

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

function normalizeObjectIdString(value) {
  if (value == null) {
    return "";
  }

  if (typeof value === "object" && value._id) {
    return pickString(value._id);
  }

  const normalized = pickString(value);
  if (!normalized || normalized === "[object Object]") {
    return "";
  }

  return normalized;
}

function isStrictMongoObjectId(value) {
  return /^[a-f\d]{24}$/i.test(normalizeObjectIdString(value));
}

async function findShopByObjectId(id) {
  if (!isStrictMongoObjectId(id)) {
    return null;
  }

  return ShopProfile.findById(id).lean();
}

async function resolveShopProfile(user, { storeId, orderCode, storeName } = {}) {
  const normalizedStoreId = normalizeObjectIdString(storeId);
  if (normalizedStoreId) {
    const shopByObjectId = await findShopByObjectId(normalizedStoreId);
    if (shopByObjectId) {
      return shopByObjectId;
    }
  }

  const normalizedOrderCode = normalizeObjectIdString(orderCode);
  if (isStrictMongoObjectId(normalizedOrderCode) && user?._id) {
    const reservation = await Reservation.findOne({
      _id: normalizedOrderCode,
      userId: user._id,
    }).lean();

    if (reservation?.shopId) {
      const shop = await findShopByObjectId(String(reservation.shopId));
      if (shop) {
        return shop;
      }
    }
  }

  if (storeName) {
    throw createServiceError("Không tìm thấy gian hàng để đánh giá.", 404);
  }

  throw createServiceError("Không tìm thấy gian hàng để đánh giá.", 404);
}

async function resolveReviewImageUrl(imageInput) {
  const raw = pickString(imageInput);
  if (!raw) {
    return "";
  }

  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  const match = raw.match(/^data:(image\/[^;]+);base64,(.+)$/);
  if (!match) {
    return raw;
  }

  const mimeType = match[1];
  const buffer = Buffer.from(match[2], "base64");
  const uploaded = await uploadImageToSupabase({
    buffer,
    mimeType,
    folder: "review-images",
    fileName: `review-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${resolveFileExtension(mimeType)}`,
  });

  return uploaded.publicUrl;
}

async function refreshShopReviewStats(storeId) {
  const normalizedStoreId = normalizeObjectIdString(storeId);
  if (!normalizedStoreId || !isStrictMongoObjectId(normalizedStoreId)) {
    return null;
  }

  const shop = await ShopProfile.findById(normalizedStoreId);
  if (!shop) {
    return null;
  }

  const reviews = await Review.find({
    storeId: normalizedStoreId,
    isDeleted: { $ne: true },
    isHidden: { $ne: true },
  }).lean();

  const total = reviews.length;
  const averageRating =
    total > 0
      ? Math.round((reviews.reduce((sum, row) => sum + Number(row.rating || 0), 0) / total) * 10) /
        10
      : 0;

  shop.totalReviews = total;
  shop.averageRating = averageRating;
  shop.UpdatedAt = new Date();
  await shop.save();
  return shop;
}

async function listBuyerReviews(user) {
  const rows = await Review.find({
    userId: user._id,
    isDeleted: { $ne: true },
  })
    .sort({ CreatedAt: -1 })
    .limit(100);
  return rows.map((row) => row.toBuyerClient());
}

async function createBuyerReview(user, payload = {}) {
  const rating = normalizeRating(payload.rating);
  const orderCode = pickString(payload.orderCode);
  const shop = await resolveShopProfile(user, {
    storeId: payload.storeId,
    orderCode,
    storeName: pickString(payload.storeName),
  });
  const storeId = String(shop._id);

  if (orderCode) {
    const existing = await Review.findOne({
      userId: user._id,
      orderCode,
      isDeleted: { $ne: true },
    });
    if (existing) {
      throw createServiceError("Bạn đã đánh giá đơn hàng này.", 409);
    }
  }

  const imageUrl = await resolveReviewImageUrl(payload.imageUrl);
  const now = new Date();
  const userName = pickString(user.FullName) || pickString(user.UserName) || "Khách hàng";

  const review = await Review.create({
    userId: user._id,
    storeId,
    storeName: pickString(payload.storeName) || pickString(shop.shopName),
    productName: pickString(payload.productName),
    orderCode,
    userName,
    rating,
    comment: pickString(payload.comment),
    imageUrl,
    isHidden: false,
    isDeleted: false,
    CreatedAt: now,
    UpdatedAt: now,
  });

  review.legacyExternalId = `buyer-${review._id}`;
  await review.save();

  await refreshShopReviewStats(storeId);
  return review.toBuyerClient();
}

async function updateBuyerReview(user, reviewId, payload = {}) {
  const review = await Review.findOne({
    _id: reviewId,
    userId: user._id,
    isDeleted: { $ne: true },
  });
  if (!review) {
    throw createServiceError("Không tìm thấy đánh giá.", 404);
  }

  if (payload.rating !== undefined) {
    review.rating = normalizeRating(payload.rating);
  }
  if (payload.comment !== undefined) {
    review.comment = pickString(payload.comment);
  }
  if (payload.imageUrl !== undefined) {
    review.imageUrl = await resolveReviewImageUrl(payload.imageUrl);
  }
  review.UpdatedAt = new Date();
  await review.save();

  await refreshShopReviewStats(review.storeId);
  return review.toBuyerClient();
}

async function deleteBuyerReview(user, reviewId) {
  const review = await Review.findOne({
    _id: reviewId,
    userId: user._id,
    isDeleted: { $ne: true },
  });
  if (!review) {
    throw createServiceError("Không tìm thấy đánh giá.", 404);
  }

  const now = new Date();
  review.isDeleted = true;
  review.isHidden = true;
  review.deletedAt = now;
  review.UpdatedAt = now;
  await review.save();

  await refreshShopReviewStats(review.storeId);
  return { id: String(review._id) };
}

module.exports = {
  listBuyerReviews,
  createBuyerReview,
  updateBuyerReview,
  deleteBuyerReview,
  refreshShopReviewStats,
};
