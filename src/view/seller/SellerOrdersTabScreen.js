import { useEffect, useState } from 'react';
import SellerOrdersScreen from '../seller/SellerOrdersScreen';
import SellerOrderDetailScreen from '../seller/SellerOrderDetailScreen';

export default function SellerOrdersTabScreen({ onNavigationStateChange }) {
  const [selectedReservationId, setSelectedReservationId] = useState(null);
  const [ordersRefreshKey, setOrdersRefreshKey] = useState(0);

  useEffect(() => {
    onNavigationStateChange?.(Boolean(selectedReservationId));
  }, [onNavigationStateChange, selectedReservationId]);

  if (selectedReservationId) {
    return (
      <SellerOrderDetailScreen
        reservationId={selectedReservationId}
        onBack={() => setSelectedReservationId(null)}
        onChanged={() => setOrdersRefreshKey((value) => value + 1)}
      />
    );
  }

  return (
    <SellerOrdersScreen
      embedded
      onRefreshKey={ordersRefreshKey}
      onOpenReservation={setSelectedReservationId}
    />
  );
}
