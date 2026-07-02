import {
  browserLocalPersistence,
  getAuth,
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
      persistence: browserLocalPersistence,
    });
  } catch (error) {
    if (isAlreadyInitialized(error)) {
      return getAuth(app);
    }

    throw error;
  }
}
