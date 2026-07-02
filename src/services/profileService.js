import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore';

import { ensureFirebaseApp } from './firebaseApp';
import { ensureSupabaseClient } from './supabaseClient';

const PROFILE_COLLECTION = 'profiles';
const PROFILE_TABLE = 'profiles';

function nowIso() {
  return new Date().toISOString();
}

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function makeProfileFromAuthUser(authUser, updates = {}) {
  const timestamp = nowIso();

  return {
    id: authUser.uid,
    email: authUser.email || '',
    fullName: cleanText(updates.fullName) || authUser.displayName || '',
    phone: cleanText(updates.phone),
    photoUrl: cleanText(updates.photoUrl) || authUser.photoURL || '',
    createdAt: updates.createdAt || timestamp,
    updatedAt: timestamp,
  };
}

function mergeProfile(authUser, baseProfile, updates = {}) {
  const fallback = makeProfileFromAuthUser(authUser, baseProfile || {});

  return {
    ...fallback,
    ...baseProfile,
    email: authUser.email || baseProfile?.email || '',
    fullName:
      updates.fullName !== undefined
        ? cleanText(updates.fullName)
        : baseProfile?.fullName || fallback.fullName,
    phone:
      updates.phone !== undefined
        ? cleanText(updates.phone)
        : baseProfile?.phone || fallback.phone,
    photoUrl:
      updates.photoUrl !== undefined
        ? cleanText(updates.photoUrl)
        : baseProfile?.photoUrl || fallback.photoUrl,
    updatedAt: nowIso(),
  };
}

function profileToSupabaseRow(profile) {
  return {
    id: profile.id,
    email: profile.email,
    full_name: profile.fullName,
    phone: profile.phone,
    photo_url: profile.photoUrl,
    created_at: profile.createdAt,
    updated_at: profile.updatedAt,
  };
}

function rowToProfile(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    email: row.email || '',
    fullName: row.full_name || '',
    phone: row.phone || '',
    photoUrl: row.photo_url || '',
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

function getProfilesCollection() {
  const db = getFirestore(ensureFirebaseApp());
  return db;
}

async function readFirebaseProfile(uid) {
  const db = getProfilesCollection();
  const snapshot = await getDoc(doc(db, PROFILE_COLLECTION, uid));

  return snapshot.exists() ? snapshot.data() : null;
}

async function saveFirebaseProfile(profile) {
  const db = getProfilesCollection();
  await setDoc(doc(db, PROFILE_COLLECTION, profile.id), profile, { merge: true });
}

async function readSupabaseProfile(uid) {
  const supabase = ensureSupabaseClient();
  const { data, error } = await supabase
    .from(PROFILE_TABLE)
    .select('*')
    .eq('id', uid)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return rowToProfile(data);
}

async function saveSupabaseProfile(profile) {
  const supabase = ensureSupabaseClient();
  const { data, error } = await supabase
    .from(PROFILE_TABLE)
    .upsert(profileToSupabaseRow(profile), { onConflict: 'id' })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return rowToProfile(data);
}

export async function readUserProfile(authUser) {
  const [firebaseResult, supabaseResult] = await Promise.allSettled([
    readFirebaseProfile(authUser.uid),
    readSupabaseProfile(authUser.uid),
  ]);

  if (supabaseResult.status === 'rejected') {
    throw supabaseResult.reason;
  }

  const firebaseProfile =
    firebaseResult.status === 'fulfilled' ? firebaseResult.value : null;
  const supabaseProfile = supabaseResult.value;

  return mergeProfile(authUser, supabaseProfile || firebaseProfile || null);
}

export async function upsertUserProfile(authUser, updates = {}) {
  const currentProfile = await readUserProfile(authUser).catch(() => null);
  const profile = mergeProfile(authUser, currentProfile, updates);

  await Promise.all([saveFirebaseProfile(profile), saveSupabaseProfile(profile)]);

  return profile;
}
