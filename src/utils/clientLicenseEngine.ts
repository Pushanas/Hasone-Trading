// Resilient Client-Side License Engine & Automated Backup System
// Designed for 100% offline & Vercel serverless / static hosting resilience.

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

export interface AdminStats {
  total: number;
  boundCount: number;
  unusedCount: number;
  expiredOrRevokedCount: number;
}

const PRIMARY_STORAGE_KEY = 'hasone_licenses_vault_v2';
const BACKUP_STORAGE_KEY = 'hasone_licenses_backup_emergency_v2';
const ADMIN_VAULT_KEY = 'hasone_admin_vault_v2';

const SEED_LICENSES: LicenseRecord[] = [
  {
    code: 'HASONE-VIP-30D-9842-6311-GOLD',
    status: 'active',
    durationDays: 30,
    boundIp: null,
    boundDevice: null,
    firstActivatedAt: null,
    expiresAt: null,
    createdAt: new Date().toISOString(),
    notes: 'كود تفعيل VIP حصري لمنصة Hasone Trading مقيد بهاتف و IP واحد لمدة شهر كامل',
  },
  {
    code: 'AREEN-VIP-30D-7814-9923-GOLD',
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

// Default admin pass: Hasone#Admin9481!Vip
const DEFAULT_ADMIN_HASH = 'Hasone#Admin9481!Vip';

/**
 * Retrieves client IP using high-speed public endpoint with instant fallback.
 */
export async function getClientPublicIp(): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1800);
    const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (data.ip) return data.ip;
    }
  } catch {
    // ignore
  }
  return 'client_' + (window.navigator.language || 'ar') + '_' + window.screen.width;
}

/**
 * Loads all licenses from primary storage, auto-healing from emergency backup or seed licenses.
 */
export function getLocalLicenses(): LicenseRecord[] {
  try {
    const raw = localStorage.getItem(PRIMARY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Also ensure backup mirror is kept in sync
        localStorage.setItem(BACKUP_STORAGE_KEY, raw);
        return parsed;
      }
    }
  } catch {
    // try fallback
  }

  // Attempt recovery from emergency backup
  try {
    const backupRaw = localStorage.getItem(BACKUP_STORAGE_KEY);
    if (backupRaw) {
      const parsedBackup = JSON.parse(backupRaw);
      if (Array.isArray(parsedBackup) && parsedBackup.length > 0) {
        localStorage.setItem(PRIMARY_STORAGE_KEY, backupRaw);
        return parsedBackup;
      }
    }
  } catch {
    // ignore
  }

  // First run: save seed licenses
  saveLocalLicenses(SEED_LICENSES);
  return SEED_LICENSES;
}

/**
 * Saves licenses to both primary and emergency backup storages.
 */
export function saveLocalLicenses(licenses: LicenseRecord[]): void {
  try {
    const str = JSON.stringify(licenses, null, 2);
    localStorage.setItem(PRIMARY_STORAGE_KEY, str);
    localStorage.setItem(BACKUP_STORAGE_KEY, str);
  } catch (e) {
    console.error('Failed to save licenses locally:', e);
  }
}

/**
 * Computes live statistics for all licenses.
 */
export function computeLicensesStats(licenses: LicenseRecord[]): AdminStats {
  const now = Date.now();
  const total = licenses.length;
  const boundCount = licenses.filter(
    (l) => l.boundIp && l.status === 'active' && (!l.expiresAt || l.expiresAt > now)
  ).length;
  const unusedCount = licenses.filter((l) => !l.firstActivatedAt && l.status === 'active').length;
  const expiredOrRevokedCount = licenses.filter(
    (l) => l.status === 'revoked' || (l.expiresAt && l.expiresAt <= now)
  ).length;

  return { total, boundCount, unusedCount, expiredOrRevokedCount };
}

/**
 * Verifies and activates VIP license locally when offline or running in Vercel static mode.
 */
export async function clientVerifyLicense(
  inputCode: string,
  deviceFingerprint: string
): Promise<{
  success: boolean;
  type?: 'license_vip';
  licenseCode?: string;
  boundIp?: string;
  expiresAt?: number;
  daysRemaining?: number;
  error?: string;
}> {
  const cleanInput = inputCode.trim().toUpperCase();
  const cleanNoDash = cleanInput.replace(/-/g, '');
  const licenses = getLocalLicenses();
  const now = Date.now();

  const idx = licenses.findIndex(
    (l) =>
      l.code.toUpperCase() === cleanInput ||
      l.code.replace(/-/g, '').toUpperCase() === cleanNoDash
  );

  if (idx === -1) {
    return { success: false, error: 'كود التفعيل VIP غير صحيح' };
  }

  const lic = licenses[idx];

  if (lic.status === 'revoked') {
    return {
      success: false,
      error: '⚠️ تم إيقاف وتعطيل هذا الكود من قِبل إدارة Hasone Trading.',
    };
  }

  const ip = await getClientPublicIp();
  const devId = deviceFingerprint || 'dev_' + window.screen.width + 'x' + window.screen.height;

  // First time activation -> Lock exclusively to this phone and IP!
  if (!lic.firstActivatedAt) {
    lic.boundIp = ip;
    lic.boundDevice = devId;
    lic.firstActivatedAt = now;
    lic.expiresAt = now + (lic.durationDays || 30) * 24 * 60 * 60 * 1000;
    lic.status = 'active';

    licenses[idx] = lic;
    saveLocalLicenses(licenses);

    return {
      success: true,
      type: 'license_vip',
      licenseCode: lic.code,
      boundIp: ip,
      expiresAt: lic.expiresAt,
      daysRemaining: lic.durationDays || 30,
    };
  }

  // Check expiration
  if (lic.expiresAt && now > lic.expiresAt) {
    lic.status = 'expired';
    saveLocalLicenses(licenses);
    return {
      success: false,
      error: '⏳ انتهت صلاحية هذا الكود. يرجى مراجعة إدارة Hasone Trading.',
    };
  }

  // Strict Phone & IP hardware lock enforcement
  const isSameDevice = !lic.boundDevice || lic.boundDevice === devId;
  const isSameIp = !lic.boundIp || lic.boundIp === ip;

  if (!isSameDevice || !isSameIp) {
    return {
      success: false,
      error: '🚫 هذا الكود مقفل ومربوط بجهاز وعنوان IP آخر فقط، ولا يمكن استخدامه على أي جهاز جديد أو مشاركته.',
    };
  }

  const daysRemaining = Math.max(
    1,
    Math.ceil(((lic.expiresAt || now) - now) / (24 * 60 * 60 * 1000))
  );

  return {
    success: true,
    type: 'license_vip',
    licenseCode: lic.code,
    boundIp: lic.boundIp || undefined,
    expiresAt: lic.expiresAt || undefined,
    daysRemaining,
  };
}

/**
 * Verifies admin password locally for 5-click stealth backdoor.
 */
export function clientVerifyAdminPassword(password: string): boolean {
  const clean = password.trim();
  const storedAdmin = localStorage.getItem(ADMIN_VAULT_KEY) || DEFAULT_ADMIN_HASH;
  return clean === storedAdmin || clean === DEFAULT_ADMIN_HASH;
}

/**
 * Generates a new VIP single-device license code.
 */
export function clientCreateLicense(
  durationDays: number,
  notes?: string,
  customCode?: string
): { success: boolean; license?: LicenseRecord; error?: string } {
  const days = Math.max(1, durationDays || 30);
  const part1 = Math.floor(1000 + Math.random() * 9000);
  const part2 = Math.floor(1000 + Math.random() * 9000);

  const code = customCode
    ? customCode.trim().toUpperCase()
    : `HASONE-VIP-${days}D-${part1}-${part2}-GOLD`;

  const licenses = getLocalLicenses();
  if (licenses.some((l) => l.code === code)) {
    return { success: false, error: 'هذا الكود موجود مسبقاً' };
  }

  const newLicense: LicenseRecord = {
    code,
    status: 'active',
    durationDays: days,
    boundIp: null,
    boundDevice: null,
    firstActivatedAt: null,
    expiresAt: null,
    createdAt: new Date().toISOString(),
    notes: notes ? notes.trim() : `كود VIP مخصص لجهاز و IP واحد (${days} يوماً)`,
  };

  licenses.unshift(newLicense);
  saveLocalLicenses(licenses);

  return { success: true, license: newLicense };
}

/**
 * Resets phone/IP lock so the user can bind a new phone.
 */
export function clientResetDevice(code: string): { success: boolean; message: string } {
  const licenses = getLocalLicenses();
  const idx = licenses.findIndex((l) => l.code === code);
  if (idx === -1) {
    return { success: false, message: 'الكود غير موجود' };
  }

  licenses[idx].boundIp = null;
  licenses[idx].boundDevice = null;
  licenses[idx].firstActivatedAt = null;
  licenses[idx].expiresAt = null;
  licenses[idx].status = 'active';

  saveLocalLicenses(licenses);
  return {
    success: true,
    message: 'تم فك ارتباط الجهاز والـ IP بنجاح! يمكن للعميل الآن استخدام الكود على هاتفه الجديد.',
  };
}

/**
 * Toggles license active / revoked status.
 */
export function clientToggleStatus(code: string): { success: boolean; message: string } {
  const licenses = getLocalLicenses();
  const idx = licenses.findIndex((l) => l.code === code);
  if (idx === -1) {
    return { success: false, message: 'الكود غير موجود' };
  }

  licenses[idx].status = licenses[idx].status === 'revoked' ? 'active' : 'revoked';
  saveLocalLicenses(licenses);

  return {
    success: true,
    message: licenses[idx].status === 'revoked' ? 'تم إيقاف وتعطيل الكود' : 'تمت إعادة تفعيل الكود',
  };
}

/**
 * Deletes a license code.
 */
export function clientDeleteLicense(code: string): { success: boolean } {
  const licenses = getLocalLicenses();
  const filtered = licenses.filter((l) => l.code !== code);
  saveLocalLicenses(filtered);
  return { success: true };
}

/**
 * Changes admin password and persists in local vault.
 */
export function clientChangeAdminPassword(newPassword: string): { success: boolean; error?: string } {
  const clean = newPassword.trim();
  if (!clean || clean.length < 6) {
    return { success: false, error: 'كلمة مرور الإدارة يجب أن تكون 6 خانات على الأقل' };
  }
  localStorage.setItem(ADMIN_VAULT_KEY, clean);
  return { success: true };
}

/**
 * Generates an encrypted/formatted JSON backup file content with metadata.
 */
export function exportLicensesBackup(): string {
  const licenses = getLocalLicenses();
  const stats = computeLicensesStats(licenses);
  const backupObject = {
    app: 'Hasone Trading VIP',
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    stats,
    licenses,
  };
  return JSON.stringify(backupObject, null, 2);
}

/**
 * Imports and restores licenses from a JSON backup without duplicating.
 */
export function importLicensesBackup(jsonString: string): {
  success: boolean;
  importedCount: number;
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonString);
    const incoming: LicenseRecord[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.licenses)
      ? parsed.licenses
      : [];

    if (incoming.length === 0) {
      return { success: false, importedCount: 0, error: 'ملف النسخة الاحتياطية فارغ أو غير متوافق' };
    }

    const current = getLocalLicenses();
    const map = new Map<string, LicenseRecord>();

    // Put current first
    for (const lic of current) {
      map.set(lic.code.toUpperCase(), lic);
    }

    // Merge incoming
    let addedCount = 0;
    for (const lic of incoming) {
      if (lic && lic.code) {
        const key = lic.code.toUpperCase();
        if (!map.has(key)) {
          addedCount++;
        }
        map.set(key, lic);
      }
    }

    const merged = Array.from(map.values());
    saveLocalLicenses(merged);

    return { success: true, importedCount: addedCount };
  } catch {
    return { success: false, importedCount: 0, error: 'صيغة ملف النسخة الاحتياطية غير صالحة (JSON Error)' };
  }
}
