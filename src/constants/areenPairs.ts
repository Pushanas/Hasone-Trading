// OTC Pairs for Hasone Trading (Strictly without USDTRY-OTC as requested)
export const AREEN_OTC_PAIRS = [
  'USDDZD-OTC',
  'USDPKR-OTC',
  'USDINR-OTC',
  'USDARS-OTC',
  'USDJPY-OTC',
  'USDCAD-OTC',
  'USDEGP-OTC',
  'USDCHF-OTC',
  'USDMXN-OTC',
  'USDPHP-OTC',
  'USDBDT-OTC',
  'NZDCHF-OTC',
  'BRLUSD-OTC',
  'USDNGN-OTC',
] as const;

export type AreenOtcPair = typeof AREEN_OTC_PAIRS[number];
