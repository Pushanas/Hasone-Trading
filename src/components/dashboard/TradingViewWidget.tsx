// src/components/dashboard/TradingViewWidget.tsx
// Official TradingView Advanced Real-Time Interactive Chart Widget Integration

import React, { useEffect, useRef } from 'react';

interface TradingViewWidgetProps {
  symbol?: string;
  theme?: 'dark' | 'light';
  height?: string | number;
}

export const TradingViewWidget: React.FC<TradingViewWidgetProps> = ({
  symbol = 'FX:EURUSD',
  theme = 'dark',
  height = 520,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize symbol for TradingView
  const formatTvSymbol = (s: string) => {
    const clean = s.toUpperCase().replace('_', '').replace('OTC', '').replace('/', '');
    if (clean.includes('EURUSD')) return 'FX:EURUSD';
    if (clean.includes('GBPUSD')) return 'FX:GBPUSD';
    if (clean.includes('USDJPY')) return 'FX:USDJPY';
    if (clean.includes('AUDCAD')) return 'FX:AUDCAD';
    return `FX:${clean}`;
  };

  const tvSymbol = formatTvSymbol(symbol);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container__widget';
    widgetContainer.style.height = '100%';
    widgetContainer.style.width = '100%';
    containerRef.current.appendChild(widgetContainer);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval: '1',
      timezone: 'Etc/UTC',
      theme: theme,
      style: '1', // Candlesticks
      locale: 'ar',
      enable_publishing: false,
      hide_side_toolbar: false,
      allow_symbol_change: false,
      details: false,
      hotlist: false,
      calendar: false,
      studies: [], // Strictly candlesticks and price action
      support_host: 'https://www.tradingview.com',
    });

    containerRef.current.appendChild(script);
  }, [tvSymbol, theme]);

  return (
    <div 
      className="tradingview-widget-container rounded-2xl overflow-hidden border border-slate-800/80 shadow-2xl bg-[#0e121b]" 
      ref={containerRef} 
      style={{ height: typeof height === 'number' ? `${height}px` : height, width: '100%' }}
    />
  );
};

export default TradingViewWidget;
