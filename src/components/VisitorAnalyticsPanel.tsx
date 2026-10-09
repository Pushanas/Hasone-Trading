import React, { useState, useEffect } from 'react';
import {
  Users,
  Eye,
  Globe,
  Clock,
  Shield,
  Trash2,
  RefreshCw,
  Search,
  Smartphone,
  Tablet,
  Monitor,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';

interface VisitorSession {
  sessionId: string;
  ip: string;
  deviceCategory: 'mobile' | 'tablet' | 'desktop';
  browser: string;
  os: string;
  firstVisit: number;
  lastActivity: number;
  currentPath: string;
  pageViews: number;
  status: 'active' | 'inactive';
  isOnline: boolean;
  isLoggedIn?: boolean;
  loginType?: 'master' | 'license_vip' | 'none';
  licenseCode?: string | null;
}

interface AnalyticsSummary {
  activeNow: number;
  visitsToday: number;
  uniqueToday: number;
  totalSessions: number;
  retentionDays: number;
}

interface VisitorAnalyticsPanelProps {
  adminToken: string;
}

export const VisitorAnalyticsPanel: React.FC<VisitorAnalyticsPanelProps> = ({ adminToken }) => {
  const [summary, setSummary] = useState<AnalyticsSummary>({
    activeNow: 0,
    visitsToday: 0,
    uniqueToday: 0,
    totalSessions: 0,
    retentionDays: 30,
  });

  const [visitors, setVisitors] = useState<VisitorSession[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  // Retention policy state
  const [retentionDaysInput, setRetentionDaysInput] = useState<number>(30);
  const [isUpdatingRetention, setIsUpdatingRetention] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Deletion modal state
  const [sessionToDelete, setSessionToDelete] = useState<VisitorSession | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isCleaningUp, setIsCleaningUp] = useState<boolean>(false);

  // Fetch summary and visitor logs
  const fetchSummary = async () => {
    try {
      const res = await fetch('/api/admin/analytics/summary', {
        headers: { 'x-admin-token': adminToken },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSummary(data);
          setRetentionDaysInput(data.retentionDays || 30);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch analytics summary:', err);
    }
  };

  const fetchVisitors = async (page: number = currentPage) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '10',
        search: searchTerm,
        status: statusFilter,
      });

      const res = await fetch(`/api/admin/analytics/visitors?${params.toString()}`, {
        headers: { 'x-admin-token': adminToken },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setVisitors(data.visitors || []);
          setTotalPages(data.totalPages || 1);
          setTotalRecords(data.total || 0);
          setCurrentPage(data.page || 1);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch visitors list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    fetchVisitors(1);
    const interval = setInterval(() => {
      fetchSummary();
      fetchVisitors(currentPage);
    }, 15000); // Live refresh every 15s
    return () => clearInterval(interval);
  }, [adminToken, statusFilter, searchTerm]);

  // Update retention policy
  const handleSaveRetention = async () => {
    setIsUpdatingRetention(true);
    setActionNotice(null);
    try {
      const res = await fetch('/api/admin/analytics/retention', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken,
        },
        body: JSON.stringify({ retentionDays: retentionDaysInput }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionNotice({ text: data.message, type: 'success' });
        setSummary((prev) => ({ ...prev, retentionDays: data.retentionDays }));
      } else {
        setActionNotice({ text: data.error || 'فشل تحديث سياسة الاحتفاظ', type: 'error' });
      }
    } catch {
      setActionNotice({ text: 'حدث خطأ في الاتصال بالسيرفر', type: 'error' });
    } finally {
      setIsUpdatingRetention(false);
    }
  };

  // Run cleanup of old sessions
  const handleRunCleanup = async () => {
    if (!window.confirm(`هل أنت متأكد من تنظيف وحذف سجلات الزوار الأقدم من ${summary.retentionDays} يوماً؟`)) {
      return;
    }

    setIsCleaningUp(true);
    setActionNotice(null);
    try {
      const res = await fetch('/api/admin/analytics/cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken,
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionNotice({ text: data.message, type: 'success' });
        fetchSummary();
        fetchVisitors(1);
      } else {
        setActionNotice({ text: data.error || 'فشل تنظيف السجلات', type: 'error' });
      }
    } catch {
      setActionNotice({ text: 'حدث خطأ أثناء تنظيف السجلات', type: 'error' });
    } finally {
      setIsCleaningUp(false);
    }
  };

  // Delete individual session
  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/analytics/visitor?sessionId=${encodeURIComponent(sessionToDelete.sessionId)}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': adminToken },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionNotice({ text: 'تم حذف سجل الجلسة بنجاح.', type: 'success' });
        setSessionToDelete(null);
        fetchSummary();
        fetchVisitors(currentPage);
      } else {
        setActionNotice({ text: data.error || 'فشل حذف الجلسة', type: 'error' });
      }
    } catch {
      setActionNotice({ text: 'حدث خطأ أثناء حذف الجلسة', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDateTime = (ts: number) => {
    if (!ts) return 'غير متوفر';
    const d = new Date(ts);
    return d.toLocaleString('ar-EG', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getDeviceIcon = (category: string) => {
    switch (category) {
      case 'mobile':
        return <Smartphone className="w-3.5 h-3.5 text-cyan-400" />;
      case 'tablet':
        return <Tablet className="w-3.5 h-3.5 text-violet-400" />;
      default:
        return <Monitor className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  return (
    <div className="space-y-4 text-right" dir="rtl">
      {/* 4 Analytics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Active Now Card */}
        <div className="card-surface p-3 border-emerald-500/30 relative overflow-hidden bg-gradient-to-br from-emerald-950/20 to-[var(--bg-surface)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-400">متصل الآن (Active)</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-emerald-400 tabular-nums">
              {summary.activeNow}
            </span>
            <span className="text-[10px] text-[var(--text-muted)] font-medium">زائر نشط</span>
          </div>
          <span className="text-[9px] text-[var(--text-muted)] block mt-0.5 font-mono">
            نبض حي في آخر 120 ثانية
          </span>
        </div>

        {/* Visits Today Card */}
        <div className="card-surface p-3 border-cyan-500/30 bg-gradient-to-br from-cyan-950/20 to-[var(--bg-surface)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-cyan-400">زيارات اليوم</span>
            <Eye className="w-4 h-4 text-cyan-400 opacity-80" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-cyan-400 tabular-nums">
              {summary.visitsToday}
            </span>
            <span className="text-[10px] text-[var(--text-muted)] font-medium">مشاهدة</span>
          </div>
          <span className="text-[9px] text-[var(--text-muted)] block mt-0.5 font-mono">
            منذ بداية اليوم (00:00)
          </span>
        </div>

        {/* Unique Sessions Today */}
        <div className="card-surface p-3 border-violet-500/30 bg-gradient-to-br from-violet-950/20 to-[var(--bg-surface)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-violet-400">زوار فريدون اليوم</span>
            <Users className="w-4 h-4 text-violet-400 opacity-80" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-violet-400 tabular-nums">
              {summary.uniqueToday}
            </span>
            <span className="text-[10px] text-[var(--text-muted)] font-medium">جلسة فريدة</span>
          </div>
          <span className="text-[9px] text-[var(--text-muted)] block mt-0.5 font-mono">
            عناوين IP فريدة اليوم
          </span>
        </div>

        {/* Total Recorded Sessions */}
        <div className="card-surface p-3 border-[var(--gold-border)] bg-gradient-to-br from-amber-950/20 to-[var(--bg-surface)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--gold-primary)]">إجمالي الجلسات</span>
            <Globe className="w-4 h-4 text-[var(--gold-primary)] opacity-80" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-[var(--gold-light)] tabular-nums">
              {summary.totalSessions}
            </span>
            <span className="text-[10px] text-[var(--text-muted)] font-medium">سجل دائم</span>
          </div>
          <span className="text-[9px] text-[var(--text-muted)] block mt-0.5 font-mono">
            محفوظة في Firestore
          </span>
        </div>
      </div>

      {/* Notice Banner */}
      {actionNotice && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center justify-between border ${
            actionNotice.type === 'success'
              ? 'bg-[var(--success-soft)] border-[var(--success)] text-[var(--success)]'
              : 'bg-[var(--danger-soft)] border-[var(--danger)] text-[var(--danger)]'
          }`}
        >
          <span>{actionNotice.text}</span>
          <button onClick={() => setActionNotice(null)} className="cursor-pointer text-xs font-mono">
            ✕
          </button>
        </div>
      )}

      {/* Privacy Notice & Configurable Retention Policy Card */}
      <div className="card-surface p-3.5 border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-[var(--border-subtle)] pb-2.5">
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-[var(--gold-primary)] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-[var(--text-primary)]">
                إشعار الخصوصية والأمان وحفظ السجلات
              </h4>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                يتم رصد عنوان IP العام ومعلومات الجهاز وتوقيت النشاط لأغراض حماية الجلسات والتحليلات المشروعة، دون جمع أي بيانات شخصية أو سرية.
              </p>
            </div>
          </div>

          <button
            onClick={handleRunCleanup}
            disabled={isCleaningUp}
            className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-[var(--danger-soft)] hover:bg-[var(--danger)]/25 text-[var(--danger)] border border-[var(--danger)]/30 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isCleaningUp ? 'جارٍ التنظيف...' : 'تنظيف السجلات القديمة'}</span>
          </button>
        </div>

        {/* Retention Policy Settings */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--gold-primary)]" />
            <span className="text-[var(--text-secondary)] font-medium">سياسة الاحتفاظ بالبيانات:</span>
            <select
              value={retentionDaysInput}
              onChange={(e) => setRetentionDaysInput(parseInt(e.target.value))}
              className="bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-lg px-2.5 py-1 text-xs outline-none focus:border-[var(--gold-primary)] font-mono"
            >
              <option value={7}>7 أيام (أسبوع)</option>
              <option value={14}>14 يوماً (أسبوعان)</option>
              <option value={30}>30 يوماً (الافتراضي - شهر)</option>
              <option value={60}>60 يوماً (شهران)</option>
              <option value={90}>90 يوماً (3 أشهر)</option>
            </select>
            <button
              onClick={handleSaveRetention}
              disabled={isUpdatingRetention || retentionDaysInput === summary.retentionDays}
              className="px-2.5 py-1 rounded-lg bg-[var(--gold-primary)] text-[var(--text-on-gold)] font-bold text-xs hover:brightness-110 transition-all cursor-pointer disabled:opacity-40"
            >
              {isUpdatingRetention ? 'جارٍ الحفظ...' : 'حفظ السياسة'}
            </button>
          </div>

          <span className="text-[10px] text-[var(--text-muted)] font-mono">
            يتم حذف السجلات تلقائياً بعد مرور المدة المحددة من آخر نشاط
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="بحث بعنوان IP، المتصفح، النظام، أو المسار..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full h-10 pr-9 pl-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:border-[var(--gold-border)] outline-none"
          />
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute right-3 top-1/2 -translate-y-1/2" />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-[var(--bg-input)] p-1 rounded-xl border border-[var(--border-subtle)] flex-wrap">
          <button
            onClick={() => {
              setStatusFilter('all');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-[var(--gold-primary)] text-[var(--text-on-gold)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-white'
            }`}
          >
            الكل ({totalRecords})
          </button>
          <button
            onClick={() => {
              setStatusFilter('active');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              statusFilter === 'active'
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-white'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>نشط الآن</span>
          </button>
          <button
            onClick={() => {
              setStatusFilter('password');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'password'
                ? 'bg-[var(--gold-primary)] text-[var(--text-on-gold)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-white'
            }`}
          >
            بكلمة المرور
          </button>
          <button
            onClick={() => {
              setStatusFilter('vip');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'vip'
                ? 'bg-[var(--gold-primary)] text-[var(--text-on-gold)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-white'
            }`}
          >
            بكود VIP
          </button>
          <button
            onClick={() => {
              setStatusFilter('inactive');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'inactive'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-white'
            }`}
          >
            غير نشط
          </button>
        </div>

        <button
          onClick={() => {
            fetchSummary();
            fetchVisitors(currentPage);
          }}
          disabled={loading}
          className="p-2.5 rounded-xl bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--gold-primary)] transition-all cursor-pointer self-end sm:self-auto"
          title="تحديث البيانات"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Visitors Table */}
      <div className="card-surface overflow-hidden border-[var(--border-subtle)]">
        <div className="overflow-x-auto scrollbar-none">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] text-[11px] text-[var(--text-secondary)] font-bold">
                <th className="p-3 whitespace-nowrap">عنوان IP العام (المرصود)</th>
                <th className="p-3 whitespace-nowrap">الحالة اللحظية</th>
                <th className="p-3 whitespace-nowrap">حالة التسجيل</th>
                <th className="p-3 whitespace-nowrap">الجهاز والمواصفات</th>
                <th className="p-3 whitespace-nowrap">المسار الحالي</th>
                <th className="p-3 whitespace-nowrap text-center">المشاهدات</th>
                <th className="p-3 whitespace-nowrap">أول زيارة</th>
                <th className="p-3 whitespace-nowrap">آخر ظهور (Last Seen)</th>
                <th className="p-3 whitespace-nowrap text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {loading && visitors.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-[var(--text-muted)]">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[var(--gold-primary)]" />
                    جارٍ تحميل سجلات وتحليلات الزوار...
                  </td>
                </tr>
              ) : visitors.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-[var(--text-muted)]">
                    لا توجد سجلات زوار تطابق معايير البحث الحالية.
                  </td>
                </tr>
              ) : (
                visitors.map((visitor) => (
                  <tr
                    key={visitor.sessionId}
                    className="hover:bg-[var(--bg-hover)]/60 transition-colors"
                  >
                    {/* IP */}
                    <td className="p-3 whitespace-nowrap font-mono font-bold text-[var(--text-primary)]">
                      <div className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-[var(--gold-primary)] opacity-70" />
                        <span dir="ltr">{visitor.ip || '127.0.0.1'}</span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="p-3 whitespace-nowrap">
                      {visitor.isOnline ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                          </span>
                          متصل الآن
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                          <Clock className="w-3 h-3 text-slate-400" />
                          غير نشط
                        </span>
                      )}
                    </td>

                    {/* Login / Auth status */}
                    <td className="p-3 whitespace-nowrap">
                      {visitor.isLoggedIn ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--gold-primary)]/15 border border-[var(--gold-primary)]/30 text-[var(--gold-primary)]">
                            <Key className="w-3 h-3" />
                            {visitor.loginType === 'master' ? 'مسجل بكلمة المرور' : 'مسجل بكود VIP'}
                          </span>
                          {visitor.licenseCode && (
                            <span className="text-[9px] font-mono text-[var(--text-muted)] truncate max-w-[140px]" title={visitor.licenseCode}>
                              {visitor.licenseCode}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] text-[var(--text-muted)] bg-[var(--bg-input)] border border-[var(--border-subtle)]">
                          زائر عام
                        </span>
                      )}
                    </td>

                    {/* Device & OS / Browser */}
                    <td className="p-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getDeviceIcon(visitor.deviceCategory)}
                        <div>
                          <span className="text-[11px] font-bold text-[var(--text-primary)] block">
                            {visitor.browser}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)] font-mono">
                            {visitor.os} ({visitor.deviceCategory})
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Path */}
                    <td className="p-3 whitespace-nowrap font-mono text-[11px] text-cyan-400">
                      <span className="bg-[var(--bg-input)] px-2 py-0.5 rounded border border-[var(--border-subtle)]">
                        {visitor.currentPath || '/'}
                      </span>
                    </td>

                    {/* Pageviews */}
                    <td className="p-3 whitespace-nowrap text-center font-mono font-bold text-[var(--gold-primary)]">
                      {visitor.pageViews || 1}
                    </td>

                    {/* First visit */}
                    <td className="p-3 whitespace-nowrap text-[10px] text-[var(--text-secondary)] font-mono">
                      {formatDateTime(visitor.firstVisit)}
                    </td>

                    {/* Last activity */}
                    <td className="p-3 whitespace-nowrap text-[10px] font-mono">
                      <span className={visitor.isOnline ? 'text-emerald-400 font-bold' : 'text-[var(--text-secondary)]'}>
                        {formatDateTime(visitor.lastActivity)}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="p-3 whitespace-nowrap text-center">
                      <button
                        onClick={() => setSessionToDelete(visitor)}
                        title="حذف سجل الجلسة"
                        className="p-1.5 rounded-lg bg-[var(--danger-soft)] hover:bg-[var(--danger)]/30 text-[var(--danger)] transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] flex items-center justify-between text-xs">
            <span className="text-[11px] text-[var(--text-muted)] font-mono">
              صفحة {currentPage} من {totalPages} (إجمالي {totalRecords} جلسة)
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => fetchVisitors(currentPage - 1)}
                disabled={currentPage <= 1 || loading}
                className="px-3 py-1 rounded-lg bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-white disabled:opacity-30 cursor-pointer font-bold"
              >
                السابق
              </button>
              <button
                onClick={() => fetchVisitors(currentPage + 1)}
                disabled={currentPage >= totalPages || loading}
                className="px-3 py-1 rounded-lg bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-white disabled:opacity-30 cursor-pointer font-bold"
              >
                التالي
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Observed IP Technical Disclaimer */}
      <p className="text-[10px] text-[var(--text-muted)] text-right leading-relaxed font-mono">
        💡 <strong className="text-[var(--text-secondary)]">تنبيه فني:</strong> عنوان IP المعروض هو العنوان العام المرصود بواسطة الخادم عند استقبال الطلبات، ولا يُمثّل معرّفاً شخصياً أو حتمياً لهاتف أو شخص بعينه نظراً لاشتراك الشبكات ومزودي الخدمة (NAT/Carrier IPs).
      </p>

      {/* Delete Confirmation Modal */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="card-surface p-5 max-w-sm w-full border-[var(--danger)]/40 text-right space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--danger-soft)] text-[var(--danger)] flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white">تأكيد حذف سجل الجلسة</h4>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              هل أنت متأكد من حذف سجل الجلسة لعنوان الـ IP{' '}
              <strong className="text-white font-mono">{sessionToDelete.ip}</strong> نهائياً من قاعدة البيانات؟
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
              <button
                onClick={() => setSessionToDelete(null)}
                className="px-3 py-1.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-secondary)] hover:text-white cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={confirmDeleteSession}
                disabled={isDeleting}
                className="px-3 py-1.5 rounded-lg bg-[var(--danger)] text-white text-xs font-bold hover:brightness-110 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'جارٍ الحذف...' : 'تأكيد الحذف'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
