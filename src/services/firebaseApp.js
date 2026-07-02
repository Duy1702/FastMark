import { getApp, getApps, initializeApp } from 'firebase/app';

import { assertBackendEnv, firebaseConfig } from './env';

export function ensureFirebaseApp() {
  assertBackendEnv();

  if (getApps().length > 0) {
    return getApp();
  }

  return initializeApp(firebaseConfig);
}
