const { initializeApp, getApps, getApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const path = require('path');
const fs = require('fs');

function loadServiceAccountFromFile() {
  const jsonEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (jsonEnv) {
    return JSON.parse(jsonEnv);
  }

  const accountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (accountPath) {
    const resolved = path.isAbsolute(accountPath)
      ? accountPath
      : path.resolve(process.cwd(), accountPath);
    return JSON.parse(fs.readFileSync(resolved, 'utf8'));
  }

  return null;
}

function loadServiceAccountFromEnv() {
  try {
    const {
      firebaseProjectId,
      firebaseClientEmail,
      firebasePrivateKey,
    } = require('./env');

    if (firebaseProjectId && firebaseClientEmail && firebasePrivateKey) {
      return {
        project_id: firebaseProjectId,
        client_email: firebaseClientEmail,
        private_key: firebasePrivateKey,
      };
    }
  } catch {
    // env.js may throw if required vars are missing during partial setup.
  }

  return null;
}

function initFirebaseAdmin() {
  if (getApps().length > 0) {
    const app = getApp();
    return { app, auth: getAuth(app) };
  }

  const serviceAccount = loadServiceAccountFromFile() || loadServiceAccountFromEnv();
  const projectId =
    serviceAccount?.project_id ||
    process.env.FIREBASE_PROJECT_ID ||
    'fastmark-e881d';

  const app = serviceAccount
    ? initializeApp({
        credential: cert(serviceAccount),
        projectId,
      })
    : initializeApp({ projectId });

  if (!serviceAccount) {
    console.warn(
      '[Firebase Admin] No service account configured. Token verify uses projectId only.'
    );
  }

  console.log('Firebase Admin initialized:', app.name);
  return { app, auth: getAuth(app) };
}

const { app, auth } = initFirebaseAdmin();

module.exports = {
  initFirebaseAdmin,
  admin: app,
  auth,
  app,
};
