// src/components/hasone/HasoneTradeHistoryTable.tsx
// Comprehensive Signal History & Database Management Table

import React, { useState } from 'react';
import {
  Download,
  Trash2,
  Database,
  Filter,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Clock,
  Shield,
  FileSpreadsheet,
} from 'lucide-react';
import { RecordedTrade, exportTradesToCSV, clearTradeHistory, triggerServerBackup } from '../../utils/hasoneTracker';

interface HasoneTradeHistoryTableProps {
  trades: RecordedTrade[];
  onRefreshHistory: () => void;
}

export const HasoneTradeHistoryTable: React.FC<HasoneTradeHistoryTableProps> = ({
  trades,
  onRefreshHistory,
}) => {
  const [resultFilter, setResultFilter] = useState<string>('ALL');
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [isBackingUp, setIsBackingUp] = useState<boolean>(false);

  const filteredTrades = trades.filter((t) => {
    if (resultFilter === 'ALL') return true;
    return t.result === resultFilter;
  });

  const handleBackupNow = async () => {
    setIsBackingUp(true);
    setBackupStatus(null);
    try {
      const res = await triggerServerBackup('user_history_backup');
      if (res.success) {
        setBackupStatus(`تم إنشاء نسخة احتياطية آمنة في الخادم بنجاح (${res.fileName})`);
        setTimeout(() => setBackupStatus(null), 5000);
      } else {
        setBackupStatus(`فشل إنشاء النسخة: ${res.error}`);
      }
    } catch (e: any) {
      setBackupStatus(`خطأ: ${e.message}`);
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleClear = () => {
    if (confirm('هل أنت متأكد من رغبتك في مسح سجل الإشارات بالكامل؟')) {
      clearTradeHistory();
      onRefreshHistory();
    }
  };

  return (
    <div className="space-y-3.5" dir="rtl">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {/* Result Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {[
            { id: 'ALL', label: 'الكل', count: trades.length },
            { id: 'WIN', label: 'رابحة', count: trades.filter((t) => t.result === 'WIN').length },
            { id: 'LOSS', label: 'خاسرة', count: trades.filter((t) => t.result === 'LOSS').length },
            { id: 'PENDING', label: 'معلقة', count: trades.filter((t) => t.result === 'PENDING').length },
          ].map((tab) => {
            const isActive = resultFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setResultFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[var(--gold-primary)] text-[var(--text-on-gold)]'
                    : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-white border border-[var(--border-subtle)]'
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] opacity-75 font-mono mr-1">({tab.count})</span>
              </button>
            );
          })}
        </div>

        {/* Database Actions */}
        <div className="flex items-center gap-2">
          {/* Backup Database */}
          <button
            onClick={handleBackupNow}
            disabled={isBackingUp}
            className="px-3 py-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            title="إنشاء نسخة احتياطية فورية في قاعدة البيانات"
          >
            <Database className="w-3.5 h-3.5" />
            <span>{isBackingUp ? 'جاري النسخ...' : 'نسخ احتياطي للداتابيز'}</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={() => exportTradesToCSV(trades)}
            disabled={trades.length === 0}
            className="px-3 py-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-35"
            title="تصدير السجل كملف Excel / CSV"
          >
            <Download className="w-3.5 h-3.5 text-[var(--gold-primary)]" />
            <span>تصدير CSV</span>
          </button>

          {/* Clear History */}
          <button
            onClick={handleClear}
            disabled={trades.length === 0}
            className="px-2.5 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-35"
            title="مسح السجل بالكامل"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {backupStatus && (
        <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono">
          {backupStatus}
        </div>
      )}

      {/* History Table Container */}
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[var(--bg-input)] text-[var(--text-muted)] border-b border-[var(--border-subtle)] text-[11px] font-bold">
              <tr>
                <th className="p-3">زوج العملات</th>
                <th className="p-3">الاتجاه</th>
                <th className="p-3">وقت الدخول</th>
                <th className="p-3">المدة</th>
                <th className="p-3">سعر الدخول</th>
                <th className="p-3">سعر الإغلاق</th>
                <th className="p-3">النتيجة</th>
                <th className="p-3">المصدر</th>
                <th className="p-3">الوضع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)] font-mono">
              {filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-xs text-[var(--text-muted)]">
                    لا توجد إشارات مسجلة تطابق التصفية.
                  </td>
                </tr>
              ) : (
                filteredTrades.map((t) => {
                  const isCall = t.signalType === 'CALL';
                  const isWin = t.result === 'WIN';
                  const isLoss = t.result === 'LOSS';

                  return (
                    <tr key={t.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                      <td className="p-3 font-bold text-white flex items-center gap-1.5">
                        <span>{t.pairSymbol}</span>
                        {t.isOTC && (
                          <span className="text-[9px] px-1 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            OTC
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <span
                          className={`font-black ${
                            isCall ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isCall ? 'CALL صعود' : 'PUT هبوط'}
                        </span>
                      </td>
                      <td className="p-3 text-[var(--gold-primary)] font-bold">{t.entryTime}</td>
                      <td className="p-3 text-[var(--text-secondary)]">{t.durationStr}</td>
                      <td className="p-3 text-white">{t.entryPrice}</td>
                      <td className="p-3 text-[var(--text-secondary)]">{t.exitPrice ?? '—'}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isWin
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : isLoss
                              ? 'bg-rose-500/20 text-rose-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {t.result === 'WIN'
                            ? 'رابحة'
                            : t.result === 'LOSS'
                            ? 'خاسرة'
                            : t.result === 'DRAW'
                            ? 'تعادل'
                            : 'قيد الانتظار'}
                        </span>
                      </td>
                      <td className="p-3 text-[10px] text-[var(--text-muted)] truncate max-w-[120px]">
                        {t.dataSource.includes('Twelve Data') ? 'Twelve Data' : 'Quotex OTC'}
                      </td>
                      <td className="p-3 text-[10px] text-[var(--text-muted)]">
                        {t.isPaper ? 'تجريبي' : 'حقيقي'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
