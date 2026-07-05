import { getApp, getApps, initializeApp } from 'firebase/app';

import { createLogger } from '../utils/logger';
import { assertBackendEnv, firebaseConfig } from './env';

const log = createLogger('FirebaseApp');

export function ensureFirebaseApp() {
  assertBackendEnv();

  if (getApps().length > 0) {
    log.debug('ensureFirebaseApp:reuse-existing');
    return getApp();
  }

  log.info('ensureFirebaseApp:init', { projectId: firebaseConfig.projectId });
  return initializeApp(firebaseConfig);
}
