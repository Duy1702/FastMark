import Constants from 'expo-constants';

import { firebaseConfig, getFirebaseConfigSummary } from '../services/env';
import { createLogger } from './logger';

const log = createLogger('NetworkDiag');

const PROBE_TIMEOUT_MS = 8000;

async function probeUrl(label, url, options = {}) {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    return {
      label,
      url,
      ok: response.ok,
      status: response.status,
      ms: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      label,
      url,
      ok: false,
      status: null,
      ms: Date.now() - startedAt,
      error: error?.message || String(error),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function probePublicIp() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }
    const data = await response.json();
    return { ok: true, ip: data?.ip || null };
  } catch (error) {
    return { ok: false, error: error?.message || String(error) };
  }
}

function getMetroHost() {
  return (
    Constants.expoGoConfig?.debuggerHost ||
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    null
  );
}

function summarizeProbe(probe) {
  if (probe.ok) {
    return `${probe.label}: OK (${probe.status}, ${probe.ms}ms)`;
  }

  return `${probe.label}: FAIL — ${probe.error || probe.status || 'unknown'}`;
}

export async function runFirebaseNetworkDiagnostics() {
  const authDomain = firebaseConfig.authDomain;
  const apiKey = firebaseConfig.apiKey;

  log.info('diagnostics:start', getFirebaseConfigSummary());

  const probes = await Promise.all([
    probeUrl('Google', 'https://www.google.com/generate_204'),
    probeUrl('Google APIs', 'https://www.googleapis.com'),
    authDomain
      ? probeUrl('Firebase Auth Domain', `https://${authDomain}`)
      : Promise.resolve({
          label: 'Firebase Auth Domain',
          url: '(missing authDomain)',
          ok: false,
          error: 'Thiếu EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
        }),
    apiKey
      ? probeUrl(
          'Firebase Identity Toolkit',
          `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: 'probe' }),
          }
        )
      : Promise.resolve({
          label: 'Firebase Identity Toolkit',
          url: '(missing apiKey)',
          ok: false,
          error: 'Thiếu EXPO_PUBLIC_FIREBASE_API_KEY',
        }),
  ]);

  const publicIp = await probePublicIp();
  const metroHost = getMetroHost();

  const lines = probes.map(summarizeProbe);

  if (publicIp.ok) {
    lines.push(`IP công khai máy bạn: ${publicIp.ip}`);
  } else {
    lines.push(`IP công khai: không lấy được — ${publicIp.error}`);
  }

  if (metroHost) {
    lines.push(`Metro server (LAN): ${metroHost}`);
    lines.push('Lưu ý: Metro chỉ tải code app. Firebase chạy qua Internet, không qua IP Metro.');
  }

  const identityProbe = probes[3];
  const googleProbe = probes[0];
  const apisProbe = probes[1];

  let hint = '';
  if (!googleProbe.ok && !apisProbe.ok) {
    hint =
      'Máy bạn không ra Internet/Google được. Thử 4G, tắt VPN, đổi WiFi (guest WiFi thường chặn).';
  } else if (googleProbe.ok && apisProbe.ok && identityProbe.ok === false && identityProbe.status === 403) {
    hint =
      'Internet OK nhưng Firebase API key bị chặn (403). Vào Google Cloud → Credentials → kiểm tra API key restrictions.';
  } else if (googleProbe.ok && apisProbe.ok && identityProbe.error) {
    hint =
      'Internet OK nhưng không gọi được identitytoolkit.googleapis.com. WiFi/firewall có thể chặn Firebase.';
  } else if (identityProbe.ok || identityProbe.status === 400) {
    hint = 'Kết nối Firebase OK (400/403 từ API là bình thường khi probe). Thử đăng nhập lại.';
  }

  const report = {
    config: getFirebaseConfigSummary(),
    metroHost,
    publicIp: publicIp.ip || null,
    probes,
    lines,
    hint,
  };

  log.info('diagnostics:report', report);
  return report;
}

export function formatDiagnosticsReport(report) {
  return [...report.lines, report.hint ? `\n→ ${report.hint}` : ''].filter(Boolean).join('\n');
}
