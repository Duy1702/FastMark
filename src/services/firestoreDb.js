import { getFirestore } from 'firebase/firestore';

import { createLogger } from '../utils/logger';
import { ensureFirebaseApp } from './firebaseApp';

const log = createLogger('FirestoreDb');

export function getFirestoreDb() {
  log.debug('getFirestoreDb');
  return getFirestore(ensureFirebaseApp());
}
