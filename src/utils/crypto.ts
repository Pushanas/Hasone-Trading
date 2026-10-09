// Unified Master Cryptographic Engine, 1-Device/IP License Engine & Server Sync for Al-Areen Al-Dahabi
import { clientVerifyLicense } from './clientLicenseEngine';

const DEFAULT_VAULT = {
  saltB64: 'uXuniMOMGKZO7q8iZONJKg==',
  hashB64: 'D/ZnpnsivcWenhYN4FKUiruJWhnU11mvmKfVn9cmEYg=',
  iterations: 210000,
};

function b64ToBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const buf = new ArrayBuffer(bin.length);
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return buf;
}

function bufferToB64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Gets or creates a persistent device fingerprint for single-device hardware lock.
 */
export function getDeviceFingerprint(): string {
  let fp = localStorage.getItem('areen_dev_fp');
  if (!fp) {
    const nav = window.navigator;
    const scr = window.screen;
    const raw = [
      nav.userAgent || '',
      nav.language || '',
      scr ? `${scr.width}x${scr.height}x${scr.colorDepth}` : '',
      new Date().getTimezoneOffset(),
      Math.random().toString(36),
    ].join('###');

    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = (hash << 5) - hash + raw.charCodeAt(i);
      hash |= 0;
    }
    fp = 'dev_' + Math.abs(hash).toString(16) + '_' + Date.now().toString(36);
    localStorage.setItem('areen_dev_fp', fp);
  }
  return fp;
}

// Client-side local PBKDF2 verification fallback
async function localPbkdf2Verify(password: string): Promise<boolean> {
  try {
    const customSaltB64 = localStorage.getItem('areen_auth_salt');
    const customHashB64 = localStorage.getItem('areen_auth_hash');

    const saltB64 = customSaltB64 || DEFAULT_VAULT.saltB64;
    const expectedHashB64 = customHashB64 || DEFAULT_VAULT.hashB64;

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: b64ToBuffer(saltB64),
        iterations: DEFAULT_VAULT.iterations,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    );

    const derivedB64 = bufferToB64(derivedBits);
    return derivedB64 === expectedHashB64;
  } catch {
    return false;
  }
}

/**
 * Verifies Master Password or 1-Month Single-Device/IP VIP License Key
 */
export async function verifyMasterPassword(
  inputSecret: string
): Promise<{
  success: boolean;
  error?: string;
  sessionVersion?: string;
  licenseInfo?: {
    code: string;
    daysRemaining: number;
    expiresAt: number;
    boundIp: string;
  };
}> {
  const clean = inputSecret.trim();
  if (!clean) {
    return { success: false, error: 'يرجى إدخال كود التفعيل VIP أو كلمة المرور' };
  }

  const deviceFingerprint = getDeviceFingerprint();

  // 1. Try server endpoint
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: clean, deviceFingerprint }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (data.success) {
        if (data.sessionVersion) {
          sessionStorage.setItem('areen_session_version', data.sessionVersion);
        }
        if (data.type === 'license_vip') {
          localStorage.setItem(
            'areen_active_license',
            JSON.stringify({
              code: data.licenseCode,
              boundIp: data.boundIp,
              expiresAt: data.expiresAt,
              daysRemaining: data.daysRemaining,
            })
          );
        }
        return {
          success: true,
          sessionVersion: data.sessionVersion,
          licenseInfo: data.type === 'license_vip' ? {
            code: data.licenseCode,
            daysRemaining: data.daysRemaining,
            expiresAt: data.expiresAt,
            boundIp: data.boundIp,
          } : undefined,
        };
      } else {
        return { success: false, error: data.error || 'كود التفعيل أو كلمة المرور غير صحيحة' };
      }
    } else {
      // Server returned HTML or 404 (e.g., Vercel static rewrites) - seamlessly fall back to local engine!
      throw new Error('Vercel or offline fallback needed');
    }
  } catch {
    // 2. Resilient Client-Side Engine fallback (Vercel & Offline)
    // A. First check if it's a VIP single-device license code
    const licResult = await clientVerifyLicense(clean, deviceFingerprint);
    if (licResult.success) {
      const fallbackVer = localStorage.getItem('areen_auth_epoch') || 'v_lic_' + Date.now();
      sessionStorage.setItem('areen_session_version', fallbackVer);
      localStorage.setItem(
        'areen_active_license',
        JSON.stringify({
          code: licResult.licenseCode,
          boundIp: licResult.boundIp,
          expiresAt: licResult.expiresAt,
          daysRemaining: licResult.daysRemaining,
        })
      );
      return {
        success: true,
        sessionVersion: fallbackVer,
        licenseInfo: {
          code: licResult.licenseCode!,
          daysRemaining: licResult.daysRemaining || 30,
          expiresAt: licResult.expiresAt || 0,
          boundIp: licResult.boundIp || '',
        },
      };
    } else if (licResult.error && !licResult.error.includes('غير صحيح')) {
      // Device locked or expired error specific to this code!
      return { success: false, error: licResult.error };
    }

    // B. Check if it's the Master Password
    const ok = await localPbkdf2Verify(clean);
    if (ok) {
      const fallbackVer = localStorage.getItem('areen_auth_epoch') || 'v1';
      sessionStorage.setItem('areen_session_version', fallbackVer);
      return { success: true, sessionVersion: fallbackVer };
    }

    return { success: false, error: 'كود التفعيل أو كلمة المرور غير صحيحة' };
  }
}

/**
 * Updates the unified password on the server and creates a new session epoch.
 * This triggers an instant kick-out signal on all other active devices.
 */
export async function updateMasterPassword(
  currentPass: string,
  newPass: string
): Promise<{ success: boolean; error?: string }> {
  const cleanCurrent = currentPass.trim();
  const cleanNew = newPass.trim();

  // Guard against weak / predictable passwords
  const weakPatterns = ['12345', '123456', '000000', '111111', 'password', 'qwerty'];
  if (weakPatterns.includes(cleanNew.toLowerCase()) || cleanNew.length < 6) {
    return {
      success: false,
      error: 'كلمة المرور سهلة الاختراق أو أقل من 6 خانات! اختر كلمة مرور قوية لحماية حسابك في Hasone Trading.',
    };
  }

  try {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: cleanCurrent, newPassword: cleanNew }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      if (data.newSessionVersion) {
        sessionStorage.setItem('areen_session_version', data.newSessionVersion);
        localStorage.setItem('areen_auth_epoch', data.newSessionVersion);
      }
      return { success: true };
    } else {
      return { success: false, error: data.error || 'فشل تحديث كلمة المرور' };
    }
  } catch {
    const isCurrentOk = await localPbkdf2Verify(cleanCurrent);
    if (!isCurrentOk) {
      return { success: false, error: 'كلمة المرور الحالية غير صحيحة' };
    }

    try {
      const randomSalt = new Uint8Array(16);
      crypto.getRandomValues(randomSalt);
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(cleanNew),
        'PBKDF2',
        false,
        ['deriveBits']
      );
      const bits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: randomSalt.buffer as ArrayBuffer,
          iterations: DEFAULT_VAULT.iterations,
          hash: 'SHA-256',
        },
        keyMaterial,
        256
      );

      const saltB64 = bufferToB64(randomSalt.buffer as ArrayBuffer);
      const hashB64 = bufferToB64(bits);
      const newEpoch = `epoch_${Date.now()}`;

      localStorage.setItem('areen_auth_salt', saltB64);
      localStorage.setItem('areen_auth_hash', hashB64);
      localStorage.setItem('areen_auth_epoch', newEpoch);
      sessionStorage.setItem('areen_session_version', newEpoch);

      return { success: true };
    } catch {
      return { success: false, error: 'تعذر معالجة التشفير في هذا المتصفح' };
    }
  }
}

/**
 * Checks if the current session is still valid or if the password was changed elsewhere.
 */
export async function checkSessionValidity(currentVersion: string | null): Promise<boolean> {
  if (!currentVersion) return false;

  try {
    const res = await fetch(`/api/auth/session-check?version=${encodeURIComponent(currentVersion)}&_t=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });

    if (res.ok) {
      const data = await res.json();
      return data.valid === true;
    }
    return false;
  } catch {
    // Check against local storage epoch if offline
    const localEpoch = localStorage.getItem('areen_auth_epoch');
    if (localEpoch && localEpoch !== currentVersion) {
      return false;
    }
    return true;
  }
}
