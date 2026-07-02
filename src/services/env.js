const env = process.env || {};

export const firebaseConfig = {
  apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const supabaseConfig = {
  url: env.EXPO_PUBLIC_SUPABASE_URL,
  key: env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
};

const firebaseRequiredKeys = [
  ['EXPO_PUBLIC_FIREBASE_API_KEY', 'apiKey'],
  ['EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', 'authDomain'],
  ['EXPO_PUBLIC_FIREBASE_PROJECT_ID', 'projectId'],
  ['EXPO_PUBLIC_FIREBASE_APP_ID', 'appId'],
];

export function getMissingFirebaseEnv() {
  return firebaseRequiredKeys
    .filter(([, configKey]) => !firebaseConfig[configKey])
    .map(([envKey]) => envKey);
}

export function getMissingSupabaseEnv() {
  const missing = [];

  if (!supabaseConfig.url) {
    missing.push('EXPO_PUBLIC_SUPABASE_URL');
  }

  if (!supabaseConfig.key) {
    missing.push('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  }

  return missing;
}

export function getMissingBackendEnv() {
  return [...getMissingFirebaseEnv(), ...getMissingSupabaseEnv()];
}

export function assertBackendEnv() {
  const missing = getMissingBackendEnv();

  if (missing.length > 0) {
    throw new Error(`Thieu cau hinh ket noi: ${missing.join(', ')}`);
  }
}

export function getBackendConfigError() {
  const missing = getMissingBackendEnv();

  if (missing.length === 0) {
    return '';
  }

  return `Can bo sung cac bien trong .env: ${missing.join(', ')}`;
}
