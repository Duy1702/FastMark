import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';

import LeafletMap from '../../components/LeafletMap';
import { calculateDistanceMeters, hasValidLocation, normalizeExpoLocation } from '../../utils/geo';
import { fetchRestaurants } from '../../services/restaurantService';

export default function MapScreen({ children }) {
  const watcherRef = useRef(null);
  const mountedRef = useRef(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [recenterSignal, setRecenterSignal] = useState(0);

  // States for new features
  const [menuVisible, setMenuVisible] = useState(false);
  const [measureEnabled, setMeasureEnabled] = useState(false);
  const [clearSignal, setClearSignal] = useState(0);
  const [measurement, setMeasurement] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('none');
  const [restaurants, setRestaurants] = useState([]);
  const lastAcceptedRef = useRef(null);

  const startLocationTracking = useCallback(async () => {
    watcherRef.current?.remove();
    watcherRef.current = null;

    const updateLocationSafely = (loc) => {
      if (!loc || !mountedRef.current) {
        return;
      }

      const prev = lastAcceptedRef.current;
      if (!prev) {
        // Chưa có vị trí nào: Nhận ngay lập tức để định vị bản đồ đúng thành phố/khu vực
        lastAcceptedRef.current = loc;
        setCurrentLocation(loc);
        return;
      }

      // Đã có vị trí: Lọc nhiễu chống nhảy vị trí
      // 1. Bỏ qua nếu độ chính xác quá thấp (> 150m)
      if (loc.accuracy > 150) {
        return;
      }

      // 2. Bỏ qua nếu vị trí chưa thực sự thay đổi đáng kể (< 3m) để tránh rung lắc
      const dist = calculateDistanceMeters(prev, loc);
      if (dist !== null && dist < 3) {
        return;
      }

      lastAcceptedRef.current = loc;
      setCurrentLocation(loc);
    };

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (!mountedRef.current || permission.status !== 'granted') {
        return;
      }

      // 1. Thử lấy vị trí cũ nhanh
      const lastKnown = await Location.getLastKnownPositionAsync({
        maxAge: 60000,
        requiredAccuracy: 200,
      }).catch(() => null);

      if (mountedRef.current && lastKnown) {
        updateLocationSafely(normalizeExpoLocation(lastKnown));
      }

      // 2. Thử lấy vị trí GPS chính xác cao ngay lập tức
      const preciseLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      }).catch(() => null);

      if (mountedRef.current && preciseLocation) {
        updateLocationSafely(normalizeExpoLocation(preciseLocation));
      }

      // 3. Theo dõi liên tục
      const watcher = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 1,
          timeInterval: 2000,
        },
        (location) => {
          updateLocationSafely(normalizeExpoLocation(location));
        }
      );

      if (mountedRef.current) {
        watcherRef.current = watcher;
      } else {
        watcher.remove();
      }
    } catch {
      // Keep the map usable even when location services are unavailable.
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    startLocationTracking();

    return () => {
      mountedRef.current = false;
      watcherRef.current?.remove();
      watcherRef.current = null;
    };
  }, [startLocationTracking]);

  // Fetch restaurants when category changes
  useEffect(() => {
    if (selectedCategory === 'none') {
      setRestaurants([]);
      return;
    }

    let isCurrent = true;
    fetchRestaurants(selectedCategory).then((data) => {
      if (isCurrent) {
        setRestaurants(data);
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [selectedCategory]);

  function handleRecenterPress() {
    if (hasValidLocation(currentLocation)) {
      setRecenterSignal((value) => value + 1);
      return;
    }

    startLocationTracking();
  }

  function handleMapEvent(payload) {
    if (payload.type === 'measurement') {
      setMeasurement(payload);
    }
  }

  function handleClearMeasure() {
    setClearSignal((prev) => prev + 1);
    setMeasurement(null);
  }

  function toggleMeasureMode() {
    const nextState = !measureEnabled;
    setMeasureEnabled(nextState);
    if (!nextState) {
      handleClearMeasure();
    }
  }

  const restaurantCategories = [
    { key: 'none', label: '🚫 Ẩn tất cả' },
    { key: 'all', label: '🌐 Tất cả quán' },
    { key: 'cafe', label: '☕ Cà phê' },
    { key: 'food', label: '🍜 Quán ăn' },
    { key: 'milktea', label: '🧋 Trà sữa' },
    { key: 'snack', label: '🍿 Ăn vặt' },
  ];

  return (
    <View style={styles.container}>
      <LeafletMap
        currentLocation={currentLocation}
        measureEnabled={measureEnabled}
        clearSignal={clearSignal}
        recenterSignal={recenterSignal}
        restaurants={restaurants}
        onEvent={handleMapEvent}
      />

      {children}

      {/* Floating Menu Button (3-dot icon) */}
      <View style={styles.menuOverlay} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.menuButton,
            pressed && styles.menuButtonPressed,
            menuVisible && styles.menuButtonActive,
          ]}
          onPress={() => setMenuVisible(!menuVisible)}
        >
          <Text style={[styles.menuButtonText, menuVisible && styles.menuButtonTextActive]}>
            {menuVisible ? '✕' : '⚙️'}
          </Text>
        </Pressable>
      </View>

      {/* Dropdown Menu Card */}
      {menuVisible && (
        <View style={styles.dropdownCard}>
          <Text style={styles.menuHeader}>Bản đồ tiện ích</Text>

          {/* Toggle Measure */}
          <Pressable
            style={[styles.menuItem, measureEnabled && styles.menuItemActive]}
            onPress={toggleMeasureMode}
          >
            <Text style={styles.menuItemEmoji}>📏</Text>
            <Text style={[styles.menuItemText, measureEnabled && styles.menuItemTextActive]}>
              Đo khoảng cách: {measureEnabled ? 'Bật' : 'Tắt'}
            </Text>
          </Pressable>

          <View style={styles.divider} />
          
          <Text style={styles.menuSubHeader}>Loại quán hiển thị</Text>
          {restaurantCategories.map((cat) => {
            const isSelected = selectedCategory === cat.key;
            return (
              <Pressable
                key={cat.key}
                style={[styles.categoryItem, isSelected && styles.categoryItemActive]}
                onPress={() => setSelectedCategory(cat.key)}
              >
                <Text style={[styles.categoryText, isSelected && styles.categoryTextActive]}>
                  {cat.label}
                </Text>
                {isSelected && <Text style={styles.checkmark}>✓</Text>}
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Distance Measurement Result Banner */}
      {measureEnabled && measurement && measurement.pointCount > 0 && (
        <View style={styles.measureBanner}>
          <View style={styles.measureInfo}>
            <Text style={styles.measureLabel}>Thước đo khoảng cách</Text>
            <Text style={styles.measureDistance}>{measurement.formattedDistance}</Text>
            <Text style={styles.measurePoints}>Số điểm chọn: {measurement.pointCount}</Text>
          </View>
          <Pressable style={styles.clearMeasureButton} onPress={handleClearMeasure}>
            <Text style={styles.clearMeasureButtonText}>Xóa đo</Text>
          </Pressable>
        </View>
      )}

      {/* Recenter Button */}
      <View style={styles.recenterOverlay} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.recenterButton,
            pressed && styles.recenterButtonPressed,
          ]}
          onPress={handleRecenterPress}
        >
          <Text style={styles.recenterButtonText}>Về vị trí của tôi</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eef2f0',
  },
  recenterOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    paddingRight: 16,
    paddingBottom: 16,
  },
  recenterButton: {
    minHeight: 44,
    borderRadius: 999,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0ea5e9',
    // Cross-platform standard shadow
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 6,
  },
  recenterButtonPressed: {
    opacity: 0.78,
  },
  recenterButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  menuOverlay: {
    position: 'absolute',
    top: 104,
    right: 16,
    zIndex: 999,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  menuButtonPressed: {
    opacity: 0.85,
  },
  menuButtonActive: {
    backgroundColor: '#0f766e',
  },
  menuButtonText: {
    fontSize: 20,
    color: '#0f172a',
  },
  menuButtonTextActive: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dropdownCard: {
    position: 'absolute',
    top: 156,
    right: 16,
    width: 200,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    padding: 12,
    zIndex: 999,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  menuHeader: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 8,
  },
  menuSubHeader: {
    fontSize: 12,
    fontWeight: '750',
    color: '#64748b',
    marginTop: 8,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  menuItemActive: {
    backgroundColor: '#f0fdf4',
  },
  menuItemEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  menuItemText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  menuItemTextActive: {
    color: '#15803d',
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  categoryItemActive: {
    backgroundColor: '#f1f5f9',
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  categoryTextActive: {
    color: '#0f766e',
    fontWeight: '800',
  },
  checkmark: {
    fontSize: 13,
    color: '#0f766e',
    fontWeight: 'bold',
  },
  measureBanner: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 998,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  measureInfo: {
    flex: 1,
  },
  measureLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  measureDistance: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    marginVertical: 2,
  },
  measurePoints: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '550',
  },
  clearMeasureButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  clearMeasureButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
});
