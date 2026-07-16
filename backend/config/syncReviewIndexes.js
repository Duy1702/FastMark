/**
 * Drop legacy unique indexes on reviews after unifying BuyerReview → Review.
 */
async function syncReviewCollectionIndexes(connection) {
  const db = connection.db;
  if (!db) {
    return;
  }

  const reviews = db.collection("reviews");
  let indexes = [];
  try {
    indexes = await reviews.indexes();
  } catch {
    return;
  }

  const indexByName = new Map(indexes.map((idx) => [idx.name, idx]));

  const stale = ["externalId_1", "store_id_1", "user_name_1"];
  for (const name of stale) {
    if (indexByName.has(name)) {
      try {
        await reviews.dropIndex(name);
        console.log(`Dropped stale reviews index: ${name}`);
        indexByName.delete(name);
      } catch (error) {
        console.warn(`Could not drop reviews index ${name}:`, error.message);
      }
    }
  }

  const desired = [
    { keys: { storeId: 1, CreatedAt: -1 }, options: { name: "storeId_1_CreatedAt_-1" } },
    { keys: { userId: 1, CreatedAt: -1 }, options: { name: "userId_1_CreatedAt_-1" } },
    { keys: { legacyExternalId: 1 }, options: { name: "legacyExternalId_1", sparse: true } },
    { keys: { orderCode: 1 }, options: { name: "orderCode_1_sparse", sparse: true } },
  ];

  for (const item of desired) {
    if (indexByName.has(item.options.name)) {
      continue;
    }
    try {
      await reviews.createIndex(item.keys, item.options);
    } catch (error) {
      console.warn(`Could not create reviews index ${item.options.name}:`, error.message);
    }
  }
}

module.exports = { syncReviewCollectionIndexes };
