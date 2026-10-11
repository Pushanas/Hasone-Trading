// src/components/dashboard/ChartWidget.tsx
// Interactive Recharts Financial Candlestick & RSI Trend Visualization

import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, Line } from 'recharts';
import { Candle, TechnicalIndicators } from '../../../shared/types';
import { TrendingUp, BarChart2 } from 'lucide-react';

interface ChartWidgetProps {
  pairName: string;
  candles: Candle[];
  indicators?: TechnicalIndicators;
  timeframe?: string;
}

export const ChartWidget: React.FC<ChartWidgetProps> = ({
  pairName,
  candles,
  indicators,
  timeframe = '1min',
}) => {
  if (!candles || candles.length === 0) {
    return (
      <div className="bg-[#0e121b]/90 border border-slate-800 rounded-2xl p-6 text-center text-slate-400 h-64 flex items-center justify-center">
        <span>لا توجد بيانات شموع متاحة حالياً</span>
      </div>
    );
  }

  // Format data for Recharts AreaChart
  const data = candles.map((c, index) => ({
    time: c.datetime.split(' ')[1] || `${index}:00`,
    close: c.close,
    open: c.open,
    high: c.high,
    low: c.low,
    isGreen: c.close >= c.open,
  }));

  const minPrice = Math.min(...candles.map((c) => c.low));
  const maxPrice = Math.max(...candles.map((c) => c.high));
  const padding = (maxPrice - minPrice) * 0.1 || 0.0001;
  const currentPrice = candles[candles.length - 1].close;

  return (
    <div className="bg-[#0e121b]/95 border border-slate-800/80 rounded-2xl p-4 shadow-xl backdrop-blur-md">
      {/* Chart Header */}
      <div className="flex items-center justify-between border-b border-slate-800/60 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              {pairName}
              <span className="text-[10px] text-slate-400 font-normal">فاصل {timeframe}</span>
            </h4>
            <div className="text-xs font-mono font-bold text-amber-300">
              {currentPrice.toFixed(pairName.includes('JPY') || pairName.includes('ARS') ? 3 : 5)}
            </div>
          </div>
        </div>

        {indicators && (
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-slate-400">
              RSI: <strong className="text-emerald-400">{indicators.rsi}</strong>
            </span>
            <span className="text-slate-400">
              EMA9: <strong className="text-blue-400">{indicators.ema.ema9.toFixed(4)}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Primary Price Trend Area */}
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              stroke="#475569"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[minPrice - padding, maxPrice + padding]}
              stroke="#475569"
              fontSize={10}
              orientation="right"
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => v.toFixed(pairName.includes('JPY') ? 2 : 4)}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="bg-slate-900/95 border border-slate-700 p-2.5 rounded-lg text-xs shadow-xl font-mono">
                      <div className="text-slate-400 mb-1">{d.time}</div>
                      <div className="text-emerald-400">إغلاق: {d.close}</div>
                      <div className="text-slate-300">افتتاح: {d.open}</div>
                      <div className="text-blue-300">أعلى: {d.high} | أدنى: {d.low}</div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <ReferenceLine y={currentPrice} stroke="#f59e0b" strokeDasharray="3 3" />
            <Area
              type="monotone"
              dataKey="close"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#priceGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ChartWidget;
