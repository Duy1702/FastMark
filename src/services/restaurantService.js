import { MOCK_STORES } from '../data/storeMockData';
import { createLogger } from '../utils/logger';
import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';

import { getFirestoreDb } from './firestoreDb';

const log = createLogger('RestaurantService');
const RESTAURANTS_COLLECTION = 'restaurants';

export async function fetchRestaurants(type = 'all') {
  log.info('fetchRestaurants:start', { type });

  try {
    const db = getFirestoreDb();
    const restaurantsRef = collection(db, RESTAURANTS_COLLECTION);
    const snapshot =
      type === 'all'
        ? await getDocs(restaurantsRef)
        : await getDocs(query(restaurantsRef, where('type', '==', type)));

    const data = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));

    if (data.length > 0) {
      const merged = mergeWithMockRestaurants(data, type);
      log.ok('fetchRestaurants:firestore', { type, count: merged.length });
      return merged;
    }

    log.warn('fetchRestaurants:empty-firestore', { type });
  } catch (error) {
    log.fail('fetchRestaurants:firestore-failed', error);
  }

  const mockData = getFilteredMockRestaurants(type);
  log.info('fetchRestaurants:mock-fallback', { type, count: mockData.length });
  return mockData;
}

function mergeWithMockRestaurants(remoteData, type) {
  const mockFiltered = getFilteredMockRestaurants(type);
  const existingIds = new Set(remoteData.map((r) => String(r.id)));
  const extras = mockFiltered.filter((r) => !existingIds.has(String(r.id)));
  return [...remoteData, ...extras];
}

function getFilteredMockRestaurants(type) {
  if (type === 'all') {
    return MOCK_STORES;
  }
  return MOCK_STORES.filter((r) => r.type === type);
}
