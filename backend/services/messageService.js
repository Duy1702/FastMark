const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const Restaurant = require("../models/Restaurant");
const ShopProfile = require("../models/ShopProfile");
const User = require("../models/User");
const { MESSAGE_TYPE } = require("../constants/messageType");
const { MESSAGE_READ, MESSAGE_STATUS } = require("../constants/messageStatus");
const { getShopForSeller } = require("./shopSettingsService");

function createServiceError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function pickString(value) {
  return String(value || "").trim();
}

function isMongoObjectId(value) {
  return /^[a-f\d]{24}$/i.test(pickString(value));
}

async function findOrCreateDemoShopProfile(restaurant) {
  const externalId = String(restaurant.externalId);
  let shop = await ShopProfile.findOne({ externalRestaurantId: externalId });
  if (shop) {
    return shop;
  }

  try {
    shop = await ShopProfile.create({
      externalRestaurantId: externalId,
      description: restaurant.name,
      address: restaurant.address || "",
      DiaChiHeThong: restaurant.address || "",
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      phone: restaurant.phone || restaurant.zalo || "",
    });
    return shop;
  } catch (error) {
    if (error?.code === 11000) {
      const existing = await ShopProfile.findOne({ externalRestaurantId: externalId });
      if (existing) {
        return existing;
      }
    }
    throw error;
  }
}

async function resolveShopForBuyerChat(shopId, shopName = "") {
  const rawId = pickString(shopId);
  if (!rawId) {
    throw createServiceError("Thiếu shopId.", 400);
  }

  if (isMongoObjectId(rawId)) {
    const shop = await ShopProfile.findById(rawId);
    if (!shop) {
      throw createServiceError("Không tìm thấy gian hàng.", 404);
    }
    return shop;
  }

  let restaurant = await Restaurant.findOne({ externalId: rawId });
  if (!restaurant && shopName) {
    restaurant = await Restaurant.findOne({ name: shopName });
  }
  if (!restaurant) {
    throw createServiceError(
      "Không tìm thấy gian hàng để nhắn tin. Hãy chạy seed dữ liệu demo trên backend.",
      404
    );
  }

  return findOrCreateDemoShopProfile(restaurant);
}

function formatTime(date) {
  if (!date) {
    return "";
  }
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) {
    return "";
  }
  const now = new Date();
  const isToday = value.toDateString() === now.toDateString();
  if (isToday) {
    return value.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  }
  return value.toLocaleDateString("vi-VN");
}

function mapStatusToString(messageStatus) {
  if (messageStatus === MESSAGE_STATUS.SEEN) {
    return "seen";
  }
  if (messageStatus === MESSAGE_STATUS.DELIVERED) {
    return "delivered";
  }
  return "sent";
}

function mapMessageToClient(message, userId) {
  const isMine = String(message.senderId) === String(userId);
  const isImage = Number(message.messageType) === MESSAGE_TYPE.IMAGE;

  return {
    id: message._id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    isMine,
    messageType: message.messageType,
    content: isImage ? "" : message.content || "",
    imageUri: isImage ? message.content || "" : undefined,
    isRead: message.isRead,
    messageStatus: message.messageStatus,
    status: isMine ? mapStatusToString(message.messageStatus) : undefined,
    createdAt: message.CreatedAt,
  };
}

async function getShopPublicInfo(shop) {
  const seller = shop?.userId ? await User.findById(shop.userId) : null;
  let displayName = seller?.FullName || seller?.UserName || "";

  if (!displayName && shop?.externalRestaurantId) {
    const restaurant = await Restaurant.findOne({ externalId: shop.externalRestaurantId });
    displayName = restaurant?.name || "";
  }

  const name =
    displayName ||
    pickString(shop?.description).slice(0, 40) ||
    "Gian hàng";

  return {
    id: shop._id,
    name,
    avatar: seller?.Avatar || "",
    phone: shop.phone || seller?.Phone || "",
  };
}

function resolveMessagePayload(payload = {}) {
  const messageType = Number(payload.messageType ?? MESSAGE_TYPE.TEXT);
  if (messageType === MESSAGE_TYPE.IMAGE) {
    const imageContent = pickString(payload.imageContent || payload.content);
    if (!imageContent) {
      throw createServiceError("Thiếu dữ liệu ảnh.");
    }
    return {
      messageType: MESSAGE_TYPE.IMAGE,
      content: imageContent,
      preview: "[Ảnh]",
    };
  }

  const content = pickString(payload.content || payload.message);
  if (!content) {
    throw createServiceError("Nội dung tin nhắn không được để trống.");
  }

  return {
    messageType: MESSAGE_TYPE.TEXT,
    content,
    preview: content,
  };
}

async function createConversationMessage(conversation, senderId, payload) {
  const resolved = resolveMessagePayload(payload);
  const now = new Date();

  const message = await Message.create({
    conversationId: conversation._id,
    senderId,
    messageType: resolved.messageType,
    content: resolved.content,
    isRead: MESSAGE_READ.UNREAD,
    messageStatus: MESSAGE_STATUS.SENT,
    CreatedAt: now,
    UpdatedAt: now,
  });

  conversation.lastMessage = resolved.preview;
  conversation.lastMessageAt = now;
  conversation.UpdatedAt = now;
  await conversation.save();

  return message;
}

async function listSellerConversations(user) {
  const shop = await getShopForSeller(user);
  const conversations = await Conversation.find({ shopId: shop._id })
    .sort({ lastMessageAt: -1, UpdatedAt: -1 })
    .limit(100);

  const result = [];
  for (const conversation of conversations) {
    const buyer = await User.findById(conversation.userId);
    const unreadCount = await Message.countDocuments({
      conversationId: conversation._id,
      senderId: { $ne: user._id },
      isRead: MESSAGE_READ.UNREAD,
    });

    result.push({
      id: conversation._id,
      lastMessage: conversation.lastMessage || "",
      lastMessageAt: conversation.lastMessageAt || conversation.UpdatedAt,
      timeLabel: formatTime(conversation.lastMessageAt || conversation.UpdatedAt),
      unreadCount,
      buyer: buyer
        ? {
            id: buyer._id,
            fullName: buyer.FullName || "",
            userName: buyer.UserName || "",
            avatar: buyer.Avatar || "",
            phone: buyer.Phone || "",
          }
        : null,
    });
  }

  return result;
}

async function getOwnedConversation(user, conversationId) {
  const shop = await getShopForSeller(user);
  const conversation = await Conversation.findOne({
    _id: conversationId,
    shopId: shop._id,
  });
  if (!conversation) {
    throw createServiceError("Không tìm thấy cuộc trò chuyện.", 404);
  }
  return { shop, conversation };
}

async function getBuyerOwnedConversation(user, conversationId) {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    userId: user._id,
  });
  if (!conversation) {
    throw createServiceError("Không tìm thấy cuộc trò chuyện.", 404);
  }
  const shop = await ShopProfile.findById(conversation.shopId);
  if (!shop) {
    throw createServiceError("Không tìm thấy gian hàng.", 404);
  }
  return { shop, conversation };
}

async function listConversationMessages(user, conversationId) {
  const { conversation } = await getOwnedConversation(user, conversationId);
  const messages = await Message.find({ conversationId: conversation._id })
    .sort({ CreatedAt: 1 })
    .limit(200);

  await Message.updateMany(
    {
      conversationId: conversation._id,
      senderId: { $ne: user._id },
      isRead: MESSAGE_READ.UNREAD,
    },
    {
      $set: {
        isRead: MESSAGE_READ.READ,
        messageStatus: MESSAGE_STATUS.SEEN,
        UpdatedAt: new Date(),
      },
    }
  );

  return messages.map((message) => mapMessageToClient(message, user._id));
}

async function listBuyerConversationMessages(user, conversationId) {
  const { conversation } = await getBuyerOwnedConversation(user, conversationId);
  const messages = await Message.find({ conversationId: conversation._id })
    .sort({ CreatedAt: 1 })
    .limit(200);

  await Message.updateMany(
    {
      conversationId: conversation._id,
      senderId: { $ne: user._id },
      isRead: MESSAGE_READ.UNREAD,
    },
    {
      $set: {
        isRead: MESSAGE_READ.READ,
        messageStatus: MESSAGE_STATUS.SEEN,
        UpdatedAt: new Date(),
      },
    }
  );

  return messages.map((message) => mapMessageToClient(message, user._id));
}

async function sendSellerMessage(user, conversationId, payload) {
  const { conversation } = await getOwnedConversation(user, conversationId);
  const message = await createConversationMessage(conversation, user._id, payload);
  return mapMessageToClient(message, user._id);
}

async function sendBuyerMessage(user, conversationId, payload) {
  const { conversation } = await getBuyerOwnedConversation(user, conversationId);
  const message = await createConversationMessage(conversation, user._id, payload);
  return mapMessageToClient(message, user._id);
}

async function listBuyerConversations(user) {
  const conversations = await Conversation.find({ userId: user._id })
    .sort({ lastMessageAt: -1, UpdatedAt: -1 })
    .limit(100);

  const result = [];
  for (const conversation of conversations) {
    const shop = await ShopProfile.findById(conversation.shopId);
    if (!shop) {
      continue;
    }

    const unreadCount = await Message.countDocuments({
      conversationId: conversation._id,
      senderId: { $ne: user._id },
      isRead: MESSAGE_READ.UNREAD,
    });

    result.push({
      id: conversation._id,
      lastMessage: conversation.lastMessage || "",
      lastMessageAt: conversation.lastMessageAt || conversation.UpdatedAt,
      timeLabel: formatTime(conversation.lastMessageAt || conversation.UpdatedAt),
      unreadCount,
      shop: await getShopPublicInfo(shop),
    });
  }

  return result;
}

async function listShopsForBuyer() {
  const shops = await ShopProfile.find().sort({ UpdatedAt: -1 }).limit(30);
  const result = [];

  for (const shop of shops) {
    result.push({
      shop: await getShopPublicInfo(shop),
    });
  }

  return result;
}

async function findOrCreateBuyerConversation(user, shopId, shopName = "") {
  const shop = await resolveShopForBuyerChat(shopId, shopName);
  if (!shop) {
    throw createServiceError("Không tìm thấy gian hàng.", 404);
  }

  let conversation = await Conversation.findOne({
    shopId: shop._id,
    userId: user._id,
  });

  const now = new Date();
  if (!conversation) {
    conversation = await Conversation.create({
      shopId: shop._id,
      userId: user._id,
      lastMessage: "",
      lastMessageAt: now,
      CreatedAt: now,
      UpdatedAt: now,
    });
  }

  return { shop, conversation };
}

async function startConversationWithShop(user, shopId, payload = {}) {
  const shopName = pickString(payload.shopName);
  const { shop, conversation } = await findOrCreateBuyerConversation(user, shopId, shopName);
  const content = pickString(payload.content);

  if (content || payload.messageType === MESSAGE_TYPE.IMAGE) {
    const message = await sendBuyerMessage(user, conversation._id, payload);
    return {
      conversationId: conversation._id,
      shop: await getShopPublicInfo(shop),
      message,
    };
  }

  return {
    conversationId: conversation._id,
    shop: await getShopPublicInfo(shop),
  };
}

async function startConversationWithBuyer(user, buyerId, payload = {}) {
  const shop = await getShopForSeller(user);
  const buyer = await User.findById(buyerId);
  if (!buyer) {
    throw createServiceError("Không tìm thấy khách hàng.", 404);
  }

  let conversation = await Conversation.findOne({
    shopId: shop._id,
    userId: buyer._id,
  });

  const now = new Date();
  if (!conversation) {
    conversation = await Conversation.create({
      shopId: shop._id,
      userId: buyer._id,
      lastMessage: "",
      lastMessageAt: now,
      CreatedAt: now,
      UpdatedAt: now,
    });
  }

  const content = pickString(payload.content);
  if (content || payload.messageType === MESSAGE_TYPE.IMAGE) {
    return sendSellerMessage(user, conversation._id, payload);
  }

  return {
    conversationId: conversation._id,
  };
}

module.exports = {
  listSellerConversations,
  listBuyerConversations,
  listShopsForBuyer,
  listConversationMessages,
  listBuyerConversationMessages,
  sendSellerMessage,
  sendBuyerMessage,
  startConversationWithShop,
  startConversationWithBuyer,
};
