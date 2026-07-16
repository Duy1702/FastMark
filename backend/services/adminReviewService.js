const Review = require("../models/Review");
const ShopProfile = require("../models/ShopProfile");
const User = require("../models/User");
const { refreshShopReviewStats } = require("./buyerReviewService");

function createServiceError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function pickString(value) {
  return String(value || "").trim();
}

function isStrictMongoObjectId(value) {
  return /^[a-f\d]{24}$/i.test(pickString(value));
}

function pickShopDisplayName(shop) {
  if (!shop) {
    return "";
  }
  return pickString(shop.shopName) || pickString(shop.description);
}

async function loadShopNameMap(storeIds) {
  const uniqueIds = [...new Set(storeIds.filter(Boolean).map(String))];
  if (!uniqueIds.length) {
    return new Map();
  }

  const objectIds = uniqueIds.filter(isStrictMongoObjectId);
  const externalIds = uniqueIds.filter((id) => !isStrictMongoObjectId(id));
  const query = [];

  if (objectIds.length) {
    query.push({ _id: { $in: objectIds } });
  }
  if (externalIds.length) {
    query.push({ externalRestaurantId: { $in: externalIds } });
  }

  const shops = query.length ? await ShopProfile.find({ $or: query }).lean() : [];
  const shopNameByKey = new Map();

  shops.forEach((shop) => {
    const displayName = pickShopDisplayName(shop);
    if (!displayName) {
      return;
    }
    shopNameByKey.set(String(shop._id), displayName);
    if (shop.externalRestaurantId) {
      shopNameByKey.set(String(shop.externalRestaurantId), displayName);
    }
  });

  return shopNameByKey;
}

function resolveShopName(storeId, shopNameByKey) {
  const normalized = pickString(storeId);
  if (!normalized) {
    return "";
  }
  return shopNameByKey.get(normalized) || "";
}

function toReviewerSummary(user, fallbackName = "") {
  if (user) {
    return {
      fullName: pickString(user.FullName) || pickString(user.UserName) || fallbackName || "Khách hàng",
      email: pickString(user.Email),
      userName: pickString(user.UserName),
    };
  }

  return {
    fullName: fallbackName || "Khách hàng",
    email: "",
    userName: "",
  };
}

async function buildReviewFilter({ search, rating, status }) {
  const filter = {
    isDeleted: { $ne: true },
    legacyExternalId: { $not: /^seed-admin-review/i },
  };
  const normalizedRating = pickString(rating);
  const normalizedStatus = pickString(status);
  const keyword = pickString(search);

  if (normalizedRating !== "" && Number(normalizedRating) >= 1 && Number(normalizedRating) <= 5) {
    filter.rating = Number(normalizedRating);
  }

  if (normalizedStatus === "visible") {
    filter.isHidden = { $ne: true };
  } else if (normalizedStatus === "hidden") {
    filter.isHidden = true;
  }

  if (!keyword) {
    return filter;
  }

  const regex = new RegExp(escapeRegex(keyword), "i");
  const [matchedUsers, matchedShops] = await Promise.all([
    User.find({
      $or: [{ UserName: regex }, { FullName: regex }, { Email: regex }],
    })
      .select("_id")
      .lean(),
    ShopProfile.find({
      $or: [{ shopName: regex }, { description: regex }, { externalRestaurantId: regex }],
    })
      .select("_id externalRestaurantId")
      .lean(),
  ]);

  const userIds = matchedUsers.map((user) => user._id);
  const storeIds = matchedShops.flatMap((shop) =>
    [String(shop._id), shop.externalRestaurantId].filter(Boolean)
  );

  filter.$or = [
    { comment: regex },
    { userName: regex },
    { productName: regex },
    { storeName: regex },
    ...(userIds.length ? [{ userId: { $in: userIds } }] : []),
    ...(storeIds.length ? [{ storeId: { $in: [...new Set(storeIds)] } }] : []),
  ];

  return filter;
}

async function enrichReviews(reviews) {
  const userIds = reviews.map((row) => row.userId).filter(Boolean);
  const users = userIds.length ? await User.find({ _id: { $in: userIds } }).lean() : [];
  const userById = new Map(users.map((user) => [String(user._id), user]));

  const storeIds = reviews.map((review) => review.storeId).filter(Boolean);
  const shopNameByKey = await loadShopNameMap(storeIds);

  return reviews.map((review) => {
    const user = review.userId ? userById.get(String(review.userId)) : null;
    const shopName =
      pickString(review.storeName) || resolveShopName(review.storeId, shopNameByKey);

    return {
      id: String(review._id),
      legacyExternalId: pickString(review.legacyExternalId),
      reviewer: toReviewerSummary(user, review.userName),
      productName: pickString(review.productName) || "—",
      shopName: shopName || "—",
      rating: review.rating,
      comment: review.comment || "",
      imageUrl: review.imageUrl || "",
      createdAt: review.CreatedAt || null,
      isHidden: Boolean(review.isHidden),
      deletedAt: review.deletedAt || null,
    };
  });
}

async function listReviews({
  search = "",
  rating = "",
  status = "",
  page = 1,
  limit = 20,
} = {}) {
  const currentPage = Math.max(1, Number(page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (currentPage - 1) * pageSize;
  const filter = await buildReviewFilter({ search, rating, status });

  const [reviews, total] = await Promise.all([
    Review.find(filter).sort({ CreatedAt: -1 }).skip(skip).limit(pageSize).lean(),
    Review.countDocuments(filter),
  ]);

  const items = await enrichReviews(reviews);

  return {
    items,
    pagination: {
      page: currentPage,
      limit: pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
    meta: {
      dataSource: "mongodb",
      collection: "reviews",
    },
  };
}

async function findReviewByPublicId(publicId) {
  const normalized = pickString(publicId);
  if (!normalized) {
    throw createServiceError("Không tìm thấy đánh giá.", 404);
  }

  const query = isStrictMongoObjectId(normalized)
    ? { $or: [{ _id: normalized }, { legacyExternalId: normalized }] }
    : { legacyExternalId: normalized };

  const review = await Review.findOne(query);
  if (!review) {
    throw createServiceError("Không tìm thấy đánh giá.", 404);
  }
  return review;
}

async function setReviewVisibility(publicId, isHidden) {
  const review = await findReviewByPublicId(publicId);
  if (review.isDeleted) {
    throw createServiceError("Đánh giá đã bị xóa mềm.", 400);
  }

  review.isHidden = Boolean(isHidden);
  review.UpdatedAt = new Date();
  await review.save();
  await refreshShopReviewStats(review.storeId);

  const [item] = await enrichReviews([review.toObject()]);
  return item;
}

async function softDeleteReview(publicId) {
  const review = await findReviewByPublicId(publicId);
  if (review.isDeleted) {
    throw createServiceError("Đánh giá đã bị xóa mềm.", 400);
  }

  const now = new Date();
  review.isDeleted = true;
  review.isHidden = true;
  review.deletedAt = now;
  review.UpdatedAt = now;
  await review.save();
  await refreshShopReviewStats(review.storeId);

  return { id: String(review._id), deletedAt: now };
}

module.exports = {
  listReviews,
  setReviewVisibility,
  softDeleteReview,
  findReviewByPublicId,
};
