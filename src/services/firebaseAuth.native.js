import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from 'firebase/auth';

import { ensureFirebaseApp } from './firebaseApp';

function isAlreadyInitialized(error) {
  return error?.code === 'auth/already-initialized';
}

export function ensureFirebaseAuth() {
  const app = ensureFirebaseApp();

  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error) {
    if (isAlreadyInitialized(error)) {
      return getAuth(app);
    }

    throw error;
  }
}
