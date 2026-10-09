import React from 'react';
import { Zap, SlidersHorizontal, Flame, ListFilter, Calculator } from 'lucide-react';

export type NavTabType = 'live' | 'generator' | 'collection' | 'table' | 'calculator';

interface MagicNavigationBarProps {
  activeTab: NavTabType;
  onChangeTab: (tab: NavTabType) => void;
}

export const MagicNavigationBar: React.FC<MagicNavigationBarProps> = ({
  activeTab,
  onChangeTab,
}) => {
  return (
    <nav
      dir="rtl"
      className="fixed bottom-0 left-0 right-0 z-40 flex justify-center items-center pointer-events-none pb-2 sm:pb-3.5 px-2"
    >
      <div className="navigation pointer-events-auto select-none">
        {/* Tab 1: Live (الحية) */}
        <button
          type="button"
          onClick={() => onChangeTab('live')}
          className={`nav-item ${activeTab === 'live' ? 'active' : ''}`}
          aria-label="الحية"
        >
          <Zap className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="nav-label">الحية</span>
        </button>

        {/* Tab 2: Generator (المولّد) */}
        <button
          type="button"
          onClick={() => onChangeTab('generator')}
          className={`nav-item ${activeTab === 'generator' ? 'active' : ''}`}
          aria-label="المولّد"
        >
          <SlidersHorizontal className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="nav-label">المولّد</span>
        </button>

        {/* Center Floating Button (.profile): Strategy (استراتيجيات Hasone Trading) */}
        <button
          type="button"
          onClick={() => onChangeTab('collection')}
          className={`profile ${activeTab === 'collection' ? 'active' : ''}`}
          aria-label="استراتيجيات Hasone Trading"
        >
          <Flame className="w-7 h-7 sm:w-8 sm:h-8 fill-current stroke-[2.5]" />
          <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-tight mt-0.5">Hasone</span>
        </button>

        {/* Tab 4: Table (الجدول) */}
        <button
          type="button"
          onClick={() => onChangeTab('table')}
          className={`nav-item ${activeTab === 'table' ? 'active' : ''}`}
          aria-label="الجدول"
        >
          <ListFilter className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="nav-label">الجدول</span>
        </button>

        {/* Tab 5: Calculator (الحاسبة) */}
        <button
          type="button"
          onClick={() => onChangeTab('calculator')}
          className={`nav-item ${activeTab === 'calculator' ? 'active' : ''}`}
          aria-label="الحاسبة"
        >
          <Calculator className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="nav-label">الحاسبة</span>
        </button>
      </div>
    </nav>
  );
};
