// src/hooks/useAnalysis.ts
// React Hook for Triggering and Managing Market Analysis

import { useState, useCallback } from 'react';
import { useMarketStore } from '../stores/marketStore';
import { FullAnalysisReport } from '../../shared/types';

export function useAnalysis() {
  const { activePair, selectedTimeframe, setCurrentReport, setIsAnalyzing, isAnalyzing } = useMarketStore();
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = useCallback(async (pairOverride?: string, timeframeOverride?: string) => {
    const pair = pairOverride || activePair;
    const interval = timeframeOverride || selectedTimeframe;

    setIsAnalyzing(true);
    setError(null);

    try {
      const res = await fetch(`/api/v2/analyze?pair=${encodeURIComponent(pair)}&interval=${encodeURIComponent(interval)}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete market analysis');
      }

      setCurrentReport(data.report);
      return data.report as FullAnalysisReport;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [activePair, selectedTimeframe, setCurrentReport, setIsAnalyzing]);

  return {
    runAnalysis,
    isAnalyzing,
    error,
  };
}

export default useAnalysis;
