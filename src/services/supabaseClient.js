import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import { assertBackendEnv, supabaseConfig } from './env';

let client;

export function ensureSupabaseClient() {
  assertBackendEnv();

  if (!client) {
    client = createClient(supabaseConfig.url, supabaseConfig.key, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }

  return client;
}
