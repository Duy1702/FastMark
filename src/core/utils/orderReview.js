import { Alert } from 'react-native';

import { submitBuyerReviewOnBackend } from '../../api/reviewApi';
import { markOrderAsReviewed } from '../../hooks/useReviewedOrderCodes';
import { addMockMyReview } from '../../model/mock/activityMockData';
import { getCurrentUserIdToken } from '../../repository/authRepository';

export const PURCHASE_REVIEW_STATUSES = ['Hoàn thành', 'Đã giao'];

export function canReviewPurchaseOrder(order) {
  const status = String(order?.status || '').trim();
  return PURCHASE_REVIEW_STATUSES.includes(status);
}

export function canReviewReservationOrder(order) {
  return order?.status === 'picked_up';
}

export function canReviewOrder(order) {
  if (!order) {
    return false;
  }
  if (order.type === 'purchase' || order.purchasedAt) {
    return canReviewPurchaseOrder(order);
  }
  return canReviewReservationOrder(order);
}

export function canShowReviewButton(order, reviewedOrderCodes) {
  if (!canReviewOrder(order)) {
    return false;
  }
  const key = String(order?.orderCode || order?.id || '').trim();
  return Boolean(key && !reviewedOrderCodes?.has(key));
}

export function isOrderAlreadyReviewed(order, reviewedOrderCodes) {
  const key = String(order?.orderCode || order?.id || '').trim();
  return Boolean(key && reviewedOrderCodes?.has(key));
}

export function getPurchaseStatusLabel(status) {
  return status || 'Đang xử lý';
}

export async function submitShopReview({
  storeId,
  storeName,
  productName,
  orderCode,
  rating,
  comment,
  imageUrl,
}) {
  if (!rating || Number(rating) < 1) {
    throw new Error('Vui lòng chọn số sao trước khi gửi đánh giá.');
  }

  try {
    const idToken = await getCurrentUserIdToken();
    if (idToken) {
      const review = await submitBuyerReviewOnBackend({
        idToken,
        storeId,
        storeName,
        productName,
        orderCode,
        rating,
        comment,
        imageUrl,
      });
      if (review) {
        markOrderAsReviewed({ orderCode });
        return review;
      }
    }
  } catch (error) {
    if (error.statusCode === 409) {
      markOrderAsReviewed({ orderCode });
      throw error;
    }
    const fallback = addMockMyReview({
      storeId,
      storeName,
      productName,
      orderCode,
      rating,
      comment,
      imageUrl,
    });
    markOrderAsReviewed({ orderCode });
    Alert.alert(
      'Đã lưu tạm',
      error.message || 'Không gửi được lên máy chủ. Đánh giá được lưu cục bộ.'
    );
    return fallback;
  }

  const fallback = addMockMyReview({
    storeId,
    storeName,
    productName,
    orderCode,
    rating,
    comment,
    imageUrl,
  });
  markOrderAsReviewed({ orderCode });
  return fallback;
}
