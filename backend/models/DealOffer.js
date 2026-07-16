const mongoose = require("mongoose");
const { DEAL_OFFER_STATUS, DEAL_OFFER_BY } = require("../constants/dealOfferStatus");

/**
 * DealOffer — one active deal price at a time.
 *
 * offeredPrice  = current deal TOTAL (whoever last offered)
 * lastOfferBy   = 1 buyer | 2 seller
 *
 * status + lastOfferBy:
 *   PENDING  + BUYER  → chờ shop phản hồi giá buyer
 *   PENDING  + SELLER → chờ buyer phản hồi giá shop
 *   ACCEPTED + BUYER  → shop đã chấp nhận giá buyer
 *   ACCEPTED + SELLER → buyer đã chấp nhận giá shop
 *   REJECTED + *      → đã từ chối (thường shop từ chối khi lastOfferBy=BUYER)
 */
const DealOfferSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  variantId: { type: mongoose.Schema.Types.ObjectId, ref: "ProductVariant" },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: "ShopProfile" },
  reservationId: { type: mongoose.Schema.Types.ObjectId, ref: "Reservation" },

  /** Unit list price */
  originalPrice: Number,
  /** Current deal TOTAL from lastOfferBy */
  offeredPrice: Number,
  lastOfferBy: {
    type: Number,
    enum: [DEAL_OFFER_BY.BUYER, DEAL_OFFER_BY.SELLER],
    default: DEAL_OFFER_BY.BUYER,
    index: true,
  },
  discountPercent: Number,

  quantity: { type: Number, default: 1, min: 1 },
  status: { type: Number, default: DEAL_OFFER_STATUS.PENDING, index: true },
  note: String,
  sellerNote: String,

  respondedAt: Date,

  CreatedAt: { type: Date, default: Date.now },
  UpdatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("DealOffer", DealOfferSchema);
