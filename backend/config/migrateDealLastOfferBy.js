/**
 * Migrate DealOffer: sellerCounterPrice → lastOfferBy + single offeredPrice.
 * Idempotent via _migrations.deal_last_offer_by_v1.
 */
async function migrateDealLastOfferBy(connection) {
  const db = connection.db;
  if (!db) {
    return { skipped: true, reason: "no-db" };
  }

  const meta = db.collection("_migrations");
  const already = await meta.findOne({ _id: "deal_last_offer_by_v1" });
  if (already) {
    return { skipped: true, reason: "already-done" };
  }

  const deals = db.collection("dealoffers");
  let migrated = 0;

  const cursor = deals.find({});
  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    const set = {};
    const unset = {};

    const hasCounter =
      doc.sellerCounterPrice != null &&
      doc.sellerCounterPrice !== "" &&
      Number.isFinite(Number(doc.sellerCounterPrice));

    if (hasCounter) {
      // Active offer on table was shop's counter
      set.offeredPrice = Number(doc.sellerCounterPrice);
      set.lastOfferBy = 2; // SELLER
    } else if (doc.lastOfferBy == null) {
      set.lastOfferBy = 1; // BUYER
    }

    if (doc.sellerCounterPrice !== undefined) {
      unset.sellerCounterPrice = "";
    }

    const ops = {};
    if (Object.keys(set).length) {
      ops.$set = set;
    }
    if (Object.keys(unset).length) {
      ops.$unset = unset;
    }
    if (Object.keys(ops).length) {
      await deals.updateOne({ _id: doc._id }, ops);
      migrated += 1;
    }
  }

  await meta.updateOne(
    { _id: "deal_last_offer_by_v1" },
    { $set: { at: new Date(), migrated } },
    { upsert: true }
  );

  return { migrated };
}

module.exports = { migrateDealLastOfferBy };
