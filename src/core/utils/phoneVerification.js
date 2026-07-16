export function getPhoneGateStep(profile) {
  const phone = String(profile?.phone || '').trim();
  if (!/^\d{10}$/.test(phone)) {
    return 'setup';
  }
  if (!profile?.sellerPhoneVerified) {
    return 'verify';
  }
  return null;
}

export function isPhoneVerifiedForTrade(profile) {
  return getPhoneGateStep(profile) == null;
}
