// Client-side lightweight visitor analytics and active heartbeat tracker

const SESSION_STORAGE_KEY = 'hasone_visitor_sid';
const HEARTBEAT_INTERVAL_MS = 45 * 1000; // ~45 seconds

function getOrCreateSessionId(): string {
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

export function initVisitorAnalytics(currentPath: string = '/') {
  const sessionId = getOrCreateSessionId();
  const cleanPath = currentPath.split('?')[0].slice(0, 200) || '/';

  // 1. Incept or update session with page view
  fetch('/api/analytics/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      path: cleanPath,
    }),
  }).catch(() => {});

  // 2. Setup periodic heartbeat (only while active and page is visible)
  let heartbeatTimer: any = null;

  const sendHeartbeat = () => {
    // Only send if tab is visible and document has focus or window is active
    if (document.visibilityState === 'visible') {
      fetch('/api/analytics/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      }).catch(() => {});
    }
  };

  heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

  // Send immediate heartbeat on return to visible tab
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      sendHeartbeat();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Cleanup handler
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
  } catch {}
}
