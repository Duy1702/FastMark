const mongoose = require("mongoose");

/**
 * Unified shop review model.
 * Public store listing, buyer "my reviews", and admin moderation all use this collection.
 */
const ReviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },

  storeId: { type: String, required: true, index: true },
  storeName: { type: String, default: "" },
  productName: { type: String, default: "" },
  orderCode: { type: String, default: "", index: true },

  userName: { type: String, default: "Khách hàng" },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: "" },
  /** Optional single image attached by the buyer */
  imageUrl: { type: String, default: "" },

  isHidden: { type: Boolean, default: false, index: true },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },

  /** Legacy public id (e.g. buyer-<ObjectId>) for old admin/report links */
  legacyExternalId: { type: String, default: "", index: true, sparse: true },

  CreatedAt: { type: Date, default: Date.now },
  UpdatedAt: { type: Date, default: Date.now },
});

ReviewSchema.methods.toBuyerClient = function toBuyerClient() {
  return {
    id: String(this._id),
    storeId: this.storeId || "",
    storeName: this.storeName || "",
    productName: this.productName || "",
    orderCode: this.orderCode || "",
    rating: this.rating,
    comment: this.comment || "",
    imageUrl: this.imageUrl || "",
    createdAt: this.CreatedAt || null,
  };
};

ReviewSchema.methods.toPublicClient = function toPublicClient() {
  return {
    id: String(this._id),
    store_id: this.storeId || "",
    user_name: this.userName || "Khách hàng",
    rating: this.rating,
    comment: this.comment || "",
    image_url: this.imageUrl || "",
    imageUrl: this.imageUrl || "",
    created_at: this.CreatedAt || null,
    createdAt: this.CreatedAt || null,
  };
};

module.exports = mongoose.model("Review", ReviewSchema);
