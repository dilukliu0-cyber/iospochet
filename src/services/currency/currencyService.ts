// Курсы валют для §14.1. Бесплатный API без ключа (open.er-api.com, обновление
// раз в сутки — этого достаточно, документ и просит кэшируемый дневной курс).
const rateCache = new Map<string, number>();

export async function getExchangeRate(from: string, to: string): Promise<number | null> {
  if (!from || !to || from === to) return 1;

  const cacheKey = `${from}->${to}`;
  const cached = rateCache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(`https://open.er-api.com/v6/latest/${encodeURIComponent(from)}`);
    if (!response.ok) return null;
    const data = await response.json();
    const rate = data?.rates?.[to];
    if (typeof rate !== 'number' || !Number.isFinite(rate)) return null;
    rateCache.set(cacheKey, rate);
    return rate;
  } catch {
    return null;
  }
}
