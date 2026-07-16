export const RESERVATION_STATUS = {
  PENDING: 0,
  CONFIRMED: 1,
  COMPLETED: 2,
  CANCELLED: 3,
};

export const RESERVATION_TAB = {
  PENDING_PRICE: 'pending_price',
  HOLDING: 'holding',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
};

export const DEAL_OFFER_STATUS = {
  PENDING: 0,
  ACCEPTED: 1,
  REJECTED: 2,
};

/** Who placed the current offeredPrice */
export const DEAL_OFFER_BY = {
  BUYER: 1,
  SELLER: 2,
};

export const RESERVATION_TAB_LABELS = {
  pending_price: 'Deal giá',
  holding: 'Giữ hàng',
  cancelled: 'Đã hủy',
  completed: 'Hoàn thành',
};
