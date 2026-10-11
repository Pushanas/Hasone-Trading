// backend/src/services/analysis/candlePatternEngine.ts
// Candlestick Pattern Recognition Engine for Binary Options & Forex

import { Candle, CandlePattern } from '../../../../shared/types';

export class CandlePatternEngine {
  public static detectPatterns(candles: Candle[]): CandlePattern[] {
    if (candles.length < 3) return [];

    const patterns: CandlePattern[] = [];
    const current = candles[candles.length - 1];
    const prev = candles[candles.length - 2];
    const prev2 = candles[candles.length - 3];

    const currentBody = Math.abs(current.close - current.open);
    const currentRange = current.high - current.low;
    const isCurrentBullish = current.close > current.open;
    const isCurrentBearish = current.close < current.open;

    const prevBody = Math.abs(prev.close - prev.open);
    const isPrevBullish = prev.close > prev.open;
    const isPrevBearish = prev.close < prev.open;

    // 1. Doji Pattern
    if (currentRange > 0 && currentBody / currentRange <= 0.1) {
      patterns.push({
        name: 'Doji',
        arabicName: 'شمعة دوجي (حيرة وانعكاس محتمل)',
        type: 'NEUTRAL',
        reliability: 'MEDIUM',
        description: 'تساوي سعر الفتح والإغلاق يدل على توازن القوى وترقب حركة قوية.',
      });
    }

    // 2. Bullish Hammer
    const lowerWick = Math.min(current.open, current.close) - current.low;
    const upperWick = current.high - Math.max(current.open, current.close);
    if (currentBody > 0 && lowerWick >= currentBody * 2 && upperWick <= currentBody * 0.5) {
      patterns.push({
        name: 'Hammer',
        arabicName: 'المطرقة الشرائية (Bullish Hammer)',
        type: 'BULLISH',
        reliability: 'HIGH',
        description: 'ذيل سفلي طويل يعكس رفض السعر للهبوط بقوة ودخول المشترين.',
      });
    }

    // 3. Shooting Star / Inverted Hammer (Bearish Pin Bar)
    if (currentBody > 0 && upperWick >= currentBody * 2 && lowerWick <= currentBody * 0.5) {
      patterns.push({
        name: 'Shooting Star',
        arabicName: 'شمعة الشهاب الساقط (Shooting Star)',
        type: 'BEARISH',
        reliability: 'HIGH',
        description: 'ذيل علوي طويل يظهر رفض المشترين ودخول البائعين لدفع السعر للأسفل.',
      });
    }

    // 4. Bullish Engulfing
    if (isPrevBearish && isCurrentBullish && current.open <= prev.close && current.close >= prev.open && currentBody > prevBody) {
      patterns.push({
        name: 'Bullish Engulfing',
        arabicName: 'نموذج الابتلاع الشرائي (Bullish Engulfing)',
        type: 'BULLISH',
        reliability: 'HIGH',
        description: 'شمعة صاعدة تبتلع بالكامل الشمعة الهابطة السابقة عند قاع محلي.',
      });
    }

    // 5. Bearish Engulfing
    if (isPrevBullish && isCurrentBearish && current.open >= prev.close && current.close <= prev.open && currentBody > prevBody) {
      patterns.push({
        name: 'Bearish Engulfing',
        arabicName: 'نموذج الابتلاع البيعي (Bearish Engulfing)',
        type: 'BEARISH',
        reliability: 'HIGH',
        description: 'شمعة هابطة تبتلع بالكامل الشمعة الصاعدة السابقة عند قمة محلية.',
      });
    }

    // 6. Morning Star
    if (isPrevBearish && prevBody / (prev.high - prev.low || 1) < 0.3 && isCurrentBullish && current.close > (prev2.open + prev2.close) / 2) {
      patterns.push({
        name: 'Morning Star',
        arabicName: 'نجمة الصباح الصاعدة (Morning Star)',
        type: 'BULLISH',
        reliability: 'HIGH',
        description: 'نموذج ثلاثي شموع يعكس انتهاء المسار الهابط وبدء موجة صعود.',
      });
    }

    // 7. Evening Star
    if (isPrevBullish && prevBody / (prev.high - prev.low || 1) < 0.3 && isCurrentBearish && current.close < (prev2.open + prev2.close) / 2) {
      patterns.push({
        name: 'Evening Star',
        arabicName: 'نجمة المساء الهابطة (Evening Star)',
        type: 'BEARISH',
        reliability: 'HIGH',
        description: 'نموذج ثلاثي شموع ينبئ بانكسار القمة وبدء تصحيح هابط حاد.',
      });
    }

    return patterns;
  }
}

export default CandlePatternEngine;
