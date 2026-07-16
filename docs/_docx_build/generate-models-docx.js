const fs = require("fs");
const path = require("path");
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  HeadingLevel,
  BorderStyle,
  AlignmentType,
  ShadingType,
  PageBreak,
} = require("docx");

const PAGE_WIDTH = 11906;
const MARGIN = 720;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" };
const borders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

function cell(text, opts = {}) {
  const {
    bold = false,
    header = false,
    width,
    color = "0F172A",
  } = opts;

  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: header
      ? { type: ShadingType.CLEAR, fill: "0F766E" }
      : undefined,
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: String(text ?? ""),
            bold: bold || header,
            size: header ? 18 : 16,
            color: header ? "FFFFFF" : color,
            font: "Calibri",
          }),
        ],
      }),
    ],
  });
}

function makeTable(headers, rows, colWidths) {
  const headerRow = new TableRow({
    children: headers.map((h, i) =>
      cell(h, { header: true, width: colWidths[i] })
    ),
  });

  const bodyRows = rows.map(
    (row) =>
      new TableRow({
        children: row.map((value, i) =>
          cell(value, { width: colWidths[i], bold: i === 0 })
        ),
      })
  );

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [headerRow, ...bodyRows],
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 240, after: 160 },
    children: [new TextRun({ text, bold: true, size: 32, color: "0F766E", font: "Calibri" })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    children: [new TextRun({ text, bold: true, size: 26, color: "0F172A", font: "Calibri" })],
  });
}

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({
        text,
        size: 20,
        italics: opts.italics,
        font: "Calibri",
        color: "334155",
      }),
    ],
  });
}

function note(text) {
  return new Paragraph({
    spacing: { before: 60, after: 120 },
    children: [
      new TextRun({
        text,
        size: 18,
        italics: true,
        font: "Calibri",
        color: "64748B",
      }),
    ],
  });
}

const COLS = ["NO", "name", "type", "Length", "not null", "key", "ghi chú", "fk hoặc quan hệ"];
const W = [500, 1800, 1100, 900, 900, 1100, 2200, 1974]; // sum ≈ 10474

const tables = [
  {
    title: "1. users (User)",
    purpose: "Tài khoản người dùng: auth, hồ sơ, role, presence, OTP email/SĐT.",
    rows: [
      ["1", "_id", "ObjectId", "24 hex", "YES", "PK", "ID hệ thống tạo", "—"],
      ["2", "FirebaseUID", "String", "-", "YES", "UK", "UID Firebase Auth", "Logic 1–1 với Firebase user"],
      ["3", "UserName", "String", "3–20", "YES", "UK", "Tên đăng nhập", "—"],
      ["4", "FullName", "String", "2–50", "YES", "—", "Họ tên hiển thị", "—"],
      ["5", "Email", "String", "-", "NO", "UK (sparse)", "Email; lowercase", "—"],
      ["6", "Phone", "String", "10–10", "NO", "UK (sparse)", "SĐT đúng 10 số", "—"],
      ["7", "AuthProvider", "String", "enum", "YES", "—", "email | google", "—"],
      ["8", "AnhBia", "String", "-", "NO", "—", "URL ảnh bìa; default \"\"", "—"],
      ["9", "Avatar", "String", "-", "NO", "—", "URL avatar; default \"\"", "—"],
      ["10", "Role", "Number", "-", "NO", "—", "1 buyer, 2 seller, 3 admin; default 1", "—"],
      ["11", "Status", "Number", "-", "NO", "—", "0 khóa, 1 active; default 1", "—"],
      ["12", "FollowingCount", "Number", "-", "NO", "—", "Số shop đang follow; default 0", "Denormalize từ ShopFollow"],
      ["13", "DangHoatDong", "Boolean", "-", "NO", "—", "Presence cá nhân (buyer mode)", "—"],
      ["14", "LanHoatDongCuoi", "Date", "-", "NO", "—", "Lần hoạt động cuối", "—"],
      ["15", "VerifyAccount", "Boolean", "-", "NO", "—", "Đã xác minh email", "—"],
      ["16", "EmailVerifyCode", "String", "-", "NO", "—", "OTP email", "—"],
      ["17", "EmailVerifyCodeExpiresAt", "Date", "-", "NO", "—", "Hết hạn OTP email", "—"],
      ["18", "EmailVerifyResendAt", "Date", "-", "NO", "—", "Cho phép gửi lại OTP", "—"],
      ["19", "SellerPhoneVerified", "Boolean", "-", "NO", "—", "Đã xác minh SĐT seller", "—"],
      ["20", "SellerPhoneVerifyCode", "String", "-", "NO", "—", "OTP SĐT seller", "—"],
      ["21", "SellerPhoneVerifyCodeExpiresAt", "Date", "-", "NO", "—", "Hết hạn OTP SĐT", "—"],
      ["22", "FcmToken", "String", "-", "NO", "—", "Token push FCM", "—"],
      ["23", "CreatedAt", "Date", "-", "NO", "—", "Ngày tạo; default now", "—"],
      ["24", "UpdatedAt", "Date", "-", "NO", "—", "Ngày cập nhật", "—"],
    ],
    relation:
      "User (phía 1): ShopProfile 0|1–1; SellerVerification / Conversation / Notification / DealOffer / Reservation / Review / Report / FavoriteProduct / ShopFollow = 1–N.",
  },
  {
    title: "2. profiles (Profile) — legacy",
    purpose: "Hồ sơ legacy gắn theo Firebase UID (song song với User).",
    rows: [
      ["1", "_id", "ObjectId", "24 hex", "YES", "PK", "ID hệ thống", "—"],
      ["2", "firebaseUid", "String", "-", "YES", "UK, INDEX", "Khóa gắn Firebase", "Logic 1–1 User.FirebaseUID"],
      ["3", "email", "String", "-", "NO", "—", "Email; default \"\"", "—"],
      ["4", "fullName", "String", "-", "NO", "—", "Họ tên", "—"],
      ["5", "phone", "String", "-", "NO", "—", "SĐT", "—"],
      ["6", "photoUrl", "String", "-", "NO", "—", "Avatar URL", "—"],
      ["7", "createdAt", "Date", "-", "NO", "—", "timestamps Mongoose", "—"],
      ["8", "updatedAt", "Date", "-", "NO", "—", "timestamps Mongoose", "—"],
    ],
  },
  {
    title: "3. shopprofiles (ShopProfile)",
    purpose: "Gian hàng của người bán: thông tin, địa chỉ, giờ mở, rating, presence shop.",
    rows: [
      ["1", "_id", "ObjectId", "24 hex", "YES", "PK", "ID shop", "—"],
      ["2", "userId", "ObjectId", "-", "NO", "FK", "Chủ shop", "N–1 → User (0|1–1 từ User)"],
      ["3", "externalRestaurantId", "String", "-", "NO", "INDEX sparse", "ID ngoài (nếu có)", "—"],
      ["4", "description", "String", "-", "NO", "—", "Mô tả shop", "—"],
      ["5", "avatar", "String", "-", "NO", "—", "Logo shop; default \"\"", "—"],
      ["6", "address", "String", "-", "NO", "—", "Địa chỉ nhập", "—"],
      ["7", "DiaChiHeThong", "String", "-", "NO", "—", "Địa chỉ chuẩn hóa", "—"],
      ["8", "latitude", "Number", "-", "NO", "—", "Vĩ độ", "—"],
      ["9", "longitude", "Number", "-", "NO", "—", "Kinh độ", "—"],
      ["10", "shopUsername", "String", "-", "NO", "UK sparse", "@username shop", "—"],
      ["11", "shopName", "String", "-", "NO", "—", "Tên shop", "—"],
      ["12", "categoryId", "ObjectId", "-", "NO", "FK", "Ngành shop", "N–1 → ShopCategory"],
      ["13", "phone", "String", "-", "NO", "—", "SĐT shop", "—"],
      ["14", "openTime", "String", "-", "NO", "—", "Giờ mở", "—"],
      ["15", "closeTime", "String", "-", "NO", "—", "Giờ đóng", "—"],
      ["16", "isOpen", "Number", "-", "NO", "—", "0 đóng, 1 mở; default 1", "—"],
      ["17", "status", "Number", "-", "NO", "—", "0 khóa, 1 active; default 1", "—"],
      ["18", "visibilityRestrictedUntil", "Date", "-", "NO", "—", "Hạn chế hiển thị tới", "—"],
      ["19", "suspendedUntil", "Date", "-", "NO", "—", "Đình chỉ tới", "—"],
      ["20", "permanentlyClosedAt", "Date", "-", "NO", "—", "Đóng vĩnh viễn", "—"],
      ["21", "averageRating", "Number", "-", "NO", "—", "Điểm TB; default 0", "Denormalize Review"],
      ["22", "followersCount", "Number", "-", "NO", "—", "Số follower; default 0", "Denormalize ShopFollow"],
      ["23", "totalReviews", "Number", "-", "NO", "—", "Tổng review", "Denormalize"],
      ["24", "totalProducts", "Number", "-", "NO", "—", "Tổng SP", "Denormalize"],
      ["25", "soldCount", "Number", "-", "NO", "—", "Đã bán", "Denormalize"],
      ["26", "DangHoatDong", "Boolean", "-", "NO", "—", "Presence shop (seller mode)", "—"],
      ["27", "LanHoatDongCuoi", "Date", "-", "NO", "—", "Activity shop cuối", "—"],
      ["28", "CreatedAt", "Date", "-", "NO", "—", "Ngày tạo", "—"],
      ["29", "UpdatedAt", "Date", "-", "NO", "—", "Ngày cập nhật", "—"],
    ],
    relation: "Shop 1–N: Product, Conversation, DealOffer, Reservation, ShopFollow, Report.",
  },
  {
    title: "4. shopcategories (ShopCategory)",
    purpose: "Danh mục ngành nghề của shop.",
    rows: [
      ["1", "_id", "ObjectId", "24 hex", "YES", "PK", "ID danh mục", "—"],
      ["2", "name", "String", "-", "YES", "UK", "Tên danh mục shop", "—"],
      ["3", "description", "String", "-", "NO", "—", "Mô tả", "—"],
      ["4", "IsDeleted", "Number", "-", "NO", "—", "Soft flag; default 1", "—"],
      ["5", "CreatedAt", "Date", "-", "NO", "—", "Ngày tạo", "—"],
      ["6", "UpdatedAt", "Date", "-", "NO", "—", "Ngày cập nhật", "—"],
    ],
    relation: "1–N → ShopProfile, SellerVerification.",
  },
  {
    title: "5. sellerverifications (SellerVerification)",
    purpose: "Hồ sơ đăng ký người bán (CCCD, selfie, địa chỉ) chờ admin duyệt.",
    rows: [
      ["1", "_id", "ObjectId", "24 hex", "YES", "PK", "ID hồ sơ", "—"],
      ["2", "userId", "ObjectId", "-", "YES", "FK", "Người nộp", "N–1 → User"],
      ["3", "cccdFrontImage", "String", "-", "NO", "—", "URL CCCD mặt trước", "—"],
      ["4", "cccdBackImage", "String", "-", "NO", "—", "URL CCCD mặt sau", "—"],
      ["5", "selfieImage", "String", "-", "NO", "—", "URL selfie KYC", "—"],
      ["6", "shopUsername", "String", "-", "NO", "—", "Username shop đề xuất", "—"],
      ["7", "shopName", "String", "-", "NO", "—", "Tên shop đề xuất", "—"],
      ["8", "shopDescription", "String", "-", "NO", "—", "Mô tả đề xuất", "—"],
      ["9", "categoryId", "ObjectId", "-", "NO", "FK", "Danh mục đề xuất", "N–1 → ShopCategory"],
      ["10", "address", "String", "-", "NO", "—", "Địa chỉ", "—"],
      ["11", "DiaChiHeThong", "String", "-", "NO", "—", "Địa chỉ hệ thống", "—"],
      ["12", "latitude", "Number", "-", "NO", "—", "Vĩ độ", "—"],
      ["13", "longitude", "Number", "-", "NO", "—", "Kinh độ", "—"],
      ["14", "status", "Number", "-", "NO", "—", "0 pending, 1 approved, 2 rejected", "—"],
      ["15", "LyDoTuChoi", "String", "-", "NO", "—", "Lý do từ chối", "—"],
      ["16", "submittedAt", "Date", "-", "NO", "—", "Thời điểm nộp", "—"],
      ["17", "approvedAt", "Date", "-", "NO", "—", "Thời điểm duyệt", "—"],
      ["18", "rejectedAt", "Date", "-", "NO", "—", "Thời điểm từ chối", "—"],
      ["19", "approvedBy", "ObjectId", "-", "NO", "FK", "Admin duyệt", "N–1 → User"],
      ["20", "CreatedAt", "Date", "-", "NO", "—", "Ngày tạo", "—"],
      ["21", "UpdatedAt", "Date", "-", "NO", "—", "Ngày cập nhật", "—"],
    ],
  },
  {
    title: "6. categories (ProductCategory)",
    purpose: "Danh mục sản phẩm.",
    rows: [
      ["1", "_id", "ObjectId", "24 hex", "YES", "PK", "ID danh mục SP", "—"],
      ["2", "name", "String", "-", "YES", "UK", "Tên danh mục", "—"],
      ["3", "categoryName", "String", "-", "NO", "—", "Alias đồng bộ với name", "—"],
      ["4", "description", "String", "-", "NO", "—", "Mô tả", "—"],
      ["5", "icon", "String", "-", "NO", "—", "Icon", "—"],
      ["6", "IsDeleted", "Number", "-", "NO", "—", "Soft flag; default 1", "—"],
      ["7", "CreatedAt", "Date", "-", "NO", "—", "Ngày tạo", "—"],
      ["8", "UpdatedAt", "Date", "-", "NO", "—", "Ngày cập nhật", "—"],
    ],
    relation: "1–N → Product.",
  },
  {
    title: "7. products (Product)",
    purpose: "Sản phẩm thuộc một gian hàng.",
    rows: [
      ["1", "_id", "ObjectId", "24 hex", "YES", "PK", "ID sản phẩm", "—"],
      ["2", "ShopId", "ObjectId", "-", "YES", "FK, INDEX", "Thuộc shop", "N–1 → ShopProfile"],
      ["3", "CategoryId", "ObjectId", "-", "YES", "FK, INDEX", "Danh mục SP", "N–1 → ProductCategory"],
      ["4", "ProductName", "String", "-", "YES", "—", "Tên sản phẩm", "—"],
      ["5", "Description", "String", "-", "NO", "—", "Mô tả; default \"\"", "—"],
      ["6", "DonVi", "String", "-", "NO", "—", "Đơn vị bán", "—"],
      ["7", "Thumbnail", "String", "-", "NO", "—", "Ảnh đại diện", "—"],
      ["8", "ViewCount", "Number", "-", "NO", "—", "Lượt xem; default 0", "—"],
      ["9", "LikeCount", "Number", "-", "NO", "—", "Lượt tym; default 0", "—"],
      ["10", "SoldCount", "Number", "-", "NO", "—", "Đã bán; default 0", "—"],
      ["11", "Status", "Number", "-", "NO", "INDEX", "0 ẩn, 1 hiện; default 1", "—"],
      ["12", "MinPrice", "Number", "-", "NO", "—", "Giá min (từ variants)", "—"],
      ["13", "MaxPrice", "Number", "-", "NO", "—", "Giá max", "—"],
      ["14", "CreatedAt", "Date", "-", "NO", "—", "Ngày tạo", "—"],
      ["15", "UpdatedAt", "Date", "-", "NO", "—", "Ngày cập nhật", "—"],
    ],
    relation: "1–N → ProductVariant, FavoriteProduct, DealOffer, Reservation, Report.",
  },
  {
    title: "8. productvariants (ProductVariant)",
    purpose: "Phân loại / biến thể sản phẩm: giá, tồn kho, ảnh.",
    rows: [
      ["1", "_id", "ObjectId", "24 hex", "YES", "PK", "ID biến thể", "—"],
      ["2", "ProductId", "ObjectId", "-", "YES", "FK, INDEX", "Thuộc SP", "N–1 → Product"],
      ["3", "VariantName", "String", "-", "YES", "—", "Tên phân loại", "—"],
      ["4", "Price", "Number", "min 0", "YES", "—", "Đơn giá", "—"],
      ["5", "Quantity", "Number", "min 0", "YES", "—", "Tồn kho; default 0", "—"],
      ["6", "SoldCount", "Number", "min 0", "NO", "—", "Đã bán; default 0", "—"],
      ["7", "Images", "Array<subdoc>", "-", "NO", "—", "Danh sách ảnh biến thể", "Embedded (không bảng riêng)"],
      ["7a", "Images[]._id", "ObjectId", "24 hex", "YES", "PK sub", "ID ảnh", "—"],
      ["7b", "Images[].ImageUrl", "String", "-", "YES", "—", "URL ảnh", "—"],
      ["7c", "Images[].SortOrder", "Number", "-", "NO", "—", "Thứ tự; default 0", "—"],
      ["8", "Status", "Number", "-", "NO", "—", "Trạng thái; default 1", "—"],
      ["9", "CreatedAt", "Date", "-", "NO", "—", "Ngày tạo", "—"],
      ["10", "UpdatedAt", "Date", "-", "NO", "—", "Ngày cập nhật", "—"],
    ],
    relation: "1–N → DealOffer, Reservation.",
  },
  {
    title: "9. favoriteproducts (FavoriteProduct)",
    purpose: "Bảng nối N–N: người mua tym / yêu thích sản phẩm.",
    rows: [
      ["1", "_id", "ObjectId", "24 hex", "YES", "PK", "ID", "—"],
      ["2", "userId", "ObjectId", "-", "YES", "FK, INDEX", "Ai tym", "N–1 → User"],
      ["3", "productId", "ObjectId", "-", "YES", "FK, INDEX", "SP nào", "N–1 → Product"],
      ["4", "CreatedAt", "Date", "-", "NO", "—", "Ngày tạo", "—"],
      ["5", "UpdatedAt", "Date", "-", "NO", "—", "Ngày cập nhật", "—"],
    ],
    relation: "UK phức hợp (userId, productId) → User N–N Product.",
  },
  {
    title: "10. shopfollows (ShopFollow)",
    purpose: "Bảng nối N–N: người mua theo dõi gian hàng.",
    rows: [
      ["1", "_id", "ObjectId", "24 hex", "YES", "PK", "ID", "—"],
      ["2", "userId", "ObjectId", "-", "YES", "FK, INDEX", "Người follow", "N–1 → User"],
      ["3", "shopId", "ObjectId", "-", "YES", "FK, INDEX", "Shop được follow", "N–1 → ShopProfile"],
      ["4", "CreatedAt", "Date", "-", "NO", "—", "Ngày tạo", "—"],
      ["5", "UpdatedAt", "Date", "-", "NO", "—", "Ngày cập nhật", "—"],
    ],
    relation: "UK phức hợp (userId, shopId) → User N–N ShopProfile.",
  },
  {
    title: "11. dealoffers (DealOffer)",
    purpose: "Deal giá giữa buyer và shop.",
    rows: [
      ["1", "_id", "ObjectId", "24 hex", "YES", "PK", "ID deal", "—"],
      ["2", "productId", "ObjectId", "-", "NO", "FK", "SP", "N–1 → Product"],
      ["3", "variantId", "ObjectId", "-", "NO", "FK", "Biến thể", "N–1 → ProductVariant"],
      ["4", "userId", "ObjectId", "-", "NO", "FK", "Buyer", "N–1 → User"],
      ["5", "shopId", "ObjectId", "-", "NO", "FK", "Shop", "N–1 → ShopProfile"],
      ["6", "reservationId", "ObjectId", "-", "NO", "FK", "Đơn giữ từ deal", "0|1–1 ↔ Reservation"],
      ["7", "originalPrice", "Number", "-", "NO", "—", "Giá niêm yết (unit)", "—"],
      ["8", "offeredPrice", "Number", "-", "NO", "—", "Tổng giá deal hiện tại", "—"],
      ["9", "lastOfferBy", "Number", "enum 1|2", "NO", "INDEX", "1 buyer, 2 seller; default 1", "—"],
      ["10", "discountPercent", "Number", "-", "NO", "—", "% giảm", "—"],
      ["11", "quantity", "Number", "min 1", "NO", "—", "Số lượng; default 1", "—"],
      ["12", "status", "Number", "-", "NO", "INDEX", "0 pending, 1 accepted, 2 rejected", "—"],
      ["13", "note", "String", "-", "NO", "—", "Ghi chú buyer", "—"],
      ["14", "sellerNote", "String", "-", "NO", "—", "Ghi chú shop", "—"],
      ["15", "respondedAt", "Date", "-", "NO", "—", "Thời điểm phản hồi", "—"],
      ["16", "CreatedAt", "Date", "-", "NO", "—", "Ngày tạo", "—"],
      ["17", "UpdatedAt", "Date", "-", "NO", "—", "Ngày cập nhật", "—"],
    ],
  },
  {
    title: "12. reservations (Reservation)",
    purpose: "Đơn giữ hàng / đặt lấy.",
    rows: [
      ["1", "_id", "ObjectId", "24 hex", "YES", "PK", "ID đơn giữ", "—"],
      ["2", "variantId", "ObjectId", "-", "NO", "FK", "Biến thể", "N–1 → ProductVariant"],
      ["3", "shopId", "ObjectId", "-", "NO", "FK", "Shop", "N–1 → ShopProfile"],
      ["4", "productId", "ObjectId", "-", "NO", "FK", "SP", "N–1 → Product"],
      ["5", "userId", "ObjectId", "-", "NO", "FK", "Buyer", "N–1 → User"],
      ["6", "dealOfferId", "ObjectId", "-", "NO", "FK", "Deal nguồn", "0|1–1 ↔ DealOffer"],
      ["7", "quantity", "Number", "-", "NO", "—", "Số lượng", "—"],
      ["8", "reservedPrice", "Number", "-", "NO", "—", "Giá giữ", "—"],
      ["9", "agreedPrice", "Number", "-", "NO", "—", "Giá chốt", "—"],
      ["10", "pickupTime", "Date", "-", "NO", "—", "Giờ lấy hàng", "—"],
      ["11", "note", "String", "-", "NO", "—", "Ghi chú", "—"],
      ["12", "status", "Number", "-", "NO", "—", "0 pending, 1 confirmed, 2 completed, 3 cancelled", "—"],
      ["13", "confirmedAt", "Date", "-", "NO", "—", "Thời điểm xác nhận", "—"],
      ["14", "completedAt", "Date", "-", "NO", "—", "Hoàn thành", "—"],
      ["15", "cancelledAt", "Date", "-", "NO", "—", "Hủy", "—"],
      ["16", "cancelReason", "String", "-", "NO", "—", "Lý do hủy", "—"],
      ["17", "buyerPriceAcceptedAt", "Date", "-", "NO", "—", "Buyer chấp nhận giá", "—"],
      ["18", "cancelLockedAt", "Date", "-", "NO", "—", "Khóa hủy sớm", "—"],
      ["19", "inventoryHeld", "Boolean", "-", "NO", "—", "Đã giữ tồn kho; default false", "—"],
      ["20", "CreatedAt", "Date", "-", "NO", "—", "Ngày tạo", "—"],
      ["21", "UpdatedAt", "Date", "-", "NO", "—", "Ngày cập nhật", "—"],
    ],
  },
  {
    title: "13. reviews (Review)",
    purpose: "Đánh giá shop (buyer + public + admin moderation).",
    rows: [
      ["1", "_id", "ObjectId", "24 hex", "YES", "PK", "ID review", "—"],
      ["2", "userId", "ObjectId", "-", "NO", "FK, INDEX", "Người đánh giá", "N–1 → User"],
      ["3", "storeId", "String", "-", "YES", "INDEX", "ID shop (string, không ObjectId ref)", "Logic N–1 → ShopProfile"],
      ["4", "storeName", "String", "-", "NO", "—", "Snapshot tên shop", "—"],
      ["5", "productName", "String", "-", "NO", "—", "Snapshot tên SP", "—"],
      ["6", "orderCode", "String", "-", "NO", "INDEX", "Mã đơn liên quan", "—"],
      ["7", "userName", "String", "-", "NO", "—", "Tên hiển thị; default \"Khách hàng\"", "—"],
      ["8", "rating", "Number", "1–5", "YES", "—", "Số sao", "—"],
      ["9", "comment", "String", "-", "NO", "—", "Nội dung", "—"],
      ["10", "imageUrl", "String", "-", "NO", "—", "1 ảnh đính kèm", "—"],
      ["11", "isHidden", "Boolean", "-", "NO", "INDEX", "Ẩn; default false", "—"],
      ["12", "isDeleted", "Boolean", "-", "NO", "INDEX", "Xóa mềm; default false", "—"],
      ["13", "deletedAt", "Date", "-", "NO", "—", "Thời điểm xóa", "—"],
      ["14", "legacyExternalId", "String", "-", "NO", "INDEX sparse", "ID cũ (admin/report)", "—"],
      ["15", "CreatedAt", "Date", "-", "NO", "—", "Ngày tạo", "—"],
      ["16", "UpdatedAt", "Date", "-", "NO", "—", "Ngày cập nhật", "—"],
    ],
  },
  {
    title: "14. conversations (Conversation)",
    purpose: "Hội thoại buyer ↔ shop.",
    rows: [
      ["1", "_id", "ObjectId", "24 hex", "YES", "PK", "ID hội thoại", "—"],
      ["2", "shopId", "ObjectId", "-", "NO", "FK, UK phức hợp", "Shop", "N–1 → ShopProfile"],
      ["3", "userId", "ObjectId", "-", "NO", "FK, UK phức hợp", "Buyer", "N–1 → User"],
      ["4", "lastMessage", "String", "-", "NO", "—", "Preview tin cuối", "—"],
      ["5", "lastMessageAt", "Date", "-", "NO", "—", "Thời điểm tin cuối", "—"],
      ["6", "nextThuTu", "Number", "-", "NO", "—", "Bộ đếm thứ tự tin; default 0", "—"],
      ["7", "CreatedAt", "Date", "-", "NO", "—", "Ngày tạo", "—"],
      ["8", "UpdatedAt", "Date", "-", "NO", "—", "Ngày cập nhật", "—"],
    ],
    relation: "UK (shopId, userId). 1–N → Message.",
  },
  {
    title: "15. messages (Message)",
    purpose: "Tin nhắn trong hội thoại.",
    rows: [
      ["1", "_id", "ObjectId", "24 hex", "YES", "PK", "ID tin", "—"],
      ["2", "conversationId", "ObjectId", "-", "NO", "FK, INDEX", "Thuộc hội thoại", "N–1 → Conversation"],
      ["3", "senderId", "ObjectId", "-", "NO", "INDEX", "ID người gửi", "Polymorphic: User hoặc ShopProfile tùy senderType"],
      ["4", "senderType", "Number", "-", "NO", "INDEX", "0 user, 1 shop; default 0", "—"],
      ["5", "ThuTu", "Number", "-", "NO", "INDEX", "Thứ tự trong chat; default 0", "—"],
      ["6", "messageType", "Number", "-", "NO", "—", "0 text, 1 image, 2 offer", "—"],
      ["7", "content", "String", "-", "NO", "—", "Nội dung / payload", "—"],
      ["8", "isRead", "Number", "-", "NO", "—", "0 unread, 1 read", "—"],
      ["9", "messageStatus", "Number", "-", "NO", "—", "0 sent, 1 delivered, 2 seen", "—"],
      ["10", "DeletedAt", "Date", "-", "NO", "—", "Soft delete", "—"],
      ["11", "CreatedAt", "Date", "-", "NO", "—", "Ngày tạo", "—"],
      ["12", "UpdatedAt", "Date", "-", "NO", "—", "Ngày cập nhật", "—"],
    ],
    relation: "1–N → MessageImage.",
  },
  {
    title: "16. messageimages (MessageImage)",
    purpose: "Ảnh đính kèm tin nhắn.",
    rows: [
      ["1", "_id", "ObjectId", "24 hex", "YES", "PK", "ID", "—"],
      ["2", "messageId", "ObjectId", "-", "NO", "FK, INDEX", "Thuộc tin", "N–1 → Message"],
      ["3", "imageUrl", "String", "-", "NO", "—", "URL ảnh", "—"],
      ["4", "sortOrder", "Number", "-", "NO", "—", "Thứ tự; default 0", "—"],
      ["5", "CreatedAt", "Date", "-", "NO", "—", "Ngày tạo", "—"],
      ["6", "UpdatedAt", "Date", "-", "NO", "—", "Ngày cập nhật", "—"],
      ["7", "DeletedAt", "Date", "-", "NO", "—", "Soft delete", "—"],
    ],
  },
  {
    title: "17. notifications (Notification)",
    purpose: "Thông báo người dùng (buyer / seller / system).",
    rows: [
      ["1", "_id", "ObjectId", "24 hex", "YES", "PK", "ID", "—"],
      ["2", "userId", "ObjectId", "-", "NO", "FK, INDEX", "Người nhận", "N–1 → User"],
      ["3", "title", "String", "-", "NO", "—", "Tiêu đề", "—"],
      ["4", "content", "String", "-", "NO", "—", "Nội dung", "—"],
      ["5", "audience", "String", "enum", "NO", "INDEX", "buyer | seller | system; default system", "—"],
      ["6", "isRead", "Number", "-", "NO", "—", "0 chưa đọc, 1 đã đọc", "—"],
      ["7", "CreatedAt", "Date", "-", "NO", "—", "Ngày tạo", "—"],
      ["8", "UpdatedAt", "Date", "-", "NO", "—", "Ngày cập nhật", "—"],
    ],
  },
  {
    title: "18. reports (Report)",
    purpose: "Báo cáo user / product / shop / review.",
    rows: [
      ["1", "_id", "ObjectId", "24 hex", "YES", "PK", "ID báo cáo", "—"],
      ["2", "userId", "ObjectId", "-", "NO", "FK", "Người báo", "N–1 → User"],
      ["3", "targetUserId", "ObjectId", "-", "NO", "FK", "User bị báo", "0–N → User"],
      ["4", "productId", "ObjectId", "-", "NO", "FK", "SP bị báo", "0–N → Product"],
      ["5", "shopId", "ObjectId", "-", "NO", "FK", "Shop bị báo", "0–N → ShopProfile"],
      ["6", "reviewId", "String", "-", "NO", "—", "ID review (string); default \"\"", "Logic → Review"],
      ["7", "reportType", "Number", "-", "NO", "—", "Loại báo cáo", "—"],
      ["8", "title", "String", "-", "NO", "—", "Tiêu đề", "—"],
      ["9", "content", "String", "-", "NO", "—", "Nội dung", "—"],
      ["10", "status", "Number", "-", "NO", "—", "0 pending, 1 processed, 2 rejected", "—"],
      ["11", "processedBy", "ObjectId", "-", "NO", "FK", "Admin xử lý", "N–1 → User"],
      ["12", "processedAt", "Date", "-", "NO", "—", "Thời điểm xử lý", "—"],
      ["13", "CreatedAt", "Date", "-", "NO", "—", "Ngày tạo", "—"],
      ["14", "UpdatedAt", "Date", "-", "NO", "—", "Ngày cập nhật", "—"],
    ],
    relation: "1–N → ReportImage.",
  },
  {
    title: "19. reportimages (ReportImage)",
    purpose: "Ảnh đính kèm báo cáo.",
    rows: [
      ["1", "_id", "ObjectId", "24 hex", "YES", "PK", "ID", "—"],
      ["2", "reportId", "ObjectId", "-", "NO", "FK", "Thuộc report", "N–1 → Report"],
      ["3", "imageUrl", "String", "-", "NO", "—", "URL ảnh", "—"],
      ["4", "CreatedAt", "Date", "-", "NO", "—", "Ngày tạo", "—"],
      ["5", "UpdatedAt", "Date", "-", "NO", "—", "Ngày cập nhật", "—"],
    ],
  },
];

const overviewRows = [
  ["1", "users (User)", "Tài khoản người dùng: auth, hồ sơ, role, presence, OTP"],
  ["2", "profiles (Profile)", "Hồ sơ legacy theo Firebase UID"],
  ["3", "shopprofiles (ShopProfile)", "Gian hàng người bán"],
  ["4", "shopcategories (ShopCategory)", "Danh mục ngành shop"],
  ["5", "sellerverifications (SellerVerification)", "Hồ sơ đăng ký seller chờ admin duyệt"],
  ["6", "categories (ProductCategory)", "Danh mục sản phẩm"],
  ["7", "products (Product)", "Sản phẩm của shop"],
  ["8", "productvariants (ProductVariant)", "Phân loại/giá/tồn kho của SP"],
  ["9", "favoriteproducts (FavoriteProduct)", "User tym sản phẩm (N–N)"],
  ["10", "shopfollows (ShopFollow)", "User theo dõi shop (N–N)"],
  ["11", "dealoffers (DealOffer)", "Deal giá buyer ↔ shop"],
  ["12", "reservations (Reservation)", "Đơn giữ hàng / đặt lấy"],
  ["13", "reviews (Review)", "Đánh giá shop"],
  ["14", "conversations (Conversation)", "Hội thoại buyer ↔ shop"],
  ["15", "messages (Message)", "Tin nhắn"],
  ["16", "messageimages (MessageImage)", "Ảnh đính kèm tin"],
  ["17", "notifications (Notification)", "Thông báo"],
  ["18", "reports (Report)", "Báo cáo"],
  ["19", "reportimages (ReportImage)", "Ảnh đính kèm báo cáo"],
];

const children = [
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [
      new TextRun({
        text: "FASTMARK — TÀI LIỆU DATABASE MODELS",
        bold: true,
        size: 36,
        color: "0F766E",
        font: "Calibri",
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [
      new TextRun({
        text: "Xuất từ backend/models (MongoDB / Mongoose)",
        size: 20,
        color: "64748B",
        font: "Calibri",
      }),
    ],
  }),
  p(
    "Ghi chú: Length = minlength–maxlength trong schema; '-' = không giới hạn trong schema. not null = YES chỉ khi required: true. key = PK / UK / FK / INDEX."
  ),

  h1("A. Danh sách bảng / collection"),
  makeTable(
    ["NO", "Bảng (Model)", "Làm gì"],
    overviewRows,
    [700, 3200, 6574]
  ),

  h1("B. Chi tiết cột từng bảng"),
];

for (const table of tables) {
  children.push(h2(table.title));
  children.push(p(table.purpose));
  children.push(makeTable(COLS, table.rows, W));
  if (table.relation) {
    children.push(note("Quan hệ: " + table.relation));
  }
}

children.push(h1("C. Chú thích cột"));
children.push(
  makeTable(
    ["Cột", "Ý nghĩa"],
    [
      ["Length", "minlength–maxlength trong schema; '-' = không giới hạn trong schema"],
      ["not null", "YES chỉ khi required: true"],
      ["key", "PK / UK / FK / INDEX"],
      ["fk hoặc quan hệ", "ref Mongoose hoặc quan hệ logic thực tế"],
    ],
    [2200, 8274]
  )
);

children.push(
  new Paragraph({
    spacing: { before: 300 },
    children: [
      new TextRun({
        text: "Nguồn: FastMark/backend/models — " + new Date().toLocaleString("vi-VN"),
        size: 16,
        color: "94A3B8",
        font: "Calibri",
      }),
    ],
  })
);

async function main() {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE_WIDTH, height: 16838 },
            margin: {
              top: MARGIN,
              bottom: MARGIN,
              left: MARGIN,
              right: MARGIN,
            },
          },
        },
        children,
      },
    ],
  });

  const outPath = path.resolve(__dirname, "..", "FastMark-Database-Models.docx");
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outPath, buffer);
  console.log("Wrote:", outPath);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
