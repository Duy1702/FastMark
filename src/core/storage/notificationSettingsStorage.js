import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'fastmark:notification-settings';

const DEFAULT_SETTINGS = {
  orderNotifications: true,
  systemNotifications: true,
};

export async function loadNotificationSettings() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_SETTINGS };
    }
    const parsed = JSON.parse(raw);
    return {
      orderNotifications: parsed.orderNotifications !== false,
      systemNotifications: parsed.systemNotifications !== false,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveNotificationSettings(settings) {
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      orderNotifications: Boolean(settings.orderNotifications),
      systemNotifications: Boolean(settings.systemNotifications),
    })
  );
}
