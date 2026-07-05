import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';

import { getMockReviewsByStoreId } from '../data/storeMockData';
import { createLogger } from '../utils/logger';
import { getFirestoreDb } from './firestoreDb';

const log = createLogger('ReviewService');
const REVIEWS_COLLECTION = 'reviews';

export async function fetchReviewsByStoreId(storeId) {
  log.info('fetchReviewsByStoreId:start', { storeId });

  try {
    const db = getFirestoreDb();
    const snapshot = await getDocs(
      query(collection(db, REVIEWS_COLLECTION), where('store_id', '==', String(storeId)))
    );

    if (!snapshot.empty) {
      const reviews = snapshot.docs
        .map((docSnap) => normalizeReview({ id: docSnap.id, ...docSnap.data() }))
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));

      if (reviews.length > 0) {
        log.ok('fetchReviewsByStoreId:firestore', { storeId, count: reviews.length });
        return reviews;
      }
    }

    log.warn('fetchReviewsByStoreId:empty-firestore', { storeId });
  } catch (error) {
    log.fail('fetchReviewsByStoreId:firestore-failed', error);
  }

  const mockReviews = getMockReviewsByStoreId(storeId);
  if (mockReviews.length > 0) {
    log.info('fetchReviewsByStoreId:mock', { storeId, count: mockReviews.length });
    return mockReviews;
  }

  const fallback = makeFallbackReviews(storeId);
  log.info('fetchReviewsByStoreId:fallback', { storeId, count: fallback.length });
  return fallback;
}

function normalizeReview(row) {
  return {
    id: row.id,
    store_id: row.store_id,
    user_name: row.user_name || 'Khách hàng',
    rating: row.rating,
    comment: row.comment || '',
    created_at: row.created_at,
  };
}

function makeFallbackReviews(storeId) {
  return [
    {
      id: `fallback-review-${storeId}-1`,
      store_id: storeId,
      user_name: 'Khách gần đây',
      rating: 5,
      comment: 'Gian hàng phục vụ tốt, thông tin rõ ràng và dễ liên hệ.',
      created_at: '2026-07-01T09:00:00Z',
    },
    {
      id: `fallback-review-${storeId}-2`,
      store_id: storeId,
      user_name: 'Minh Anh',
      rating: 4,
      comment: 'Sản phẩm ổn, giá hợp lý. Sẽ quay lại nếu có dịp.',
      created_at: '2026-06-28T14:30:00Z',
    },
  ];
}
