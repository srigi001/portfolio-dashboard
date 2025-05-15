const BACKEND_BASE = 'https://yfinance-backend.onrender.com'; // use your actual Render URL

export async function fetchPriceHistory(
  symbol: string,
  days: number
): Promise<number[]> {
  const period =
    days >= 365 * 10
      ? '10y'
      : days >= 365 * 5
      ? '5y'
      : days >= 365 * 3
      ? '3y'
      : days >= 365
      ? '1y'
      : 'max';

  const res = await fetch(
    `${BACKEND_BASE}/api/price-history?symbol=${symbol}&period=${period}&interval=1d`
  );
  const data = await res.json();

  if (!data.prices) throw new Error('No data returned');
  return data.prices.map((p: number[]) => p[0] || p); // flatten single-item arrays, just in case
}

export function calculateCAGR(prices: number[]): number {
  if (prices.length < 2) return 0;
  const start = prices[0];
  const end = prices[prices.length - 1];
  const years = prices.length / 252;
  return Math.pow(end / start, 1 / years) - 1;
}

export function calculateVolatility(prices: number[]): number {
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
