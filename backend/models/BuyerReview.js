const mongoose = require("mongoose");

const BuyerReviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  storeId: { type: String, required: true, index: true },
  storeName: { type: String, default: "" },
  productName: { type: String, default: "" },
  orderCode: { type: String, default: "" },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: "" },
  imageUrl: { type: String, default: "" },
  CreatedAt: { type: Date, default: Date.now },
  UpdatedAt: { type: Date, default: Date.now },
});

BuyerReviewSchema.methods.toClientReview = function toClientReview() {
  return {
    id: this._id,
    storeId: this.storeId,
    storeName: this.storeName,
    productName: this.productName,
    orderCode: this.orderCode,
    rating: this.rating,
    comment: this.comment,
    imageUrl: this.imageUrl || "",
    createdAt: this.CreatedAt,
  };
};

module.exports = mongoose.model("BuyerReview", BuyerReviewSchema);
