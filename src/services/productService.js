import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';

import { getMockProductById, getMockProductsByStoreId } from '../data/storeMockData';
import { createLogger } from '../utils/logger';
import { getFirestoreDb } from './firestoreDb';

const log = createLogger('ProductService');
const PRODUCTS_COLLECTION = 'products';

export async function fetchProductsByStoreId(storeId) {
  log.info('fetchProductsByStoreId:start', { storeId });

  try {
    const db = getFirestoreDb();
    const snapshot = await getDocs(
      query(collection(db, PRODUCTS_COLLECTION), where('store_id', '==', String(storeId)))
    );

    if (!snapshot.empty) {
      const products = snapshot.docs
        .map((docSnap) => normalizeProduct({ id: docSnap.id, ...docSnap.data() }))
        .sort((a, b) => String(a.id).localeCompare(String(b.id)));

      if (products.length > 0) {
        log.ok('fetchProductsByStoreId:firestore', { storeId, count: products.length });
        return products;
      }
    }

    log.warn('fetchProductsByStoreId:empty-firestore', { storeId });
  } catch (error) {
    log.fail('fetchProductsByStoreId:firestore-failed', error);
  }

  const mockProducts = getMockProductsByStoreId(storeId);
  if (mockProducts.length > 0) {
    log.info('fetchProductsByStoreId:mock', { storeId, count: mockProducts.length });
    return mockProducts;
  }

  const fallback = makeFallbackProducts(storeId);
  log.info('fetchProductsByStoreId:fallback', { storeId, count: fallback.length });
  return fallback;
}

export async function fetchProductById(productId) {
  log.info('fetchProductById:start', { productId });

  const fallbackProduct = getFallbackProductById(productId);
  if (fallbackProduct) {
    log.ok('fetchProductById:fallback-hit', { productId });
    return fallbackProduct;
  }

  try {
    const db = getFirestoreDb();
    const snapshot = await getDoc(doc(db, PRODUCTS_COLLECTION, String(productId)));

    if (snapshot.exists()) {
      const product = normalizeProduct({ id: snapshot.id, ...snapshot.data() });
      log.ok('fetchProductById:firestore', { productId, name: product.name });
      return product;
    }

    log.warn('fetchProductById:not-found-firestore', { productId });
  } catch (error) {
    log.fail('fetchProductById:firestore-failed', error);
  }

  const mockProduct = getMockProductById(productId);
  log.info('fetchProductById:mock', { productId, found: Boolean(mockProduct) });
  return mockProduct;
}

function normalizeProduct(row) {
  return {
    id: row.id,
    store_id: row.store_id,
    name: row.name,
    price: row.price,
    description: row.description || '',
    image_emoji: row.image_emoji || '📦',
  };
}

function makeFallbackProducts(storeId) {
  return [
    {
      id: `fallback-${storeId}-1`,
      store_id: storeId,
      name: 'Sản phẩm bán chạy',
      price: 35000,
      description: 'Sản phẩm mẫu của gian hàng, dùng để test màn hình chi tiết sản phẩm.',
      image_emoji: '⭐',
    },
    {
      id: `fallback-${storeId}-2`,
      store_id: storeId,
      name: 'Combo tiết kiệm',
      price: 59000,
      description: 'Combo mẫu có giá ưu đãi, phù hợp để kiểm tra danh sách sản phẩm đang bán.',
      image_emoji: '🛍️',
    },
    {
      id: `fallback-${storeId}-3`,
      store_id: storeId,
      name: 'Món mới hôm nay',
      price: 45000,
      description: 'Món mới được tạo tự động khi gian hàng chưa có dữ liệu sản phẩm thật.',
      image_emoji: '🔥',
    },
  ];
}

function getFallbackProductById(productId) {
  const match = String(productId).match(/^fallback-(.+)-([123])$/);
  if (!match) {
    return null;
  }

  const [, storeId] = match;
  return makeFallbackProducts(storeId).find((product) => product.id === productId) || null;
}
