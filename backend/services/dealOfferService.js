const DealOffer = require("../models/DealOffer");
const Product = require("../models/Product");
const ProductVariant = require("../models/ProductVariant");
const Conversation = require("../models/Conversation");
const User = require("../models/User");
const { DEAL_OFFER_STATUS, DEAL_OFFER_BY } = require("../constants/dealOfferStatus");
const { MESSAGE_TYPE } = require("../constants/messageType");
const { formatSellerCounterMessageContent } = require("../utils/offerMessageFormat");
const { resolveDealMoney } = require("../utils/dealPricing");
const { getShopForSeller } = require("./shopSettingsService");
const { createNotification } = require("./notificationService");
const { NOTIFICATION_AUDIENCE } = require("../constants/notificationAudience");
const messageService = require("./messageService");

function createServiceError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function pickNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : NaN;
}

function toSellerDeal(deal) {
  return {
    id: deal._id,
    status: deal.status,
    originalPrice: deal.originalPrice || 0,
    offeredPrice: deal.offeredPrice || 0,
    quantity: Number(deal.quantity) || 1,
    lastOfferBy: Number(deal.lastOfferBy) || DEAL_OFFER_BY.BUYER,
    discountPercent: deal.discountPercent || 0,
    note: deal.note || "",
    sellerNote: deal.sellerNote || "",
    respondedAt: deal.respondedAt || null,
    createdAt: deal.CreatedAt,
    productId: deal.productId,
    variantId: deal.variantId,
    userId: deal.userId,
    reservationId: deal.reservationId || null,
  };
}

async function getOwnedDeal(user, dealId) {
  const shop = await getShopForSeller(user);
  const deal = await DealOffer.findOne({ _id: dealId, shopId: shop._id });
  if (!deal) {
    throw createServiceError("Không tìm thấy deal giá.", 404);
  }
  return { shop, deal };
}

async function listSellerDeals(user, { status } = {}) {
  const shop = await getShopForSeller(user);
  const query = { shopId: shop._id };
  if (status !== undefined && status !== null && status !== "") {
    query.status = Number(status);
  }

  const deals = await DealOffer.find(query).sort({ CreatedAt: -1 }).limit(100);
  return deals.map(toSellerDeal);
}

async function acceptDealOffer(user, dealId) {
  const { deal } = await getOwnedDeal(user, dealId);

  if (deal.status !== DEAL_OFFER_STATUS.PENDING) {
    throw createServiceError("Deal này đã được xử lý.");
  }
  if (Number(deal.lastOfferBy) !== DEAL_OFFER_BY.BUYER) {
    throw createServiceError("Đang chờ khách phản hồi giá của shop.");
  }

  const variant = await ProductVariant.findById(deal.variantId);
  if (!variant) {
    throw createServiceError("Biến thể sản phẩm không tồn tại.");
  }

  const finalPrice = resolveDealMoney(deal).agreedTotal;
  const now = new Date();

  deal.status = DEAL_OFFER_STATUS.ACCEPTED;
  deal.respondedAt = now;
  deal.reservationId = null;
  deal.UpdatedAt = now;
  await deal.save();

  const buyer = await User.findById(deal.userId);
  if (buyer) {
    await createNotification(buyer._id, {
      title: "Shop chấp nhận deal giá",
      content: `Shop đã chấp nhận mức giá ${Number(finalPrice).toLocaleString("vi-VN")}đ. Hãy giữ hàng hoặc deal giá lại trong mục Đơn hàng.`,
      audience: NOTIFICATION_AUDIENCE.BUYER,
    });
  }

  return {
    deal: {
      id: deal._id,
      status: deal.status,
      lastOfferBy: deal.lastOfferBy,
      reservationId: null,
      finalPrice,
    },
  };
}

async function rejectDealOffer(user, dealId, { reason } = {}) {
  const { deal } = await getOwnedDeal(user, dealId);

  if (deal.status !== DEAL_OFFER_STATUS.PENDING) {
    throw createServiceError("Deal này đã được xử lý.");
  }

  const now = new Date();
  deal.status = DEAL_OFFER_STATUS.REJECTED;
  deal.respondedAt = now;
  deal.sellerNote = reason || deal.sellerNote || "";
  deal.UpdatedAt = now;
  await deal.save();

  return {
    id: deal._id,
    status: deal.status,
    lastOfferBy: deal.lastOfferBy,
  };
}

async function sendSellerCounterChatMessage(sellerUser, shop, deal, previousOfferPrice) {
  const product = await Product.findById(deal.productId);
  const money = resolveDealMoney(deal);
  const content = formatSellerCounterMessageContent({
    productName: product?.ProductName || "",
    originalPrice: money.originalTotal,
    previousOfferPrice,
    offeredPrice: money.offeredTotal,
    quantity: money.qty,
    note: deal.sellerNote || "",
  });

  let conversation = await Conversation.findOne({
    shopId: shop._id,
    userId: deal.userId,
  });

  const now = new Date();
  if (!conversation) {
    conversation = await Conversation.create({
      shopId: shop._id,
      userId: deal.userId,
      lastMessage: "",
      lastMessageAt: now,
      CreatedAt: now,
      UpdatedAt: now,
    });
  }

  await messageService.sendSellerMessage(sellerUser, conversation._id, {
    content,
    messageType: MESSAGE_TYPE.OFFER,
  });
}

async function counterDealOffer(user, dealId, payload) {
  const { shop, deal } = await getOwnedDeal(user, dealId);

  if (deal.status !== DEAL_OFFER_STATUS.PENDING) {
    throw createServiceError("Deal này đã được xử lý.");
  }
  if (Number(deal.lastOfferBy) !== DEAL_OFFER_BY.BUYER) {
    throw createServiceError("Đang chờ khách phản hồi. Không thể trả giá thêm lúc này.");
  }

  const counterPrice = pickNumber(payload.counterPrice ?? payload.sellerCounterPrice ?? payload.offeredPrice);
  if (!Number.isFinite(counterPrice) || counterPrice <= 0) {
    throw createServiceError("Giá đề xuất không hợp lệ.");
  }

  const money = resolveDealMoney(deal);
  const previousOfferPrice = money.offeredTotal;

  if (counterPrice <= previousOfferPrice) {
    throw createServiceError("Giá đề xuất phải cao hơn tổng giá khách đề nghị.");
  }
  if (counterPrice >= money.originalTotal) {
    throw createServiceError("Giá đề xuất phải thấp hơn tổng niêm yết.");
  }

  const now = new Date();
  deal.offeredPrice = counterPrice;
  deal.lastOfferBy = DEAL_OFFER_BY.SELLER;
  deal.sellerNote = String(payload.note || payload.sellerNote || "").trim();
  deal.discountPercent = Math.round(
    ((money.originalTotal - counterPrice) / money.originalTotal) * 10000
  ) / 100;
  deal.respondedAt = now;
  deal.UpdatedAt = now;
  await deal.save();

  const buyer = await User.findById(deal.userId);
  if (buyer) {
    await createNotification(buyer._id, {
      title: "Shop trả giá",
      content: `Shop đề xuất tổng ${Number(counterPrice).toLocaleString("vi-VN")}đ. Bạn có thể chấp nhận hoặc đề nghị lại trong mục Đơn hàng.`,
      audience: NOTIFICATION_AUDIENCE.BUYER,
    });
  }

  await sendSellerCounterChatMessage(user, shop, deal, previousOfferPrice);

  return toSellerDeal(deal);
}

module.exports = {
  listSellerDeals,
  acceptDealOffer,
  rejectDealOffer,
  counterDealOffer,
};
