/** First letter of a display name, uppercase. Used for default avatars. */
export function getAvatarInitial(name, fallback = '?') {
  const text = String(name || '')
    .trim()
    .replace(/^@+/, '');
  if (!text) {
    return fallback;
  }
  const char = text.charAt(0);
  return char ? char.toLocaleUpperCase('vi-VN') : fallback;
}

export function isRemoteAvatarUrl(value) {
  return /^https?:\/\//i.test(String(value || '').trim());
}
