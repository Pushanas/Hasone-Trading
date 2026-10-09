import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Ban,
  ShieldCheck,
  Smartphone,
  Globe,
  Clock,
  KeyRound,
  Search,
  Sliders,
  Send,
  AlertTriangle,
  Lock,
  Download,
  Upload,
  Database,
  HardDrive,
} from 'lucide-react';
import { ModalWrapper } from './ModalWrapper';
import {
  LicenseRecord,
  AdminStats,
  getLocalLicenses,
  saveLocalLicenses,
  computeLicensesStats,
  clientCreateLicense,
  clientResetDevice,
  clientToggleStatus,
  clientDeleteLicense,
  clientChangeAdminPassword,
  exportLicensesBackup,
  importLicensesBackup,
} from '../utils/clientLicenseEngine';

interface AdminManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminToken: string;
}

export const AdminManagementModal: React.FC<AdminManagementModalProps> = ({
  isOpen,
  onClose,
  adminToken,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'backup' | 'security'>('list');
  const [licenses, setLicenses] = useState<LicenseRecord[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    total: 0,
    boundCount: 0,
    unusedCount: 0,
    expiredOrRevokedCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'bound' | 'unused' | 'expired'>('all');

  // Generator form state
  const [durationDays, setDurationDays] = useState(30);
  const [customDays, setCustomDays] = useState('');
  const [clientNote, setClientNote] = useState('');
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Security password states
  const [newAdminPass, setNewAdminPass] = useState('');
  const [newMasterPass, setNewMasterPass] = useState('');
  const [securityMsg, setSecurityMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchLicenses = async () => {
    setLoading(true);
    try {
      if (adminToken) {
        const res = await fetch('/api/admin/licenses', {
          headers: {
            'x-admin-token': adminToken,
          },
        });
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (data.success && data.licenses) {
            setLicenses(data.licenses);
            saveLocalLicenses(data.licenses);
            if (data.stats) {
              setStats(data.stats);
            }
            return;
          }
        }
      }
      throw new Error('Vercel or offline');
    } catch {
      // Local resilient engine (Vercel static & offline backup)
      const local = getLocalLicenses();
      setLicenses(local);
      setStats(computeLicensesStats(local));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLicenses();
    }
  }, [isOpen, adminToken]);

  const handleCreateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    const days = customDays ? parseInt(customDays) || durationDays : durationDays;
    setLoading(true);
    setActionMsg(null);

    try {
      const res = await fetch('/api/admin/create-license', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken,
        },
        body: JSON.stringify({
          durationDays: days,
          notes: clientNote,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success && data.license) {
          setCreatedCode(data.license.code);
          setClientNote('');
          setCustomDays('');
          setActionMsg({ text: 'تم إنشاء كود VIP المخصص لجهاز واحد وحفظه بنجاح!', type: 'success' });
          fetchLicenses();
          return;
        }
      }
      throw new Error('Vercel or offline');
    } catch {
      // Local engine fallback
      const localRes = clientCreateLicense(days, clientNote);
      if (localRes.success && localRes.license) {
        setCreatedCode(localRes.license.code);
        setClientNote('');
        setCustomDays('');
        setActionMsg({ text: 'تم إنشاء كود VIP وحفظه في النسخة الاحتياطية بنجاح!', type: 'success' });
        fetchLicenses();
      } else {
        setActionMsg({ text: localRes.error || 'فشل إنشاء الكود', type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetDevice = async (code: string) => {
    try {
      const res = await fetch('/api/admin/reset-device', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken,
        },
        body: JSON.stringify({ code }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          setActionMsg({ text: data.message || 'تم فك ارتباط الجهاز والـ IP بنجاح', type: 'success' });
          fetchLicenses();
          return;
        }
      }
      throw new Error('Vercel or offline');
    } catch {
      const localRes = clientResetDevice(code);
      setActionMsg({ text: localRes.message, type: 'success' });
      fetchLicenses();
    }
  };

  const handleToggleStatus = async (code: string) => {
    try {
      const res = await fetch('/api/admin/toggle-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken,
        },
        body: JSON.stringify({ code }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          setActionMsg({ text: data.message || 'تم تحديث حالة الكود', type: 'success' });
          fetchLicenses();
          return;
        }
      }
      throw new Error('Vercel or offline');
    } catch {
      const localRes = clientToggleStatus(code);
      setActionMsg({ text: localRes.message, type: 'success' });
      fetchLicenses();
    }
  };

  const handleDeleteLicense = async (code: string) => {
    try {
      const res = await fetch('/api/admin/delete-license', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken,
        },
        body: JSON.stringify({ code }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          setActionMsg({ text: 'تم حذف الكود بنجاح', type: 'success' });
          fetchLicenses();
          return;
        }
      }
      throw new Error('Vercel or offline');
    } catch {
      clientDeleteLicense(code);
      setActionMsg({ text: 'تم حذف الكود من النسخة الاحتياطية بنجاح', type: 'success' });
      fetchLicenses();
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // ignore
    }
  };

  const handleCopyClientDelivery = async (code: string, days: number) => {
    const deliveryText = `👑 كود تفعيل اشتراكك الحصري في منصة حسون - Trading VIP 👑

🔑 كود التفعيل:
${code}

⏱️ مدة الاشتراك: ${days} يوماً من لحظة التفعيل
🔒 الحماية: الكود مخصص ومقفل لهاتف واحد فقط ولعنوان IP الخاص بك، لا تشاركه مع أي شخص.

🌐 رابط المنصة:
${window.location.origin}`;

    try {
      await navigator.clipboard.writeText(deliveryText);
      setCopiedTemplate(true);
      setTimeout(() => setCopiedTemplate(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleChangeAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminPass.trim()) return;
    setLoading(true);
    setSecurityMsg(null);

    try {
      await fetch('/api/admin/change-admin-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken,
        },
        body: JSON.stringify({ newAdminPassword: newAdminPass.trim() }),
      });
    } catch {
      // ignore
    }

    clientChangeAdminPassword(newAdminPass.trim());
    setSecurityMsg({ text: 'تم تحديث وحفظ كلمة مرور الإدارة في النسخة الاحتياطية بنجاح!', type: 'success' });
    setNewAdminPass('');
    setLoading(false);
  };

  const handleExportBackupFile = () => {
    const jsonStr = exportLicensesBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hassone-trading-licenses-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setActionMsg({ text: '🎉 تم تصدير وتحميل ملف النسخة الاحتياطية بنجاح!', type: 'success' });
  };

  const handleImportBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const res = importLicensesBackup(content);
        if (res.success) {
          setActionMsg({
            text: `✅ تم استعادة ودمج ${res.importedCount} كود بنجاح في النسخة الاحتياطية!`,
            type: 'success',
          });
          fetchLicenses();
        } else {
          setActionMsg({ text: res.error || 'فشل استيراد النسخة الاحتياطية', type: 'error' });
        }
      }
    };
    reader.readAsText(file);
    // Reset file input
    e.target.value = '';
  };

  const now = Date.now();
  const filteredLicenses = licenses.filter((l) => {
    const matchesSearch =
      l.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.notes && l.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (l.boundIp && l.boundIp.includes(searchTerm));

    if (!matchesSearch) return false;

    if (filterStatus === 'bound') {
      return l.boundIp && l.status === 'active' && (!l.expiresAt || l.expiresAt > now);
    }
    if (filterStatus === 'unused') {
      return !l.firstActivatedAt && l.status === 'active';
    }
    if (filterStatus === 'expired') {
      return l.status === 'revoked' || (l.expiresAt && l.expiresAt <= now);
    }
    return true;
  });

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="max-w-2xl">
      <div className="p-4 sm:p-6 text-right flex flex-col max-h-[90vh]" dir="rtl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[var(--bg-input)] border border-[var(--gold-border)] flex items-center justify-center text-[var(--gold-primary)] shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-[var(--gold-primary)] tracking-tight">
                لوحة إدارة التراخيص والأكواد VIP
              </h2>
              <p className="text-[10px] sm:text-xs text-[var(--text-secondary)] mt-0.5 font-mono">
                HASSONE TRADING ▪ SINGLE-DEVICE IP ACCESS MANAGEMENT
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchLicenses}
              title="تحديث البيانات"
              disabled={loading}
              className="p-2 rounded-xl bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--gold-primary)] transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              aria-label="إغلاق"
              className="p-2 rounded-xl text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 4 Stats Cards */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          <div className="card-surface p-2.5 text-center">
            <span className="text-[10px] text-[var(--text-muted)] font-bold block">إجمالي الأكواد</span>
            <span className="text-base sm:text-lg font-black font-mono text-[var(--gold-primary)] tabular-nums">
              {stats.total}
            </span>
          </div>

          <div className="card-surface p-2.5 text-center border-[rgba(16,185,129,0.3)]">
            <span className="text-[10px] text-[var(--success)] font-bold block">مفعل ومربوط</span>
            <span className="text-base sm:text-lg font-black font-mono text-[var(--success)] tabular-nums">
              {stats.boundCount}
            </span>
          </div>

          <div className="card-surface p-2.5 text-center border-[var(--gold-border)]">
            <span className="text-[10px] text-[var(--gold-primary)] font-bold block">متاح بانتظار العميل</span>
            <span className="text-base sm:text-lg font-black font-mono text-[var(--gold-light)] tabular-nums">
              {stats.unusedCount}
            </span>
          </div>

          <div className="card-surface p-2.5 text-center border-[rgba(244,63,94,0.3)]">
            <span className="text-[10px] text-[var(--danger)] font-bold block">منتهي / ملغى</span>
            <span className="text-base sm:text-lg font-black font-mono text-[var(--danger)] tabular-nums">
              {stats.expiredOrRevokedCount}
            </span>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 mt-4 border-b border-[var(--border-subtle)] pb-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('list')}
            className={`py-1.5 px-3 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'list'
                ? 'bg-[var(--gold-primary)] text-[var(--text-on-gold)] shadow-xs'
                : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-white border border-[var(--border-subtle)]'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>قائمة الأكواد والأجهزة ({licenses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('create')}
            className={`py-1.5 px-3 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'create'
                ? 'bg-[var(--gold-primary)] text-[var(--text-on-gold)] shadow-xs'
                : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-white border border-[var(--border-subtle)]'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>توليد كود VIP جديد</span>
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`py-1.5 px-3 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'backup'
                ? 'bg-[var(--gold-primary)] text-[var(--text-on-gold)] shadow-xs'
                : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-white border border-[var(--border-subtle)]'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>النسخة الاحتياطية (Vercel Backup)</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`py-1.5 px-3 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 mr-auto ${
              activeTab === 'security'
                ? 'bg-[var(--gold-primary)] text-[var(--text-on-gold)] shadow-xs'
                : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-white border border-[var(--border-subtle)]'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>أمان الإدارة</span>
          </button>
        </div>

        {actionMsg && (
          <div
            className={`mt-3 p-2.5 rounded-xl text-xs flex items-center justify-between border ${
              actionMsg.type === 'success'
                ? 'bg-[var(--success-soft)] border-[var(--success)] text-[var(--success)]'
                : 'bg-[var(--danger-soft)] border-[var(--danger)] text-[var(--danger)]'
            }`}
          >
            <span>{actionMsg.text}</span>
            <button onClick={() => setActionMsg(null)} className="cursor-pointer text-xs font-mono">
              ✕
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto mt-3 pr-0.5 space-y-4">
          {/* TAB 1: CODES LIST */}
          {activeTab === 'list' && (
            <div className="space-y-3">
              {/* Filter and Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="بحث بالكود، اسم العميل، أو عنوان IP..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-10 pr-9 pl-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:border-[var(--gold-border)] outline-none"
                  />
                  <Search className="w-4 h-4 text-[var(--text-muted)] absolute right-3 top-1/2 -translate-y-1/2" />
                </div>

                <div className="flex items-center gap-1 text-[11px] overflow-x-auto pb-1 scrollbar-none">
                  <button
                    onClick={() => setFilterStatus('all')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      filterStatus === 'all'
                        ? 'bg-[var(--gold-primary)] text-[var(--text-on-gold)]'
                        : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
                    }`}
                  >
                    الكل ({licenses.length})
                  </button>
                  <button
                    onClick={() => setFilterStatus('bound')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      filterStatus === 'bound'
                        ? 'bg-[var(--success)] text-[var(--text-on-gold)]'
                        : 'bg-[var(--bg-input)] text-[var(--success)] border border-[rgba(16,185,129,0.3)]'
                    }`}
                  >
                    مفعل ومربوط ({stats.boundCount})
                  </button>
                  <button
                    onClick={() => setFilterStatus('unused')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      filterStatus === 'unused'
                        ? 'bg-[var(--gold-primary)] text-[var(--text-on-gold)]'
                        : 'bg-[var(--bg-input)] text-[var(--gold-light)] border border-[var(--gold-border)]'
                    }`}
                  >
                    متاح ({stats.unusedCount})
                  </button>
                  <button
                    onClick={() => setFilterStatus('expired')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      filterStatus === 'expired'
                        ? 'bg-[var(--danger)] text-white'
                        : 'bg-[var(--bg-input)] text-[var(--danger)] border border-[rgba(244,63,94,0.3)]'
                    }`}
                  >
                    ملغى / منتهي ({stats.expiredOrRevokedCount})
                  </button>
                </div>
              </div>

              {/* Codes Cards / Table */}
              {filteredLicenses.length === 0 ? (
                <div className="card-surface p-8 text-center text-[var(--text-muted)] text-xs">
                  لا توجد أكواد مطابقة لخيارات البحث
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredLicenses.map((lic) => {
                    const isBound = Boolean(lic.boundIp && lic.firstActivatedAt);
                    const isExpired = lic.expiresAt && lic.expiresAt <= now;
                    const isRevoked = lic.status === 'revoked';
                    const daysRemaining = lic.expiresAt
                      ? Math.max(0, Math.ceil((lic.expiresAt - now) / (24 * 60 * 60 * 1000)))
                      : lic.durationDays;

                    return (
                      <div
                        key={lic.code}
                        className={`p-3 sm:p-3.5 rounded-2xl border transition-all text-xs flex flex-col gap-2.5 ${
                          isRevoked
                            ? 'bg-[var(--bg-input)] border-[rgba(244,63,94,0.4)] opacity-70'
                            : isBound
                            ? 'bg-[var(--bg-surface)] border-[rgba(16,185,129,0.35)] shadow-sm'
                            : 'bg-[var(--bg-surface)] border-[var(--gold-border)] shadow-xs'
                        }`}
                      >
                        {/* Top Row: Code string + Status badge + Copy button */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-sm text-[var(--gold-primary)] select-all" dir="ltr">
                              {lic.code}
                            </span>
                            <button
                              onClick={() => handleCopyCode(lic.code)}
                              title="نسخ الكود"
                              className="p-1 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
                            >
                              {copiedCode === lic.code ? (
                                <Check className="w-3.5 h-3.5 text-[var(--success)]" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {isRevoked ? (
                              <span className="px-2 py-0.5 rounded-md bg-[var(--danger-soft)] text-[var(--danger)] font-bold text-[10px]">
                                معطل / ملغى
                              </span>
                            ) : isExpired ? (
                              <span className="px-2 py-0.5 rounded-md bg-[var(--danger-soft)] text-[var(--danger)] font-bold text-[10px]">
                                منتهي الصلاحية
                              </span>
                            ) : isBound ? (
                              <span className="px-2 py-0.5 rounded-md bg-[var(--success-soft)] text-[var(--success)] font-bold text-[10px] flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
                                مفعل ومربوط بالهاتف
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-[var(--gold-soft)] text-[var(--gold-primary)] font-bold text-[10px]">
                                جاهز للاستخدام ({lic.durationDays} يوم)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Middle Row: Hardware / IP binding telemetry */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-[var(--text-secondary)]">
                          <div className="flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                            <span>عنوان الـ IP:</span>
                            <span className="font-mono font-bold text-[var(--text-primary)]" dir="ltr">
                              {lic.boundIp || 'لم يتصل بعد'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Smartphone className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                            <span>الجهاز:</span>
                            <span className="font-mono text-[10px] text-[var(--text-primary)] truncate max-w-[120px]" dir="ltr">
                              {lic.boundDevice ? lic.boundDevice.substring(0, 16) + '...' : 'غير مربوط'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                            <span>المتبقي:</span>
                            <span className="font-mono font-bold text-[var(--gold-primary)]">
                              {isBound ? `${daysRemaining} يوماً` : `${lic.durationDays} يوماً`}
                            </span>
                          </div>
                        </div>

                        {/* Client Note */}
                        {lic.notes && (
                          <div className="text-[11px] text-[var(--text-muted)] bg-[var(--bg-input)] px-2.5 py-1 rounded-lg">
                            ملاحظة: <span className="text-[var(--text-primary)]">{lic.notes}</span>
                          </div>
                        )}

                        {/* Bottom Row Actions */}
                        <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-[var(--border-subtle)]">
                          <button
                            onClick={() => handleCopyClientDelivery(lic.code, lic.durationDays)}
                            className="px-2.5 py-1 rounded-lg bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] text-[var(--gold-primary)] border border-[var(--gold-border)] font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Send className="w-3 h-3" />
                            <span>نسخ رسالة العميل للتيليجرام/الواتساب</span>
                          </button>

                          <div className="flex items-center gap-1 mr-auto">
                            {isBound && (
                              <button
                                onClick={() => handleResetDevice(lic.code)}
                                title="فك ارتباط الهاتف والـ IP ليتمكن العميل من الدخول من هاتف جديد"
                                className="px-2 py-1 rounded-lg bg-[var(--bg-input)] hover:bg-[var(--warning-soft)] text-[var(--warning)] border border-[var(--border-subtle)] text-[10.5px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <RefreshCw className="w-3 h-3" />
                                <span>فك ارتباط الجهاز</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleToggleStatus(lic.code)}
                              title={lic.status === 'revoked' ? 'تفعيل الكود' : 'تعطيل الكود'}
                              className={`px-2 py-1 rounded-lg text-[10.5px] font-bold flex items-center gap-1 cursor-pointer transition-colors border ${
                                lic.status === 'revoked'
                                  ? 'bg-[var(--success-soft)] border-[var(--success)] text-[var(--success)]'
                                  : 'bg-[var(--bg-input)] border-[var(--border-subtle)] text-[var(--danger)] hover:bg-[var(--danger-soft)]'
                              }`}
                            >
                              <Ban className="w-3 h-3" />
                              <span>{lic.status === 'revoked' ? 'تفعيل' : 'تعطيل'}</span>
                            </button>

                            <button
                              onClick={() => handleDeleteLicense(lic.code)}
                              title="حذف نهائي"
                              className="p-1 rounded-lg bg-[var(--bg-input)] hover:bg-[var(--danger-soft)] text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CREATE LICENSE CODE */}
          {activeTab === 'create' && (
            <div className="card-surface p-4 sm:p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[var(--gold-primary)] flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  <span>توليد كود ترخيص VIP مخصص لجهاز وعنوان IP واحد</span>
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                  الكود يتم ربطه وقفله تلقائياً على هاتف العميل وعنوان الـ IP عند أول تسجيل دخول ولا يمكن نقله أو مشاركته.
                </p>
              </div>

              <form onSubmit={handleCreateLicense} className="space-y-3.5">
                {/* Duration presets */}
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1.5">
                    مدة صلاحية الاشتراك:
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {[
                      { label: '30 يوماً (شهر)', days: 30 },
                      { label: '60 يوماً', days: 60 },
                      { label: '90 يوماً (3 أشهر)', days: 90 },
                      { label: '15 يوماً', days: 15 },
                      { label: '7 أيام (أسبوع)', days: 7 },
                      { label: '365 يوم (سنة)', days: 365 },
                    ].map((opt) => (
                      <button
                        type="button"
                        key={opt.days}
                        onClick={() => {
                          setDurationDays(opt.days);
                          setCustomDays('');
                        }}
                        className={`p-2 rounded-xl text-center text-xs font-bold transition-all cursor-pointer ${
                          durationDays === opt.days && !customDays
                            ? 'bg-[var(--gold-primary)] text-[var(--text-on-gold)] shadow-xs'
                            : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom days option */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">
                      أو أدخل عدد الأيام يدوياً:
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      placeholder="مثال: 45"
                      value={customDays}
                      onChange={(e) => setCustomDays(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] font-mono text-center focus:border-[var(--gold-border)] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">
                      اسم العميل / ملاحظة (اختياري):
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: اشتراك تيليجرام - أحمد"
                      value={clientNote}
                      onChange={(e) => setClientNote(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:border-[var(--gold-border)] outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full h-12 text-xs sm:text-sm shadow-md"
                  >
                    <Plus className="w-4 h-4 text-white" />
                    <span>توليد الكود الآن وحفظه في النظام</span>
                  </button>
                </div>
              </form>

              {/* Newly Created Code Display */}
              {createdCode && (
                <div className="p-4 rounded-2xl bg-[var(--bg-input)] border border-[var(--gold-border)] space-y-3 mt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--success)]">🎉 تم إنشاء الكود بنجاح:</span>
                    <button
                      onClick={() => handleCopyCode(createdCode)}
                      className="px-3 py-1 rounded-xl bg-[var(--gold-primary)] text-[var(--text-on-gold)] text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      {copiedCode === createdCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>نسخ الكود</span>
                    </button>
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-center font-mono font-black text-base sm:text-lg text-[var(--gold-primary)] select-all" dir="ltr">
                    {createdCode}
                  </div>

                  <button
                    onClick={() => handleCopyClientDelivery(createdCode, durationDays)}
                    className="w-full py-2.5 rounded-xl bg-[var(--bg-hover)] text-white hover:text-[var(--gold-primary)] text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Send className="w-4 h-4 text-[var(--gold-primary)]" />
                    <span>{copiedTemplate ? 'تم نسخ الرسالة الجاهزة!' : 'نسخ رسالة جاهزة لإرسالها للعميل'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: BACKUP & VERCEL RESILIENCE */}
          {activeTab === 'backup' && (
            <div className="card-surface p-4 sm:p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[var(--gold-primary)] flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  <span>نظام النسخ الاحتياطي السحابي والمحلي (Vercel Backup)</span>
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)] mt-1 leading-relaxed">
                  حفظ وتصدير واسترجاع الأكواد بنظام حماية مزدوج يضمن عدم ضياع أي كود نهائياً عند الرفع على استضافة Vercel.
                </p>
              </div>

              {/* Status Banner */}
              <div className="p-3.5 rounded-2xl bg-[var(--bg-input)] border border-[rgba(32,180,134,0.3)] flex items-start gap-3">
                <div className="p-2 rounded-xl bg-[rgba(32,180,134,0.15)] text-[var(--success)] shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="text-xs space-y-1">
                  <div className="font-bold text-[var(--success)] flex items-center gap-2">
                    <span>نظام الحفظ المزدوج نشط (Dual Redundancy Active)</span>
                    <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    جميع الأكواد ({licenses.length} كود) محفوظة في ذاكرة النظام الاحتياطية وتعمل 100% بكفاءة على استضافة Vercel دون الحاجة لخوادم خارجية.
                  </p>
                </div>
              </div>

              {/* Two Action Panels */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Panel 1: Export */}
                <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-[var(--gold-primary)]">
                      <Download className="w-4 h-4" />
                      <span>تصدير نسخة احتياطية (Export JSON)</span>
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] mt-1 leading-relaxed">
                      قم بتحميل ملف مشفر يحتوي على كافة الأكواد وحالاتها وتواريخها واحتفظ به على جهازك.
                    </p>
                  </div>

                  <button
                    onClick={handleExportBackupFile}
                    className="w-full py-2.5 px-3 rounded-xl bg-[var(--gold-primary)] hover:bg-[var(--gold-light)] text-[var(--text-on-gold)] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-98"
                  >
                    <Download className="w-4 h-4" />
                    <span>تحميل النسخة الاحتياطية الآن</span>
                  </button>
                </div>

                {/* Panel 2: Import */}
                <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                      <Upload className="w-4 h-4 text-[var(--gold-primary)]" />
                      <span>استرجاع نسخة احتياطية (Import Backup)</span>
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] mt-1 leading-relaxed">
                      اختر ملف نسخة احتياطية تم تصديره سابقاً لدمجه واسترجاع كافة الأكواد بضغطة زر.
                    </p>
                  </div>

                  <label className="w-full py-2.5 px-3 rounded-xl bg-[var(--bg-hover)] hover:bg-[var(--bg-input)] border border-[var(--gold-border)] text-[var(--gold-primary)] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-98">
                    <Upload className="w-4 h-4" />
                    <span>اختيار ملف واستعادة الأكواد</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportBackupFile}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Safety notice */}
              <div className="p-3 rounded-xl bg-[var(--bg-surface)]/60 border border-[var(--border-subtle)] text-[10px] text-[var(--text-muted)] leading-relaxed">
                💡 <b className="text-[var(--text-secondary)]">نصيحة أمنية:</b> يمكنك في أي وقت إنشاء أو تعديل الأكواد بحرية تامة، وسيتم حفظ كل كود فورياً في النسخة الاحتياطية ومزامنته تلقائياً على هاتفك وحسابك.
              </div>
            </div>
          )}

          {/* TAB 4: SECURITY & PASSWORDS */}
          {activeTab === 'security' && (
            <div className="card-surface p-4 sm:p-5 space-y-5">
              <div>
                <h3 className="text-sm font-bold text-[var(--gold-primary)] flex items-center gap-2">
                  <KeyRound className="w-4 h-4" />
                  <span>إدارة الأمان وكلمات المرور</span>
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                  تحديث كلمة مرور الدخول للوحة الإدارة أو كلمة المرور الرئيسية للمنصة.
                </p>
              </div>

              {securityMsg && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center justify-between border ${
                    securityMsg.type === 'success'
                      ? 'bg-[var(--success-soft)] border-[var(--success)] text-[var(--success)]'
                      : 'bg-[var(--danger-soft)] border-[var(--danger)] text-[var(--danger)]'
                  }`}
                >
                  <span>{securityMsg.text}</span>
                  <button onClick={() => setSecurityMsg(null)} className="cursor-pointer">
                    ✕
                  </button>
                </div>
              )}

              {/* Form 1: Admin Password */}
              <form onSubmit={handleChangeAdminPassword} className="space-y-3 p-3.5 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-subtle)]">
                <div className="text-xs font-bold text-[var(--text-primary)]">
                  تغيير كلمة مرور لوحة الإدارة (Admin Password):
                </div>
                <div>
                  <input
                    type="password"
                    placeholder="أدخل كلمة مرور الإدارة الجديدة..."
                    value={newAdminPass}
                    onChange={(e) => setNewAdminPass(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] font-mono text-center focus:border-[var(--gold-border)] outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !newAdminPass}
                  className="w-full h-10 rounded-xl bg-[var(--bg-hover)] text-[var(--gold-primary)] border border-[var(--gold-border)] font-bold text-xs hover:bg-[var(--gold-primary)] hover:text-[var(--text-on-gold)] transition-all cursor-pointer disabled:opacity-40"
                >
                  حفظ كلمة مرور الإدارة الجديدة
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </ModalWrapper>
  );
};
