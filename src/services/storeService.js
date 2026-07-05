import { doc, getDoc } from 'firebase/firestore';

import { getMockStoreById } from '../data/storeMockData';
import { createLogger } from '../utils/logger';
import { getFirestoreDb } from './firestoreDb';

const log = createLogger('StoreService');
const RESTAURANTS_COLLECTION = 'restaurants';

export async function fetchStoreById(storeId) {
  const normalizedId = String(storeId);
  log.info('fetchStoreById:start', { storeId: normalizedId });

  const mockStore = getMockStoreById(normalizedId);
  if (mockStore) {
    log.ok('fetchStoreById:mock-hit', { storeId: normalizedId, name: mockStore.name });
    return mockStore;
  }

  try {
    const db = getFirestoreDb();
    const snapshot = await getDoc(doc(db, RESTAURANTS_COLLECTION, normalizedId));

    if (snapshot.exists()) {
      const store = normalizeStore({ id: snapshot.id, ...snapshot.data() });
      log.ok('fetchStoreById:firestore', { storeId: normalizedId, name: store.name });
      return store;
    }

    log.warn('fetchStoreById:not-found-firestore', { storeId: normalizedId });
  } catch (error) {
    log.fail('fetchStoreById:firestore-failed', error);
  }

  const fallback = getMockStoreById(normalizedId);
  log.info('fetchStoreById:fallback', { storeId: normalizedId, found: Boolean(fallback) });
  return fallback;
}

function normalizeStore(row) {
  const ratingAvg = Number(row.rating_avg ?? 4.5);

  return {
    id: row.id,
    name: row.name,
    type: row.type,
    latitude: row.latitude,
    longitude: row.longitude,
    address: row.address || '',
    phone: row.phone || '0900000000',
    zalo: row.zalo || row.phone || '0900000000',
    intro:
      row.intro ||
      `${row.name} là gian hàng mẫu trên Fastmark. Thông tin này được tạo tự động để test màn chi tiết, danh sách sản phẩm, đánh giá và liên hệ.`,
    rating_avg: Number.isFinite(ratingAvg) ? ratingAvg : 4.5,
    review_count: Number(row.review_count ?? 12),
    product_count: Number(row.product_count ?? 3),
  };
}
