// backend/config/gemini.ts
// Gemini AI Configuration for Hasone Trading Market Intelligence

export interface GeminiConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxOutputTokens: number;
  topP: number;
  systemInstruction: string;
}

export const geminiConfig: GeminiConfig = {
  apiKey: process.env.GEMINI_API_KEY || '',
  // Use modern production model
  model: 'gemini-2.5-flash',
  temperature: 0.2, // Low temperature for consistent financial analysis
  maxOutputTokens: 1024,
  topP: 0.8,
  systemInstruction: `أنت كبير محللي الأسواق المالية والمشتقات الزمنية في منصة Hasone Trading.
مهمتك هي إجراء تحليل فني وموضوعي لبيانات الشموع والمؤشرات (RSI, MACD, Bollinger Bands, EMA) لتحديد ما إذا كانت الصفقة القادمة (CALL أو PUT أو HOLD)، مع ذكر نسبة الثقة والمبررات الفنية ومستويات الدعم والمقاومة بدقة احترافية.`,
};

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
}
