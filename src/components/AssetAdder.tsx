import React, { useState } from 'react';
import { fetchPriceHistory, calculateCAGR, calculateVolatility } from '../utils/calcMetrics';

const TIMEFRAMES = {
  '1Y': 365,
  '3Y': 365 * 3,
  '5Y': 365 * 5,
  '10Y': 365 * 10,
  'MAX': 9999
};

export default function AssetAdder({ onAdd }: { onAdd: (data: any) => void }) {
  const [symbol, setSymbol] = useState('');
  const [timeframe, setTimeframe] = useState('5Y');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    setLoading(true);
    const days = TIMEFRAMES[timeframe];
    try {
      const prices = await fetchPriceHistory(symbol, days);
      const cagr = calculateCAGR(prices);
      const volatility = calculateVolatility(prices);
      onAdd({ symbol, timeframe, cagr, volatility });
    } catch (e) {
      alert('Error fetching data for ' + symbol);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-4 items-end">
      <div>
        <label className="block text-sm">Symbol</label>
        <input value={symbol} onChange={e => setSymbol(e.target.value)} className="border p-1 rounded" />
      </div>
      <div>
        <label className="block text-sm">Timeframe</label>
        <select value={timeframe} onChange={e => setTimeframe(e.target.value)} className="border p-1 rounded">
          {Object.keys(TIMEFRAMES).map(tf => <option key={tf} value={tf}>{tf}</option>)}
        </select>
      </div>
      <button onClick={handleAdd} className="bg-blue-500 text-white px-3 py-1 rounded" disabled={loading}>
        {loading ? 'Loading...' : 'Add'}
      </button>
    </div>
  );
}
