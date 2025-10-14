// src/utils/calcMetrics.ts

const BACKEND_BASE = 'https://yfinance-backend.onrender.com';

/**
 * Fetch the full 10 Y daily price history once.
 */
export async function fetch10YPriceHistory(symbol: string): Promise<number[]> {
  const timestamp = Date.now() + Math.random(); // More aggressive cache busting
  const requestId = Math.random().toString(36).substring(7); // Unique request ID
  
  // Retry logic for failed requests
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(
        `${BACKEND_BASE}/api/price-history?symbol=${symbol}&period=10y&interval=1d&_t=${timestamp}&_id=${requestId}&_attempt=${attempt}`,
        {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }
      );
      
      const data = await res.json();
      console.log(`🔍 DEBUG: Raw API response for ${symbol} (attempt ${attempt}):`, data);
      
      if (!res.ok) {
        console.warn(`⚠️ API Error for ${symbol} (attempt ${attempt}): ${res.status} ${res.statusText}`);
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
          continue;
        }
        throw new Error(`API failed for ${symbol} after ${attempt} attempts`);
      }
      
      if (!data.prices) {
        console.warn(`⚠️ No data for ${symbol} (attempt ${attempt})`);
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        throw new Error('No data returned for ' + symbol);
      }
      
      // flatten each point to a single number
      const flattened = data.prices.map((p: number[] | number) =>
        Array.isArray(p) ? p[0] : p
      );
      console.log(`🔍 DEBUG: Flattened prices for ${symbol}:`, {
        length: flattened.length,
        first: flattened[0],
        last: flattened[flattened.length - 1],
        sample: flattened.slice(0, 5)
      });
      
      return flattened;
    } catch (error) {
      console.warn(`⚠️ Request failed for ${symbol} (attempt ${attempt}):`, error);
      if (attempt < 3) {
        console.warn(`⚠️ Retrying ${symbol} (attempt ${attempt + 1})...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      } else {
        console.error(`❌ Failed to fetch ${symbol} after 3 attempts:`, error);
        throw error;
      }
    }
  }
  
  throw new Error(`Failed to fetch data for ${symbol}`);
}

/**
 * Fetch data for multiple symbols in a single API call
 */
export async function fetchMultipleAssetsData(symbols: string[]) {
  console.log(`🔍 API: Fetching data for multiple symbols: ${symbols.join(', ')}`);
  
  const res = await fetch(
    `${BACKEND_BASE}/api/price-history?symbol=${symbols.join(',')}&period=10y&interval=1d`
  );
  const data = await res.json();
  console.log(`🔍 DEBUG: Multi-symbol API response:`, data);
  
  // The API should return data for each symbol
  return data;
}

/**
 * CAGR over N years.
 */
export function calculateCAGR(prices: number[], years: number): number {
  if (prices.length < 2) return 0;
  const start = prices[0],
    end = prices[prices.length - 1];
  return Math.pow(end / start, 1 / years) - 1;
}

/**
 * Annualized volatility from daily prices (sqrt(252) convention).
 */
export function calculateVolatility(prices: number[]): number {
  if (prices.length < 2) return 0;
  const logRets: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    logRets.push(Math.log(prices[i] / prices[i - 1]));
  }
  const mean = logRets.reduce((sum, r) => sum + r, 0) / logRets.length;
  const variance =
    logRets.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) /
    (logRets.length - 1);
  return Math.sqrt(variance) * Math.sqrt(252);
}

/**
 * Returns all six metrics by slicing the 10 Y series:
 *  - 10 Y full history
 *  - last ~5 Y (half of the array)
 *  - last ~1 Y (last 252 trading days)
 */
export async function fetchAssetData(symbol: string) {
  console.log(`🔍 API: Fetching data for ${symbol} from ${BACKEND_BASE}/api/price-history?symbol=${symbol}&period=10y&interval=1d`);
  
  // Add a longer delay to prevent rate limiting
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // 1) fetch the full 10 Y series
  const prices10Y = await fetch10YPriceHistory(symbol);
  console.log(`📊 API: ${symbol} - Got ${prices10Y.length} price points`);
  console.log(`📊 API: ${symbol} - First price: ${prices10Y[0]}, Last price: ${prices10Y[prices10Y.length - 1]}`);

  // 2) derive the 5 Y & 1 Y subsets
  const idxMid = Math.floor(prices10Y.length / 2);
  const idx1Y = prices10Y.length - 252; // ~252 trading days in a year
  const prices5Y = prices10Y.slice(idxMid);
  const prices1Y = prices10Y.slice(idx1Y < 0 ? 0 : idx1Y);

  // 3) calculate metrics
  const cagr10Y = calculateCAGR(prices10Y, 10);
  const cagr5Y = calculateCAGR(prices5Y, 5);
  const cagr1Y = calculateCAGR(prices1Y, 1);
  const volatility10Y = calculateVolatility(prices10Y);
  const volatility5Y = calculateVolatility(prices5Y);
  const volatility1Y = calculateVolatility(prices1Y);

  // 4) blend if you still want a "safer" blended option
  const cagrBlended = 0.3 * cagr5Y + 0.7 * cagr10Y;
  const volatilityBlended = 0.3 * volatility5Y + 0.7 * volatility10Y;

  const result = {
    description: symbol.toUpperCase(),
    // three CAGR windows
    cagr1Y,
    cagr5Y,
    cagr10Y,
    cagrBlended,
    // three volatility windows
    volatility1Y,
    volatility5Y,
    volatility10Y,
    volatilityBlended,
    // current price (last price from 10Y data)
    currentPrice: prices10Y[prices10Y.length - 1],
  };
  
  console.log(`📊 API: ${symbol} - Final metrics:`, result);
  return result;
}
