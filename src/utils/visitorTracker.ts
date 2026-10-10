// Client-side lightweight visitor analytics and active heartbeat tracker
// Supports dual-mode: Express API + Direct Firebase Firestore for Vercel & serverless hosting
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const SESSION_STORAGE_KEY = 'hasone_visitor_sid';
const HEARTBEAT_INTERVAL_MS = 45 * 1000; // ~45 seconds

export function getOrCreateSessionId(): string {
  try {
    let sid = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!sid) {
      sid = localStorage.getItem(SESSION_STORAGE_KEY);
    }
    if (!sid || !/^[a-zA-Z0-9_\-]+$/.test(sid)) {
      sid = `vs_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SESSION_STORAGE_KEY, sid);
      localStorage.setItem(SESSION_STORAGE_KEY, sid);
    }
    return sid;
  } catch {
    return `vs_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

export async function fetchClientPublicIp(): Promise<string> {
  const cached = sessionStorage.getItem('hasone_cached_ip');
  if (cached && cached !== '127.0.0.1') return cached;
  try {
    const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      const data = await res.json();
      if (data && data.ip) {
        sessionStorage.setItem('hasone_cached_ip', data.ip);
        return data.ip;
      }
    }
  } catch {
    // fallback to secondary provider
    try {
      const res2 = await fetch('https://api64.ipify.org?format=json', { signal: AbortSignal.timeout(2000) });
      if (res2.ok) {
        const d2 = await res2.json();
        if (d2?.ip) {
          sessionStorage.setItem('hasone_cached_ip', d2.ip);
          return d2.ip;
        }
      }
    } catch {}
  }
  return '127.0.0.1';
}

export function parseClientUserAgent(uaString?: string) {
  const ua = uaString || navigator.userAgent || '';

  // 1. Device category
  let deviceCategory: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) {
    deviceCategory = 'tablet';
  } else if (/mobile|iphone|ipod|android|blackberry|iemobile|opera mini/i.test(ua)) {
    deviceCategory = 'mobile';
  }

  // 2. Operating System
  let os = 'Unknown OS';
  if (/windows nt 10/i.test(ua)) os = 'Windows 10/11';
  else if (/windows nt 6\.3/i.test(ua)) os = 'Windows 8.1';
  else if (/windows nt 6\.1/i.test(ua)) os = 'Windows 7';
  else if (/windows/i.test(ua)) os = 'Windows';
  else if (/iphone os ([0-9_]+)/i.test(ua)) {
    const match = ua.match(/iphone os ([0-9_]+)/i);
    os = `iOS ${match ? match[1].replace(/_/g, '.') : ''}`.trim();
  } else if (/ipad.*os ([0-9_]+)/i.test(ua)) {
    const match = ua.match(/os ([0-9_]+)/i);
    os = `iPadOS ${match ? match[1].replace(/_/g, '.') : ''}`.trim();
  } else if (/mac os x ([0-9_]+)/i.test(ua)) {
    const match = ua.match(/mac os x ([0-9_]+)/i);
    os = `macOS ${match ? match[1].replace(/_/g, '.') : ''}`.trim();
  } else if (/android ([0-9.]+)/i.test(ua)) {
    const match = ua.match(/android ([0-9.]+)/i);
    os = `Android ${match ? match[1] : ''}`.trim();
  } else if (/linux/i.test(ua)) {
    os = 'Linux';
  } else if (/cros/i.test(ua)) {
    os = 'ChromeOS';
  }

  // 3. Browser
  let browser = 'Unknown Browser';
  if (/edg\/([0-9.]+)/i.test(ua)) {
    const m = ua.match(/edg\/([0-9.]+)/i);
    browser = `Edge ${m ? m[1].split('.')[0] : ''}`.trim();
  } else if (/opr\/([0-9.]+)|opera/i.test(ua)) {
    const m = ua.match(/opr\/([0-9.]+)/i);
    browser = `Opera ${m ? m[1].split('.')[0] : ''}`.trim();
  } else if (/chrome\/([0-9.]+)/i.test(ua)) {
    const m = ua.match(/chrome\/([0-9.]+)/i);
    browser = `Chrome ${m ? m[1].split('.')[0] : ''}`.trim();
  } else if (/version\/([0-9.]+).*safari/i.test(ua)) {
    const m = ua.match(/version\/([0-9.]+)/i);
    browser = `Safari ${m ? m[1].split('.')[0] : ''}`.trim();
  } else if (/firefox\/([0-9.]+)/i.test(ua)) {
    const m = ua.match(/firefox\/([0-9.]+)/i);
    browser = `Firefox ${m ? m[1].split('.')[0] : ''}`.trim();
  }

  return { deviceCategory, os, browser };
}

/**
 * Persists session directly into Firestore to guarantee live display even when hosted statically on Vercel
 */
async function syncSessionToFirestore(sessionId: string, currentPath: string) {
  try {
    const ip = await fetchClientPublicIp();
    const ua = parseClientUserAgent();
    const now = Date.now();
    const sessionRef = doc(db, 'visitor_sessions', sessionId);
    const existingSnap = await getDoc(sessionRef);

    if (existingSnap.exists()) {
      const data = existingSnap.data();
      await setDoc(
        sessionRef,
        {
          lastActivity: now,
          currentPath,
          pageViews: (data.pageViews || 1) + 1,
          status: 'active',
          ip: ip && ip !== '127.0.0.1' ? ip : data.ip || '127.0.0.1',
        },
        { merge: true }
      );
    } else {
      await setDoc(sessionRef, {
        sessionId,
        ip: ip || '127.0.0.1',
        deviceCategory: ua.deviceCategory,
        browser: ua.browser,
        os: ua.os,
        firstVisit: now,
        lastActivity: now,
        currentPath,
        pageViews: 1,
        status: 'active',
        isLoggedIn: false,
        loginType: 'none',
      });
    }
  } catch (err) {
    console.warn('[Visitor Tracker Firestore Sync Notice]:', err);
  }
}

/**
 * Record user login immediately into Firestore
 * Ensures that whenever someone logs in with master password or VIP code,
 * their record appears instantly in the Admin Dashboard!
 */
export async function recordVisitorLogin(
  loginType: 'master' | 'license_vip',
  licenseCode?: string | null
) {
  const sessionId = getOrCreateSessionId();
  try {
    const ip = await fetchClientPublicIp();
    const now = Date.now();
    const sessionRef = doc(db, 'visitor_sessions', sessionId);
    const existingSnap = await getDoc(sessionRef);

    if (existingSnap.exists()) {
      await setDoc(
        sessionRef,
        {
          isLoggedIn: true,
          loginType,
          licenseCode: licenseCode || null,
          lastActivity: now,
          status: 'active',
          ip: ip && ip !== '127.0.0.1' ? ip : existingSnap.data()?.ip || '127.0.0.1',
        },
        { merge: true }
      );
    } else {
      const ua = parseClientUserAgent();
      await setDoc(sessionRef, {
        sessionId,
        ip: ip || '127.0.0.1',
        deviceCategory: ua.deviceCategory,
        browser: ua.browser,
        os: ua.os,
        firstVisit: now,
        lastActivity: now,
        currentPath: window.location.pathname || '/',
        pageViews: 1,
        status: 'active',
        isLoggedIn: true,
        loginType,
        licenseCode: licenseCode || null,
      });
    }
  } catch (err) {
    console.warn('[Record Login Firestore Sync Notice]:', err);
  }
}

export function initVisitorAnalytics(currentPath: string = '/') {
  const sessionId = getOrCreateSessionId();
  const cleanPath = currentPath.split('?')[0].slice(0, 200) || '/';

  // 1. Incept or update session via Express API (if server is running)
  fetch('/api/analytics/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      path: cleanPath,
    }),
  }).catch(() => {});

  // 2. Direct Firestore incept/update (guarantees real-time data on Vercel)
  syncSessionToFirestore(sessionId, cleanPath).catch(() => {});

  // 3. Periodic heartbeat
  let heartbeatTimer: any = null;

  const sendHeartbeat = () => {
    if (document.visibilityState === 'visible') {
      const now = Date.now();
      // Server route
      fetch('/api/analytics/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      }).catch(() => {});

      // Firestore heartbeat
      const sessionRef = doc(db, 'visitor_sessions', sessionId);
      setDoc(sessionRef, { lastActivity: now, status: 'active' }, { merge: true }).catch(() => {});
    }
  };

  heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      sendHeartbeat();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}

export function trackPageView(path: string) {
  try {
    const sessionId = getOrCreateSessionId();
    const cleanPath = path.split('?')[0].slice(0, 200) || '/';

    fetch('/api/analytics/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        path: cleanPath,
      }),
    }).catch(() => {});

    syncSessionToFirestore(sessionId, cleanPath).catch(() => {});
  } catch {}
}
