import { apiRequest, AUTH_TIMEOUT_MS } from './client';
import { callWithAuthToken } from './authTokenHelper';
import { API_ENDPOINTS } from './endpoints';

async function parseApiResponse(response) {
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    const error = new Error(payload.message || 'Yêu cầu API thất bại.');
    error.statusCode = response.status;
    throw error;
  }

  return payload;
}

function toAudienceQuery(audience) {
  const value = String(audience || 'buyer').trim().toLowerCase();
  if (value === 'seller' || value === 'system') {
    return `?audience=${encodeURIComponent(value)}`;
  }
  return '?audience=buyer';
}

export async function getMyNotificationsOnBackend(audience = 'buyer') {
  return callWithAuthToken(async (idToken) => {
    const response = await apiRequest(
      `${API_ENDPOINTS.notifications}${toAudienceQuery(audience)}`,
      { method: 'GET', headers: { Authorization: `Bearer ${idToken}` } },
      AUTH_TIMEOUT_MS
    );
    const payload = await parseApiResponse(response);
    return payload.data?.items || [];
  });
}

export async function markNotificationReadOnBackend(notificationId, audience = 'buyer') {
  const id = encodeURIComponent(String(notificationId || '').trim());
  if (!id) {
    throw new Error('Thiếu mã thông báo.');
  }

  return callWithAuthToken(async (idToken) => {
    const response = await apiRequest(
      `${API_ENDPOINTS.notificationRead(id)}${toAudienceQuery(audience)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ audience }),
      },
      AUTH_TIMEOUT_MS
    );
    const payload = await parseApiResponse(response);
    return payload.data?.notification;
  });
}

export async function markAllNotificationsReadOnBackend(audience = 'buyer') {
  return callWithAuthToken(async (idToken) => {
    const response = await apiRequest(
      `${API_ENDPOINTS.notificationsReadAll}${toAudienceQuery(audience)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ audience }),
      },
      AUTH_TIMEOUT_MS
    );
    const payload = await parseApiResponse(response);
    return payload.data;
  });
}
