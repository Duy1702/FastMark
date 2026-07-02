import { ensureSupabaseClient } from './supabaseClient';

const MOCK_RESTAURANTS = [
  { id: '1', name: 'Cà phê Vy', type: 'cafe', latitude: 10.7780, longitude: 106.7020, address: '277 Phan Xích Long, Q. Phú Nhuận' },
  { id: '2', name: 'Bánh Mì Huỳnh Hoa', type: 'food', latitude: 10.7755, longitude: 106.6990, address: '26 Lê Thị Riêng, Q.1' },
  { id: '3', name: 'Phở Lệ', type: 'food', latitude: 10.7795, longitude: 106.6985, address: '415 Nguyễn Trãi, Q.5' },
  { id: '4', name: 'Trà Sữa Gong Cha', type: 'milktea', latitude: 10.7740, longitude: 106.7035, address: '79 Hồ Tùng Mậu, Q.1' },
  { id: '5', name: 'Ăn Vặt Hồ Con Rùa', type: 'snack', latitude: 10.7825, longitude: 106.6960, address: 'Công Trường Quốc Tế, Q.3' }
];

export async function fetchRestaurants(type = 'all') {
  try {
    const supabase = ensureSupabaseClient();
    let query = supabase.from('restaurants').select('*');
    
    if (type !== 'all') {
      query = query.eq('type', type);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.warn('Supabase fetch error, using fallback mock data:', error.message);
      return getFilteredMockRestaurants(type);
    }
    
    if (data && data.length > 0) {
      return data;
    }
    
    return getFilteredMockRestaurants(type);
  } catch (err) {
    console.warn('Supabase not connected or table not found, using mock data:', err);
    return getFilteredMockRestaurants(type);
  }
}

function getFilteredMockRestaurants(type) {
  if (type === 'all') {
    return MOCK_RESTAURANTS;
  }
  return MOCK_RESTAURANTS.filter((r) => r.type === type);
}
