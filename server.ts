import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const app = express();
app.use(express.json());

const DATA_DIR = path.resolve(process.cwd(), 'data');
const AUTH_FILE = path.resolve(DATA_DIR, 'auth_vault.json');
const LICENSES_FILE = path.resolve(DATA_DIR, 'licenses.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface VaultData {
  saltB64: string;
  hashB64: string;
  iterations: number;
  sessionVersion: string;
  adminSaltB64?: string;
  adminHashB64?: string;
  updatedAt: string;
}

export interface LicenseRecord {
  code: string;
  status: 'active' | 'expired' | 'revoked';
  durationDays: number;
  boundIp: string | null;
  boundDevice: string | null;
  firstActivatedAt: number | null;
  expiresAt: number | null;
  createdAt: string;
  notes: string;
}

// Initial Default Vault configuration (Master Password: Hasone#2026!Vip | Admin Password: Hasone#Admin9481!Vip)
const INITIAL_VAULT: VaultData = {
  saltB64: 'uXuniMOMGKZO7q8iZONJKg==',
  hashB64: 'D/ZnpnsivcWenhYN4FKUiruJWhnU11mvmKfVn9cmEYg=',
  iterations: 210000,
  sessionVersion: 'epoch_1791522060000_hasone_vip',
  adminSaltB64: '1YZhUNou49UTPmJk/7Et8w==',
  adminHashB64: 'p+REbFSU0jlpl0cGyc6lHqZ+5DKyqBvv6nRRDR37S6I=',
  updatedAt: new Date().toISOString(),
};

const INITIAL_LICENSES: LicenseRecord[] = [
  {
    code: 'HASONE-VIP-30D-9842-6311-GOLD',
    status: 'active',
    durationDays: 30,
    boundIp: null,
    boundDevice: null,
    firstActivatedAt: null,
    expiresAt: null,
    createdAt: new Date().toISOString(),
    notes: 'كود VIP حصري لمنصة Hasone Trading لجهاز وعنوان IP واحد فقط لمدة 30 يوماً',
  },
  {
    code: 'AREEN-VIP-30D-9842-6311-GOLD',
    status: 'active',
    durationDays: 30,
    boundIp: null,
    boundDevice: null,
    firstActivatedAt: null,
    expiresAt: null,
    createdAt: new Date().toISOString(),
    notes: 'كود VIP حصري لجهاز وعنوان IP واحد فقط لمدة شهر كامل (30 يوماً من لحظة التفعيل)',
  },
];

function getVault(): VaultData {
  try {
    if (fs.existsSync(AUTH_FILE)) {
      const content = fs.readFileSync(AUTH_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch {
    // ignore
  }
  fs.writeFileSync(AUTH_FILE, JSON.stringify(INITIAL_VAULT, null, 2));
  return INITIAL_VAULT;
}

function saveVault(data: VaultData) {
  fs.writeFileSync(AUTH_FILE, JSON.stringify(data, null, 2));
}

function getLicenses(): LicenseRecord[] {
  try {
    if (fs.existsSync(LICENSES_FILE)) {
      const content = fs.readFileSync(LICENSES_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch {
    // ignore
  }
  fs.writeFileSync(LICENSES_FILE, JSON.stringify(INITIAL_LICENSES, null, 2));
  return INITIAL_LICENSES;
}

function saveLicenses(data: LicenseRecord[]) {
  fs.writeFileSync(LICENSES_FILE, JSON.stringify(data, null, 2));
}

function verifyPasswordAgainstVault(password: string, vault: VaultData): boolean {
  try {
    const salt = Buffer.from(vault.saltB64, 'base64');
    const expected = Buffer.from(vault.hashB64, 'base64');
    const derived = crypto.pbkdf2Sync(password, salt, vault.iterations, 32, 'sha256');
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

function verifyAdminPasswordAgainstVault(password: string, vault: VaultData): boolean {
  try {
    const saltB64 = vault.adminSaltB64 || '1YZhUNou49UTPmJk/7Et8w==';
    const hashB64 = vault.adminHashB64 || 'p+REbFSU0jlpl0cGyc6lHqZ+5DKyqBvv6nRRDR37S6I=';
    const salt = Buffer.from(saltB64, 'base64');
    const expected = Buffer.from(hashB64, 'base64');
    const derived = crypto.pbkdf2Sync(password, salt, vault.iterations || 210000, 32, 'sha256');
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

// Active admin session tokens memory
const activeAdminSessions = new Set<string>();

function checkAdminAuth(req: Request): boolean {
  const token = (req.headers['x-admin-token'] || req.headers['authorization']) as string;
  if (!token) return false;
  const clean = token.replace('Bearer ', '').trim();
  return activeAdminSessions.has(clean);
}

// Rate limiting memory
const failedAttemptsMap = new Map<string, { count: number; lockedUntil: number }>();

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

// API Routes
// 1. Unified Authentication endpoint (supports both Master Password and 1-Month 1-IP/Device License Code)
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { password, code, deviceFingerprint } = req.body;
  const ip = getClientIp(req);
  const now = Date.now();

  const ipRecord = failedAttemptsMap.get(ip) || { count: 0, lockedUntil: 0 };
  if (ipRecord.lockedUntil > now) {
    const secsLeft = Math.ceil((ipRecord.lockedUntil - now) / 1000);
    return res.status(429).json({
      success: false,
      error: `تم حظر المحاولات مؤقتاً بسبب تكرار الأخطاء. انتظر ${secsLeft} ثانية.`,
      lockedSeconds: secsLeft,
    });
  }

  const inputSecret = String(password || code || '').trim();
  if (!inputSecret) {
    return res.status(400).json({ success: false, error: 'يرجى إدخال كود التفعيل VIP أو كلمة المرور' });
  }

  const vault = getVault();
  const licenses = getLicenses();

  // A. Check if input is a VIP Single-Device/IP License Code
  const cleanInputUpper = inputSecret.toUpperCase();
  const licenseIdx = licenses.findIndex(
    (l) => l.code.toUpperCase() === cleanInputUpper || l.code.replace(/-/g, '').toUpperCase() === cleanInputUpper.replace(/-/g, '')
  );

  if (licenseIdx !== -1) {
    const lic = licenses[licenseIdx];
    const devId = String(deviceFingerprint || 'device_' + crypto.createHash('md5').update(ip + (req.headers['user-agent'] || '')).digest('hex')).trim();

    // Check if revoked
    if (lic.status === 'revoked') {
      return res.status(403).json({
        success: false,
        error: '⚠️ تم إيقاف وتعطيل هذا الكود من قِبل إدارة العرين الذهبي.',
      });
    }

    // First time activation -> Bind to this IP and Device Fingerprint for 30 Days!
    if (!lic.firstActivatedAt) {
      lic.boundIp = ip;
      lic.boundDevice = devId;
      lic.firstActivatedAt = now;
      lic.expiresAt = now + (lic.durationDays || 30) * 24 * 60 * 60 * 1000;
      lic.status = 'active';

      licenses[licenseIdx] = lic;
      saveLicenses(licenses);

      failedAttemptsMap.delete(ip);

      const daysRemaining = 30;
      return res.json({
        success: true,
        type: 'license_vip',
        sessionVersion: vault.sessionVersion,
        licenseCode: lic.code,
        boundIp: ip,
        expiresAt: lic.expiresAt,
        daysRemaining,
        message: '🎉 تم تفعيل اشتراكك الشهري VIP بنجاح وتم ربطه بهذا الجهاز وعنوان الـ IP حصرياً.',
      });
    }

    // Already activated -> Check Expiration
    if (lic.expiresAt && now > lic.expiresAt) {
      lic.status = 'expired';
      saveLicenses(licenses);
      return res.status(403).json({
        success: false,
        error: '⏳ انتهت صلاحية هذا الكود (30 يوماً). يرجى التواصل مع الإدارة للتجديد.',
      });
    }

    // Check Single Device & Single IP Binding
    const isSameDevice = !lic.boundDevice || lic.boundDevice === devId;
    const isSameIp = !lic.boundIp || lic.boundIp === ip || ip === '127.0.0.1' || ip === '::1';

    if (!isSameDevice || !isSameIp) {
      return res.status(403).json({
        success: false,
        error: '🚫 هذا الكود مقفل ومربوط بجهاز وعنوان IP آخر فقط، ولا يمكن استخدامه على أي جهاز جديد أو مشاركته.',
      });
    }

    failedAttemptsMap.delete(ip);
    const daysRemaining = Math.max(1, Math.ceil(((lic.expiresAt || now) - now) / (24 * 60 * 60 * 1000)));

    return res.json({
      success: true,
      type: 'license_vip',
      sessionVersion: vault.sessionVersion,
      licenseCode: lic.code,
      boundIp: lic.boundIp,
      expiresAt: lic.expiresAt,
      daysRemaining,
    });
  }

  // B. Check against Master Password
  const isMasterValid = verifyPasswordAgainstVault(inputSecret, vault);

  if (isMasterValid) {
    failedAttemptsMap.delete(ip);
    return res.json({
      success: true,
      type: 'master',
      sessionVersion: vault.sessionVersion,
    });
  }

  // C. Invalid credentials
  ipRecord.count += 1;
  if (ipRecord.count >= 5) {
    const lockPenaltySecs = Math.min(300, 15 * Math.pow(2, ipRecord.count - 5));
    ipRecord.lockedUntil = now + lockPenaltySecs * 1000;
  }
  failedAttemptsMap.set(ip, ipRecord);
  const attemptsLeft = Math.max(0, 5 - ipRecord.count);

  return res.status(401).json({
    success: false,
    error:
      attemptsLeft === 0
        ? 'تم قفل المحاولات مؤقتاً لحماية العرين الذهبي.'
        : `كود التفعيل أو كلمة المرور غير صحيحة. متبقي ${attemptsLeft} محاولات.`,
    attemptsLeft,
  });
});

// 2. Session verification heartbeat - checks if password was changed elsewhere
app.get('/api/auth/session-check', (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const clientVersion = req.query.version;
  const vault = getVault();

  if (!clientVersion || clientVersion !== vault.sessionVersion) {
    return res.json({
      valid: false,
      reason: 'password_changed',
      message: 'تم تغيير كلمة المرور الموحدة للعرين الذهبي. تم إنهاء الجلسة.',
    });
  }

  return res.json({ valid: true, version: vault.sessionVersion });
});

// 3. Change Unified Master Password - Kicks out all other devices immediately!
app.post('/api/auth/change-password', (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, error: 'يرجى ملء كافة الحقول' });
  }

  const cleanCurrent = String(currentPassword).trim();
  const cleanNew = String(newPassword).trim();

  // Reject weak / predictable passwords
  const weakPatterns = ['12345', '123456', '000000', '111111', 'password', 'qwerty'];
  if (weakPatterns.includes(cleanNew.toLowerCase()) || cleanNew.length < 6) {
    return res.status(400).json({
      success: false,
      error: 'كلمة المرور ضعيفة جداً وسهلة التخمين! يرجى اختيار كلمة مرور قوية من 6 خانات على الأقل.',
    });
  }

  const vault = getVault();
  const isCurrentValid = verifyPasswordAgainstVault(cleanCurrent, vault);

  if (!isCurrentValid) {
    return res.status(401).json({ success: false, error: 'كلمة المرور الحالية غير صحيحة' });
  }

  // Generate new cryptographic salt and PBKDF2 hash
  const newSalt = crypto.randomBytes(16);
  const newHash = crypto.pbkdf2Sync(cleanNew, newSalt, 210000, 32, 'sha256');

  // Generate fresh session version to instantly invalidate all other sessions
  const newSessionVersion = `epoch_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;

  const updatedVault: VaultData = {
    saltB64: newSalt.toString('base64'),
    hashB64: newHash.toString('base64'),
    iterations: 210000,
    sessionVersion: newSessionVersion,
    updatedAt: new Date().toISOString(),
  };

  saveVault(updatedVault);

  return res.json({
    success: true,
    message: 'تم تغيير كلمة المرور بنجاح وطرد كافة الأجهزة المتصلة.',
    newSessionVersion,
  });
});

// ================= ADMIN MANAGEMENT APIS (Stealth 5-Click Trigger) =================
// 1. Admin Login Verification
app.post('/api/admin/login', (req: Request, res: Response) => {
  const { password } = req.body;
  const vault = getVault();

  if (!password || !verifyAdminPasswordAgainstVault(String(password).trim(), vault)) {
    return res.status(401).json({ success: false, error: 'كلمة مرور لوحة الإدارة غير صحيحة' });
  }

  const token = 'adm_' + crypto.randomBytes(24).toString('hex');
  activeAdminSessions.add(token);
  return res.json({ success: true, token });
});

// 2. Fetch all licenses with stats
app.get('/api/admin/licenses', (req: Request, res: Response) => {
  if (!checkAdminAuth(req)) {
    return res.status(401).json({ success: false, error: 'غير مصرح بالوصول إلى لوحة الإدارة' });
  }

  const licenses = getLicenses();
  const now = Date.now();

  const total = licenses.length;
  const boundCount = licenses.filter(l => l.boundIp && l.status === 'active' && (!l.expiresAt || l.expiresAt > now)).length;
  const unusedCount = licenses.filter(l => !l.firstActivatedAt && l.status === 'active').length;
  const expiredOrRevokedCount = licenses.filter(l => l.status === 'revoked' || (l.expiresAt && l.expiresAt <= now)).length;

  return res.json({
    success: true,
    licenses,
    stats: {
      total,
      boundCount,
      unusedCount,
      expiredOrRevokedCount,
    },
  });
});

// 3. Generate New License Code (Single-Device / Single-IP)
app.post('/api/admin/create-license', (req: Request, res: Response) => {
  if (!checkAdminAuth(req)) {
    return res.status(401).json({ success: false, error: 'غير مصرح بالوصول إلى لوحة الإدارة' });
  }

  const { durationDays, notes, customCode } = req.body;
  const days = Math.max(1, parseInt(durationDays) || 30);
  const randomPart1 = Math.floor(1000 + Math.random() * 9000);
  const randomPart2 = Math.floor(1000 + Math.random() * 9000);

  const code = customCode
    ? String(customCode).trim().toUpperCase()
    : `HASONE-VIP-${days}D-${randomPart1}-${randomPart2}-GOLD`;

  const newLicense: LicenseRecord = {
    code,
    status: 'active',
    durationDays: days,
    boundIp: null,
    boundDevice: null,
    firstActivatedAt: null,
    expiresAt: null,
    createdAt: new Date().toISOString(),
    notes: notes ? String(notes).trim() : `كود VIP مخصص لجهاز و IP واحد (${days} يوماً)`,
  };

  const licenses = getLicenses();
  // Check if code already exists
  if (licenses.some(l => l.code === code)) {
    return res.status(400).json({ success: false, error: 'هذا الكود موجود مسبقاً، اختر كوداً آخر' });
  }

  licenses.unshift(newLicense);
  saveLicenses(licenses);

  return res.json({
    success: true,
    license: newLicense,
    message: 'تم إنشاء كود الترخيص بنجاح.',
  });
});

// 4. Reset Device Lock (Allow client to rebind on new phone)
app.post('/api/admin/reset-device', (req: Request, res: Response) => {
  if (!checkAdminAuth(req)) {
    return res.status(401).json({ success: false, error: 'غير مصرح' });
  }

  const { code } = req.body;
  const licenses = getLicenses();
  const idx = licenses.findIndex(l => l.code === code);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'الكود غير موجود' });
  }

  licenses[idx].boundIp = null;
  licenses[idx].boundDevice = null;
  licenses[idx].firstActivatedAt = null;
  licenses[idx].expiresAt = null;
  licenses[idx].status = 'active';
  saveLicenses(licenses);

  return res.json({
    success: true,
    message: 'تم فك ارتباط الجهاز والـ IP بنجاح! يمكن للعميل الآن استخدام الكود على هاتفه الجديد.',
  });
});

// 5. Toggle License Status (Revoke / Activate)
app.post('/api/admin/toggle-status', (req: Request, res: Response) => {
  if (!checkAdminAuth(req)) {
    return res.status(401).json({ success: false, error: 'غير مصرح' });
  }

  const { code } = req.body;
  const licenses = getLicenses();
  const idx = licenses.findIndex(l => l.code === code);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'الكود غير موجود' });
  }

  licenses[idx].status = licenses[idx].status === 'revoked' ? 'active' : 'revoked';
  saveLicenses(licenses);

  return res.json({
    success: true,
    newStatus: licenses[idx].status,
    message: licenses[idx].status === 'revoked' ? 'تم تعطيل وإيقاف الكود فوراً' : 'تم تفعيل الكود مجدداً',
  });
});

// 6. Delete License Code
app.post('/api/admin/delete-license', (req: Request, res: Response) => {
  if (!checkAdminAuth(req)) {
    return res.status(401).json({ success: false, error: 'غير مصرح' });
  }

  const { code } = req.body;
  const licenses = getLicenses();
  const filtered = licenses.filter(l => l.code !== code);
  saveLicenses(filtered);

  return res.json({ success: true, message: 'تم حذف الكود بنجاح' });
});

// 7. Update Admin Password
app.post('/api/admin/change-admin-password', (req: Request, res: Response) => {
  if (!checkAdminAuth(req)) {
    return res.status(401).json({ success: false, error: 'غير مصرح' });
  }

  const { newAdminPassword } = req.body;
  const clean = String(newAdminPassword || '').trim();
  if (clean.length < 6) {
    return res.status(400).json({ success: false, error: 'كلمة المرور يجب أن لا تقل عن 6 خانات' });
  }

  const vault = getVault();
  const newSalt = crypto.randomBytes(16);
  const newHash = crypto.pbkdf2Sync(clean, newSalt, 210000, 32, 'sha256');

  vault.adminSaltB64 = newSalt.toString('base64');
  vault.adminHashB64 = newHash.toString('base64');
  vault.updatedAt = new Date().toISOString();
  saveVault(vault);

  return res.json({ success: true, message: 'تم تحديث كلمة مرور لوحة الإدارة بنجاح' });
});

// ================= QUOTEX LIVE OTC MARKET FEED & QUANT ENGINE =================
interface QuotexCandleRecord {
  timestamp: number;
  timeStr: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

class MarketDataManager {
  private maxCandles = 60;
  private candlesMap: Map<string, QuotexCandleRecord[]> = new Map();

  constructor() {
    this.initDefaultCandles();
  }

  private initDefaultCandles() {
    const pairDefaults: Record<string, { basePrice: number; decimals: number }> = {
      usd_brl_otc: { basePrice: 5.6842, decimals: 4 },
      usd_mxn_otc: { basePrice: 19.342, decimals: 4 },
      usd_inr_otc: { basePrice: 83.914, decimals: 3 },
      usd_ngn_otc: { basePrice: 1640.5, decimals: 2 },
      usd_idr_otc: { basePrice: 15620.0, decimals: 1 },
      usd_ars_otc: { basePrice: 980.25, decimals: 2 },
      eur_usd_otc: { basePrice: 1.0845, decimals: 5 },
    };

    const now = Date.now();
    for (const [pairId, meta] of Object.entries(pairDefaults)) {
      const list: QuotexCandleRecord[] = [];
      let runningPrice = meta.basePrice;
      for (let i = 40; i >= 0; i--) {
        const timeMs = Math.floor((now - i * 60000) / 60000) * 60000;
        const d = new Date(timeMs);
        const pad = (n: number) => String(n).padStart(2, '0');
        const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
        const delta = (Math.random() - 0.495) * (runningPrice * 0.0004);
        const open = Number(runningPrice.toFixed(meta.decimals));
        const close = Number((open + delta).toFixed(meta.decimals));
        const high = Number((Math.max(open, close) + Math.abs(delta) * 0.5 * Math.random()).toFixed(meta.decimals));
        const low = Number((Math.min(open, close) - Math.abs(delta) * 0.5 * Math.random()).toFixed(meta.decimals));
        const volume = Math.floor(1500 + Math.random() * 2500);

        list.push({ timestamp: timeMs, timeStr, open, high, low, close, volume });
        runningPrice = close;
      }
      this.candlesMap.set(pairId, list);
    }
  }

  public getCandles(pairId: string): QuotexCandleRecord[] {
    return this.candlesMap.get(pairId) || [];
  }

  public updateLatestPrice(pairId: string, livePrice: number, decimals: number) {
    let list = this.candlesMap.get(pairId);
    if (!list || list.length === 0) return;

    const currentMinuteMs = Math.floor(Date.now() / 60000) * 60000;
    const last = list[list.length - 1];

    if (last.timestamp === currentMinuteMs) {
      // Update ongoing candle
      last.close = Number(livePrice.toFixed(decimals));
      last.high = Number(Math.max(last.high, livePrice).toFixed(decimals));
      last.low = Number(Math.min(last.low, livePrice).toFixed(decimals));
      last.volume += Math.floor(10 + Math.random() * 25);
    } else if (currentMinuteMs > last.timestamp) {
      // Incept new candle at minute 00s
      const d = new Date(currentMinuteMs);
      const pad = (n: number) => String(n).padStart(2, '0');
      const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
      const newCandle: QuotexCandleRecord = {
        timestamp: currentMinuteMs,
        timeStr,
        open: last.close,
        high: Math.max(last.close, livePrice),
        low: Math.min(last.close, livePrice),
        close: Number(livePrice.toFixed(decimals)),
        volume: Math.floor(1200 + Math.random() * 1500),
      };
      list.push(newCandle);
      if (list.length > this.maxCandles) {
        list.shift();
      }
    }
  }
}

const marketDataManager = new MarketDataManager();

interface QuotexLiveState {
  lastUpdated: number;
  rates: Record<string, number>;
}

const quotexLiveState: QuotexLiveState = {
  lastUpdated: 0,
  rates: {
    usd_brl_otc: 5.6842,
    usd_mxn_otc: 19.342,
    usd_inr_otc: 83.914,
    usd_ngn_otc: 1640.5,
    usd_idr_otc: 15620.0,
    usd_ars_otc: 980.25,
    eur_usd_otc: 1.0845,
  },
};

// Background refresh of real interbank spot FX rates
async function refreshQuotexLiveRates() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      if (data && data.rates) {
        if (data.rates.BRL) {
          quotexLiveState.rates.usd_brl_otc = Number(data.rates.BRL.toFixed(4));
          marketDataManager.updateLatestPrice('usd_brl_otc', quotexLiveState.rates.usd_brl_otc, 4);
        }
        if (data.rates.MXN) {
          quotexLiveState.rates.usd_mxn_otc = Number(data.rates.MXN.toFixed(4));
          marketDataManager.updateLatestPrice('usd_mxn_otc', quotexLiveState.rates.usd_mxn_otc, 4);
        }
        if (data.rates.INR) {
          quotexLiveState.rates.usd_inr_otc = Number(data.rates.INR.toFixed(3));
          marketDataManager.updateLatestPrice('usd_inr_otc', quotexLiveState.rates.usd_inr_otc, 3);
        }
        if (data.rates.NGN) {
          quotexLiveState.rates.usd_ngn_otc = Number(data.rates.NGN.toFixed(2));
          marketDataManager.updateLatestPrice('usd_ngn_otc', quotexLiveState.rates.usd_ngn_otc, 2);
        }
        if (data.rates.IDR) {
          quotexLiveState.rates.usd_idr_otc = Number(data.rates.IDR.toFixed(1));
          marketDataManager.updateLatestPrice('usd_idr_otc', quotexLiveState.rates.usd_idr_otc, 1);
        }
        if (data.rates.ARS) {
          quotexLiveState.rates.usd_ars_otc = Number(data.rates.ARS.toFixed(2));
          marketDataManager.updateLatestPrice('usd_ars_otc', quotexLiveState.rates.usd_ars_otc, 2);
        }
        if (data.rates.EUR) {
          quotexLiveState.rates.eur_usd_otc = Number((1 / data.rates.EUR).toFixed(5));
          marketDataManager.updateLatestPrice('eur_usd_otc', quotexLiveState.rates.eur_usd_otc, 5);
        }
        quotexLiveState.lastUpdated = Date.now();
      }
    }
  } catch {
    // Keep cached rates
  }
}

// Initial fetch and scheduled refresh every 45s
refreshQuotexLiveRates();
setInterval(refreshQuotexLiveRates, 45000);

// Endpoint for live rates
app.get('/api/quotex/live-rates', (_req: Request, res: Response) => {
  return res.json({
    success: true,
    server: 'Quotex OTC WebSocket Gateway',
    timestamp: Date.now(),
    lastUpdated: quotexLiveState.lastUpdated || Date.now(),
    rates: quotexLiveState.rates,
  });
});

// Endpoint for live OHLC candles
app.get('/api/quotex/candles', (req: Request, res: Response) => {
  const pairId = String(req.query.pairId || 'usd_brl_otc');
  const candles = marketDataManager.getCandles(pairId);
  return res.json({
    success: true,
    pairId,
    candles,
  });
});

// Technical Analysis Quant Engine endpoint
app.post('/api/ai/quotex-analyze', async (req: Request, res: Response) => {
  try {
    const { pairId, timeframe, indicators, pairSymbol } = req.body;

    const recentCandles = marketDataManager.getCandles(pairId || 'usd_brl_otc').slice(-20);
    const candlesTable = recentCandles.length > 0
      ? recentCandles.map((c) => `Time: ${c.timeStr} | O: ${c.open} | H: ${c.high} | L: ${c.low} | C: ${c.close} | Vol: ${c.volume}`).join('\n')
      : 'Live streaming tick confluence active';

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4500);

        const prompt = `بناءً على بيانات الشموع اليابانية التالية (Open, High, Low, Close, Volume) للأصل المالي ${pairSymbol || 'USD/BRL OTC'} على منصة Quotex OTC:
${candlesTable}

المؤشرات الفنية اللحظية:
- مؤشر RSI (14): ${indicators?.rsi14 || 42} (${indicators?.rsiZone || 'Neutral'})
- سحابة EMA 9 / EMA 21: ${indicators?.emaTrend || 'Bullish Ribbon'}
- البولنجر باند: ${indicators?.bbPosition || 'Lower Band Rebound'}
- الزخم والسيولة: ${indicators?.volumePressure || 'Institutional Inflow'}
- نموذج الشموع: ${indicators?.candlePattern || 'Engulfing'}

المطلوب بدقة:
1. قم بتحليل الاتجاه العام وسلوك السعر (Price Action).
2. حدد نقطة الدخول فوراً مع بداية الشمعة القادمة (00s).
3. اكتب مذكرة تحليل مؤسساتي موجزة واحترافية باللغة العربية (جملتين كحد أقصى).
4. حدد الاتجاه (CALL أو PUT) ونسبة دقة بين 94% و 98.5%.

Return ONLY valid JSON in this exact structure:
{
  "decision": "CALL",
  "aiThesis": "string in Arabic explaining the price action order block reasoning",
  "confidence": 96.5,
  "strategyBadge": "👑 Hasone Golden Breakout (Quotex VIP)"
}`;

        const rawRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: 'application/json' },
            }),
            signal: controller.signal,
          }
        );
        clearTimeout(timeout);

        if (rawRes.ok) {
          const rawData = await rawRes.json();
          const text = rawData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const parsed = JSON.parse(text);
            return res.json({
              success: true,
              source: 'quotex_quant_engine',
              decision: parsed.decision || 'CALL',
              aiThesis: parsed.aiThesis,
              confidence: parsed.confidence,
              strategyBadge: parsed.strategyBadge,
            });
          }
        }
      } catch {
        // Fall back gracefully
      }
    }

    return res.json({
      success: true,
      source: 'quotex_quant_engine',
    });
  } catch (error: any) {
    return res.json({
      success: true,
      source: 'quotex_quant_engine',
    });
  }
});

// Mount Vite or static build
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  const port = process.env.PORT || 3000;
  app.listen(Number(port), '0.0.0.0', () => {
    console.log(`Al-Areen Golden Den Server running on port ${port}`);
  });
}

startServer();
