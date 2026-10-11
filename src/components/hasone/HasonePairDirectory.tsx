// src/components/hasone/HasonePairDirectory.tsx
// Financial Directory for Binary Options Currency Pairs with Real-time Status & Filtering

import React, { useState, useMemo } from 'react';
import { Search, Star, Radio, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { CurrencyPair } from '../../constants/hasonePairs';

interface HasonePairDirectoryProps {
  pairs: CurrencyPair[];
  selectedPairId: string;
  onSelectPair: (pairId: string) => void;
  favoritePairs: string[];
  onToggleFavorite: (pairId: string) => void;
  liveWsPrice?: number | null;
  liveWsSymbol?: string | null;
}

const CATEGORIES = [
  { id: 'all', label: 'الكل' },
  { id: 'major', label: 'العملات الرئيسية' },
  { id: 'minor', label: 'العملات الثانوية' },
  { id: 'otc', label: 'أزواج OTC' },
  { id: 'exotic', label: 'العملات الثانية (BRL/TRY/MXN)' },
  { id: 'favorites', label: 'المفضلة' },
];

export const HasonePairDirectory: React.FC<HasonePairDirectoryProps> = ({
  pairs,
  selectedPairId,
  onSelectPair,
  favoritePairs,
  onToggleFavorite,
  liveWsPrice,
  liveWsSymbol,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredPairs = useMemo(() => {
    return pairs.filter((pair) => {
      // Category filter
      if (activeCategory === 'favorites') {
        if (!favoritePairs.includes(pair.id)) return false;
      } else if (activeCategory !== 'all') {
        if (pair.category !== activeCategory) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchesSymbol = pair.symbol.toLowerCase().includes(query);
        const matchesDisplay = pair.displayName.toLowerCase().includes(query);
        const matchesOTC = query === 'otc' && pair.isOTC;
        const matchesCurrency = pair.baseAsset.toLowerCase().includes(query) || pair.quoteAsset.toLowerCase().includes(query);
        return matchesSymbol || matchesDisplay || matchesOTC || matchesCurrency;
      }

      return true;
    });
  }, [pairs, activeCategory, searchQuery, favoritePairs]);

  return (
    <div className="space-y-3" dir="rtl">
      {/* Search Input & Category Pills */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن زوج (مثال: EUR, USD, BRL, OTC, JPY)..."
            className="w-full h-11 pr-10 pl-3.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-xs font-medium text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--gold-primary)] focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] hover:text-white"
            >
              مسح
            </button>
          )}
        </div>

        {/* Category Segmented Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            const count =
              cat.id === 'favorites'
                ? favoritePairs.length
                : cat.id === 'all'
                ? pairs.length
                : pairs.filter((p) => p.category === cat.id).length;

            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[var(--gold-primary)] text-[var(--text-on-gold)] shadow-xs'
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)]'
                }`}
              >
                <span>{cat.label}</span>
                <span className="text-[10px] opacity-75 font-mono">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pairs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[360px] overflow-y-auto pr-1">
        {filteredPairs.length === 0 ? (
          <div className="col-span-full py-8 text-center text-xs text-[var(--text-muted)]">
            لم يتم العثور على أزواج تطابق بحثك.
          </div>
        ) : (
          filteredPairs.map((pair) => {
            const isSelected = pair.id === selectedPairId;
            const isFav = favoritePairs.includes(pair.id);
            const isLiveStreaming = liveWsSymbol === pair.symbol && liveWsPrice !== null && liveWsPrice !== undefined;
            const currentPrice = isLiveStreaming ? (liveWsPrice as number) : pair.basePrice;

            return (
              <div
                key={pair.id}
                onClick={() => onSelectPair(pair.id)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between text-xs relative group ${
                  isSelected
                    ? 'bg-gradient-to-r from-amber-500/15 to-[var(--gold-soft)] border-[var(--gold-primary)] shadow-sm'
                    : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] hover:border-[var(--border-default)]'
                }`}
              >
                {/* Left: Flag & Symbol */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xl shrink-0">{pair.flag}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono font-black text-xs text-[var(--text-primary)]">
                        {pair.symbol}
                      </span>
                      {pair.isOTC ? (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          OTC
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          Twelve Data
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] truncate block mt-0.5">
                      {pair.displayName}
                    </span>
                  </div>
                </div>

                {/* Right: Price & Favorite */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-left font-mono" dir="ltr">
                    <span className={`font-bold block ${isLiveStreaming ? 'text-cyan-300' : 'text-[var(--text-primary)]'}`}>
                      {currentPrice.toFixed(pair.pipDecimals)}
                    </span>
                    <span className="text-[9px] text-[var(--text-muted)] block">
                      {pair.volatilityLevel === 'ultra'
                        ? 'تذبذب فائق'
                        : pair.volatilityLevel === 'high'
                        ? 'تذبذب عالٍ'
                        : 'تذبذب معتدل'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(pair.id);
                    }}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      isFav ? 'text-amber-400' : 'text-[var(--text-muted)] hover:text-white'
                    }`}
                    title={isFav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
                  >
                    <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
