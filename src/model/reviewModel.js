export function normalizeReview(row) {
  const imageUrl = row.imageUrl || row.image_url || '';
  return {
    id: row.id,
    store_id: row.store_id || row.storeId || '',
    user_name: row.user_name || row.userName || 'Khách hàng',
    rating: row.rating,
    comment: row.comment || '',
    image_url: imageUrl,
    imageUrl,
    created_at: row.created_at || row.createdAt || null,
    createdAt: row.created_at || row.createdAt || null,
  };
}
