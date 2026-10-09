// Royal Typewriter Mathematical Monospace & Telegram VIP Formatter for Al-Areen Al-Dahabi

/**
 * Standardizes any pair string (e.g. "USDDZD-OTC", "USD/DZD OTC", "USDDZDOTC", "USD_DZD")
 * into the canonical "CUR1/CUR2 OTC" format.
 */
export function standardizePairName(raw: string): string {
  if (!raw) return 'EUR/USD OTC';
  const clean = raw.trim();

  // If already contains slash
  if (clean.includes('/')) {
    const [c1, rest] = clean.split('/');
    const p1 = (c1 || '').trim().toUpperCase();
    const p2 = (rest || '').replace(/[\s\-_]*OTC/gi, '').trim().toUpperCase();
    return `${p1}/${p2} OTC`;
  }

  // Remove OTC and punctuation
  const withoutOtc = clean
    .replace(/[\s\-_]*OTC/gi, '')
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase();

  if (withoutOtc.length === 6) {
    return `${withoutOtc.slice(0, 3)}/${withoutOtc.slice(3, 6)} OTC`;
  }

  // Fallback
  return clean.toUpperCase().includes('OTC') ? clean.toUpperCase() : `${clean.toUpperCase()} OTC`;
}

/**
 * Formats a date into strict 24-hour HH:mm string.
 */
export function format24hTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Converts ASCII alphanumeric characters to Mathematical Monospace Unicode glyphs.
 * Example: "15:30 USD/DZD OTC - BUY" -> "𝟷𝟻:𝟹𝟶 𝚄𝚂𝙳/𝙳𝚉𝙳 𝙾𝚃𝙲 - 𝙱𝚄𝚈"
 */
export function toTypewriterMono(str: string): string {
  return str
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0);
      // Digits 0-9: 0x30 to 0x39 -> U+1D7F6 to U+1D7FF (𝟶-𝟿)
      if (code >= 0x30 && code <= 0x39) {
        return String.fromCodePoint(0x1d7f6 + (code - 0x30));
      }
      // Uppercase A-Z: 0x41 to 0x5A -> U+1D670 to U+1D689 (𝙰-𝚉)
      if (code >= 0x41 && code <= 0x5A) {
        return String.fromCodePoint(0x1d670 + (code - 0x41));
      }
      // Lowercase a-z: 0x61 to 0x7A -> U+1D68A to U+1D6A3 (𝚊-𝚣)
      if (code >= 0x61 && code <= 0x7A) {
        return String.fromCodePoint(0x1d68a + (code - 0x61));
      }
      return char;
    })
    .join('');
}

/**
 * Returns formatted local UTC string in typewriter monospace, e.g. "🔹 𝚄𝚃𝙲 ( +𝟶𝟹:𝟶𝟶 ) 🔻"
 */
export function formatUtcHeaderMono(offsetStr?: string): string {
  let offset = offsetStr;
  if (!offset) {
    const offsetMin = -new Date().getTimezoneOffset();
    const sign = offsetMin >= 0 ? '+' : '-';
    const hours = Math.floor(Math.abs(offsetMin) / 60);
    const mins = Math.abs(offsetMin) % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    offset = `${sign}${pad(hours)}:${pad(mins)}`;
  }
  return `🔹 ${toTypewriterMono(`UTC ( ${offset} )`)} 🔻`;
}

export interface FormattableSignal {
  timeStr: string;
  pair: string;
  direction: 'CALL' | 'PUT' | 'BUY' | 'SELL' | string;
  strategyNote?: string;
  strategyBadge?: string;
}

/**
 * Formats a single signal line into the typewriter format:
 * "❒ 𝟷𝟻:𝟹𝟶 𝚄𝚂𝙳/𝙳𝚉𝙳 𝙾𝚃𝙲 - 𝙱𝚄𝚈"
 */
export function formatSingleSignalMono(sig: FormattableSignal): string {
  const canonicalPair = standardizePairName(sig.pair);
  const dirText = sig.direction === 'CALL' || sig.direction === 'BUY' ? 'BUY' : 'PUT';
  const rawLine = `${sig.timeStr} ${canonicalPair} - ${dirText}`;
  return `❒ ${toTypewriterMono(rawLine)}`;
}

/**
 * Formats full list of signals into the Royal Hasone Trading Telegram Monospace card
 */
export function formatAreenDecoratedTelegram(
  signals: FormattableSignal[],
  options?: {
    timeframe?: string;
    martingale?: string;
    utcOffset?: string;
    strategyName?: string;
  }
): string {
  if (signals.length === 0) return 'لا توجد صفقات حالياً';

  const timeframe = options?.timeframe || 'M1';
  const martingale = options?.martingale || 'NON MTG';
  const strategyName = options?.strategyName || 'استراتيجية حسون Breakout';
  const utcLine = formatUtcHeaderMono(options?.utcOffset || '+03:00');
  const tfText = timeframe === 'M5' ? '5 دقائق (M5)' : 'دقيقة واحدة (M1)';

  const header = `👑 صفقات حسون - Trading VIP 👑
${utcLine}
━━━━━━━━━━━━━━━━━━━━`;

  const rows = signals.map((s) => {
    const mono = formatSingleSignalMono(s);
    const tag = s.strategyBadge || s.strategyNote ? ` [${s.strategyBadge || s.strategyNote}]` : '';
    return `${mono}${tag}`;
  }).join('\n');

  const footer = `━━━━━━━━━━━━━━━━━━━━
⏱️ مدة الشمعة: ${tfText}
🛡️ نظام المضاعفة: ${martingale}
📊 الاستراتيجية: ${strategyName}
🏢 بوت حسون - Trading VIP`;

  return `${header}\n${rows}\n${footer}`;
}
