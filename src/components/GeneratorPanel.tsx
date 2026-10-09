import React, { useState } from 'react';
import { CheckSquare, Square, Plus, Search, Zap, Sparkles } from 'lucide-react';
import { GeneratorConfig, MartingaleType, TimeFrame } from '../types';

interface GeneratorPanelProps {
  config: GeneratorConfig;
  onChangeConfig: React.Dispatch<React.SetStateAction<GeneratorConfig>>;
  availablePairs: string[];
  onAddCustomPair: (pair: string) => void;
  onGenerate: () => void;
  onOpenExportModal: () => void;
  hasSchedule: boolean;
}

export const GeneratorPanel: React.FC<GeneratorPanelProps> = ({
  config,
  onChangeConfig,
  availablePairs,
  onAddCustomPair,
  onGenerate,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [newPairInput, setNewPairInput] = useState('');
  const [isAddingPair, setIsAddingPair] = useState(false);

  // Toggle selection of a single pair
  const togglePair = (pair: string) => {
    onChangeConfig((prev) => {
      const exists = prev.selectedPairs.includes(pair);
      return {
        ...prev,
        selectedPairs: exists
          ? prev.selectedPairs.filter((p) => p !== pair)
          : [...prev.selectedPairs, pair],
      };
    });
  };

  // Select all
  const selectAllPairs = () => {
    onChangeConfig((prev) => ({
      ...prev,
      selectedPairs: [...availablePairs],
    }));
  };

  // Deselect all
  const clearAllPairs = () => {
    onChangeConfig((prev) => ({
      ...prev,
      selectedPairs: [],
    }));
  };

  // Add custom pair handler
  const handleAddNewPair = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newPairInput.trim().toUpperCase();
    if (!clean) return;
    const formatted = clean.includes('OTC') ? clean : `${clean} OTC`;
    onAddCustomPair(formatted);
    setNewPairInput('');
    setIsAddingPair(false);
  };

  // Filtered pairs based on search
  const filteredPairs = availablePairs.filter((p) =>
    p.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  return (
    <div className="card-surface p-4 sm:p-5 space-y-4 text-right">
      {/* Header Area matching Screenshot 1 */}
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--bg-input)] border border-[var(--gold-border)] text-xs font-mono font-bold text-[var(--gold-primary)]">
          <span>{config.selectedPairs.length}</span>
          <span>زوج</span>
        </div>

        <div className="text-right flex-1 px-3">
          <h2 className="text-sm sm:text-base font-black text-[var(--text-primary)] tracking-tight flex items-center justify-end gap-1.5">
            <span>مولّد صفقات Hasone Trading</span>
          </h2>
          <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
            توليد صفقات زمنية دقيقة لأسواق الـ OTC
          </p>
        </div>

        <div className="w-9 h-9 rounded-xl bg-[var(--bg-input)] border border-[var(--gold-border)] flex items-center justify-center text-[var(--gold-primary)] shadow-xs">
          <Sparkles className="w-4 h-4" />
        </div>
      </div>

      {/* Inputs Form */}
      <div className="space-y-3">
        {/* Row 1: Trade Count & Timeframe */}
        <div className="grid grid-cols-2 gap-3">
          {/* Timeframe */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-[var(--text-secondary)] block text-right">
              فريم الشمعة (مدة الصفقة)
            </label>
            <div className="relative">
              <select
                value={config.timeframe}
                onChange={(e) => {
                  const tf = e.target.value as TimeFrame;
                  onChangeConfig((prev) => ({
                    ...prev,
                    timeframe: tf,
                    gapMinutes: tf === 'M5' ? Math.max(5, prev.gapMinutes) : prev.gapMinutes,
                  }));
                }}
                className="w-full h-11 px-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--gold-primary)] text-xs font-bold focus:border-[var(--gold-border)] outline-none transition-all cursor-pointer appearance-none text-right pr-3 pl-8"
              >
                <option value="M1">دقيقة واحدة (M1)</option>
                <option value="M5">خمس دقائق (M5)</option>
              </select>
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)] text-xs">
                ▼
              </div>
            </div>
          </div>

          {/* Trade Count */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-[var(--text-secondary)] block text-right">
              عدد الصفقات
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={config.tradeCount}
              onChange={(e) =>
                onChangeConfig((prev) => ({
                  ...prev,
                  tradeCount: Math.max(1, Math.min(50, parseInt(e.target.value) || 1)),
                }))
              }
              className="w-full h-11 px-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-bold font-mono focus:border-[var(--gold-border)] outline-none transition-all text-center"
            />
          </div>
        </div>

        {/* Row 2: Gap Minutes & Martingale */}
        <div className="grid grid-cols-2 gap-3">
          {/* Martingale System */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-[var(--text-secondary)] block text-right">
              نظام المضاعفة
            </label>
            <div className="relative">
              <select
                value={config.martingale}
                onChange={(e) =>
                  onChangeConfig((prev) => ({
                    ...prev,
                    martingale: e.target.value as MartingaleType,
                  }))
                }
                className="w-full h-11 px-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--gold-primary)] text-xs font-bold focus:border-[var(--gold-border)] outline-none transition-all cursor-pointer appearance-none text-right pr-3 pl-8"
              >
                <option value="NON MTG">بدون مضاعفة (NON MTG)</option>
                <option value="MTG 1">مضاعفة واحدة (MTG 1)</option>
                <option value="MTG 2">مضاعفتين (MTG 2)</option>
              </select>
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)] text-xs">
                ▼
              </div>
            </div>
          </div>

          {/* Time Gap */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-[var(--text-secondary)] block text-right">
              الفاصل الزمني
            </label>
            <div className="relative">
              <select
                value={config.gapMinutes}
                onChange={(e) =>
                  onChangeConfig((prev) => ({
                    ...prev,
                    gapMinutes: parseInt(e.target.value) || 5,
                  }))
                }
                className="w-full h-11 px-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--gold-primary)] text-xs font-bold focus:border-[var(--gold-border)] outline-none transition-all cursor-pointer appearance-none text-right pr-3 pl-8"
              >
                {config.timeframe === 'M1' && <option value="1">كل دقيقة واحدة</option>}
                {config.timeframe === 'M1' && <option value="2">كل دقيقتين</option>}
                {config.timeframe === 'M1' && <option value="3">كل 3 دقائق</option>}
                <option value="5">كل 5 دقائق</option>
                <option value="10">كل 10 دقائق</option>
                <option value="15">كل 15 دقيقة</option>
              </select>
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)] text-xs">
                ▼
              </div>
            </div>
          </div>
        </div>

        {/* Currency Pairs OTC Section */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={selectAllPairs}
                className="px-2.5 py-1 rounded-lg bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] text-[var(--gold-primary)] border border-[var(--border-subtle)] text-[11px] font-bold cursor-pointer transition-colors"
              >
                الكل
              </button>
              <button
                type="button"
                onClick={clearAllPairs}
                className="px-2.5 py-1 rounded-lg bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] text-[var(--text-muted)] border border-[var(--border-subtle)] text-[11px] font-bold cursor-pointer transition-colors"
              >
                مسح
              </button>
              <button
                type="button"
                onClick={() => setIsAddingPair(!isAddingPair)}
                className="px-2.5 py-1 rounded-lg bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] text-[var(--gold-primary)] border border-[var(--gold-border)] text-[11px] font-bold cursor-pointer transition-colors flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>إضافة</span>
              </button>
            </div>

            <label className="text-[11px] font-bold text-[var(--text-secondary)]">
              أزواج العملات (OTC)
            </label>
          </div>

          {/* Add custom pair form */}
          {isAddingPair && (
            <form onSubmit={handleAddNewPair} className="flex gap-1.5 p-2 rounded-xl bg-[var(--bg-input)] border border-[var(--gold-border)]">
              <button
                type="submit"
                className="btn-primary px-3 py-1.5 text-xs"
              >
                حفظ
              </button>
              <input
                type="text"
                value={newPairInput}
                onChange={(e) => setNewPairInput(e.target.value)}
                placeholder="مثال: EURUSD OTC"
                className="flex-1 px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-mono outline-none text-left dir-ltr"
                autoFocus
              />
            </form>
          )}

          {/* Search Pair Box */}
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث بين الأزواج..."
              className="w-full h-10 pr-9 pl-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-medium focus:border-[var(--gold-border)] outline-none transition-all placeholder:text-[var(--text-muted)]"
            />
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute right-3 top-1/2 -translate-y-1/2" />
          </div>

          {/* Pairs Grid matching Screenshot 1 */}
          <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1 scrollbar-thin">
            {filteredPairs.map((pair) => {
              const isSelected = config.selectedPairs.includes(pair);
              return (
                <button
                  key={pair}
                  type="button"
                  onClick={() => togglePair(pair)}
                  className={`p-2 rounded-xl border text-xs flex items-center justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--bg-hover)] border-[var(--gold-border)] text-[var(--text-primary)] shadow-xs'
                      : 'bg-[var(--bg-input)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--border-default)]'
                  }`}
                >
                  <span
                    className={`font-mono text-[11px] font-bold tracking-tight ${
                      isSelected ? 'text-[var(--gold-primary)]' : 'text-[var(--text-muted)]'
                    }`}
                    dir="ltr"
                  >
                    {pair}
                  </span>
                  {isSelected ? (
                    <CheckSquare className="w-3.5 h-3.5 text-[var(--gold-primary)] shrink-0" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Big CTA Button */}
      <div className="pt-2">
        <button
          onClick={onGenerate}
          className="btn-primary w-full py-3.5 px-4 text-sm"
        >
          <Zap className="w-4 h-4 text-[var(--text-on-burgundy)] fill-current" />
          <span>إنشاء وتحديث جدول صفقات Hasone Trading ({config.timeframe})</span>
          <Zap className="w-4 h-4 text-[var(--text-on-burgundy)] fill-current" />
        </button>
      </div>
    </div>
  );
};
