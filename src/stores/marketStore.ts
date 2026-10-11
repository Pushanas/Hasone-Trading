// src/stores/marketStore.ts
// Global State Management for Hasone Trading using Zustand

import { create } from 'zustand';
import { MarketPair, FullAnalysisReport, MarketScannerItem, SignalHistoryRecord } from '../../shared/types';

interface MarketStoreState {
  activePair: string;
  selectedTimeframe: string;
  liveRates: Record<string, number>;
  scannerItems: MarketScannerItem[];
  currentReport: FullAnalysisReport | null;
  history: SignalHistoryRecord[];
  isAnalyzing: boolean;
  isSocketConnected: boolean;

  // Actions
  setActivePair: (pair: string) => void;
  setSelectedTimeframe: (tf: string) => void;
  setLiveRates: (rates: Record<string, number>) => void;
  updateSingleRate: (pair: string, rate: number) => void;
  setScannerItems: (items: MarketScannerItem[]) => void;
  setCurrentReport: (report: FullAnalysisReport | null) => void;
  setIsAnalyzing: (analyzing: boolean) => void;
  setIsSocketConnected: (connected: boolean) => void;
  setHistory: (history: SignalHistoryRecord[]) => void;
}

export const useMarketStore = create<MarketStoreState>((set) => ({
  activePair: 'EUR/USD OTC',
  selectedTimeframe: '1min',
  liveRates: {
    'EUR/USD OTC': 1.12053,
    'USD/BRL OTC': 5.0109,
    'USD/MXN OTC': 18.3049,
    'USD/INR OTC': 96.83,
    'USD/ARS OTC': 1515.88,
    'EUR/USD': 1.12014,
  },
  scannerItems: [],
  currentReport: null,
  history: [],
  isAnalyzing: false,
  isSocketConnected: true,

  setActivePair: (pair) => set({ activePair: pair }),
  setSelectedTimeframe: (tf) => set({ selectedTimeframe: tf }),
  setLiveRates: (rates) => set((state) => ({ liveRates: { ...state.liveRates, ...rates } })),
  updateSingleRate: (pair, rate) => set((state) => ({ liveRates: { ...state.liveRates, [pair]: rate } })),
  setScannerItems: (items) => set({ scannerItems: items }),
  setCurrentReport: (report) => set({ currentReport: report }),
  setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
  setIsSocketConnected: (isSocketConnected) => set({ isSocketConnected }),
  setHistory: (history) => set({ history }),
}));

export default useMarketStore;
