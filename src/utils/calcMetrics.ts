const BACKEND_BASE = 'https://yfinance-backend.onrender.com';

export async function fetchPriceHistory(
  symbol: string,
  period: '1y' | '5y' | '10y'
): Promise<number[]> {
  const res = await fetch(
    `${BACKEND_BASE}/api/price-history?symbol=${symbol}&period=${period}&interval=1d`
  );
  const data = await res.json();

  if (!data.prices) throw new Error('No data returned');
  return data.prices.map((p: number[]) => p[0] || p);
}

export function calculateCAGR(prices: number[], years: number): number {
  if (prices.length < 2) return 0;
  const start = prices[0];
  const end = prices[prices.length - 1];
  return Math.pow(end / start, 1 / years) - 1;
}

export async function calculateSaferCAGR(symbol: string): Promise<{
  cagr1Y: number;
  cagr5Y: number;
  cagr10Y: number;
  saferCAGR: number;
}> {
  const [prices1Y, prices5Y, prices10Y] = await Promise.all([
    fetchPriceHistory(symbol, '1y'),
    fetchPriceHistory(symbol, '5y'),
    fetchPriceHistory(symbol, '10y'),
  ]);

  const cagr1Y = calculateCAGR(prices1Y, 1);
  const cagr5Y = calculateCAGR(prices5Y, 5);
  const cagr10Y = calculateCAGR(prices10Y, 10);

  // Blended safer CAGR logic (30% 5Y, 70% 10Y)
  let rawSaferCAGR = 0.3 * cagr5Y + 0.7 * cagr10Y;

  // Apply floor and cap
  const saferCAGR = Math.min(Math.max(rawSaferCAGR, 0.1), 0.2);

  return { cagr1Y, cagr5Y, cagr10Y, saferCAGR };
}

export function calculateVolatility(prices: number[]): number {
  if (prices.length < 2) return 0;
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push(Math.log(prices[i] / prices[i - 1]));
  }
  const avg = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((a, b) => a + Math.pow(b - avg, 2), 0) /
    (returns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(252);
}
