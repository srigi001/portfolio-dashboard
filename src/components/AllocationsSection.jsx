import { useState } from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

export default function AllocationsSection({
  allocations,
  setAllocations,
  fetchAssetData,
}) {
  const [symbolInput, setSymbolInput] = useState('');
  const [error, setError] = useState('');

  const handleAddAsset = async () => {
    if (!symbolInput.trim()) return;
    try {
      const data = await fetchAssetData(symbolInput.trim());
      const newAsset = {
        id: Date.now().toString(),
        symbol: symbolInput.toUpperCase(),
        description: data.description,
        cagr: data.cagr,
        volatility: data.volatility,
        allocation: 0,
      };
      setAllocations([...allocations, newAsset]);
      setSymbolInput('');
      setError('');
    } catch (e) {
      setError(`Failed to fetch data for ${symbolInput}`);
    }
  };

  const handleAllocationChange = (id, value) => {
    setAllocations(
      allocations.map((a) =>
        a.id === id
          ? { ...a, allocation: parseFloat(value) >= 0 ? parseFloat(value) : 0 }
          : a
      )
    );
  };

  const handleRebalance = () => {
    const total = allocations.reduce((sum, a) => sum + a.allocation, 0);
    if (total === 0) return;
    setAllocations(
      allocations.map((a) => ({
        ...a,
        allocation: parseFloat(((a.allocation / total) * 100).toFixed(2)),
      }))
    );
  };

  const handleRemove = (id) => {
    setAllocations(allocations.filter((a) => a.id !== id));
  };

  return (
    <Card>
      <h2 className="text-2xl font-bold mb-4">Allocations</h2>
      <div className="flex mb-4 gap-2">
        <input
          type="text"
          placeholder="Enter Symbol (e.g., AAPL)"
          value={symbolInput}
          onChange={(e) => setSymbolInput(e.target.value)}
          className="border border-gray-300 rounded p-2 flex-grow focus:outline-none focus:ring focus:border-blue-400 bg-white text-gray-900"
        />
        <Button onClick={handleAddAsset}>Add</Button>
      </div>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      <table className="w-full text-sm text-gray-700 border border-gray-200 rounded overflow-hidden">
        <thead className="bg-gray-100 text-gray-800">
          <tr>
            <th className="p-3 text-left">Symbol</th>
            <th className="p-3 text-left w-1/3">Description</th>
            <th className="p-3 text-right">CAGR %</th>
            <th className="p-3 text-right">Volatility %</th>
            <th className="p-3 text-right">Allocation %</th>
            <th className="p-3 text-center"></th>
          </tr>
        </thead>
        <tbody>
          {allocations.map((a, index) => (
            <tr
              key={a.id}
              className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
            >
              <td className="p-3 font-bold">{a.symbol}</td>
              <td className="p-3">{a.description || '-'}</td>
              <td className="p-3 text-right">{(a.cagr * 100).toFixed(2)}</td>
              <td className="p-3 text-right">
                {(a.volatility * 100).toFixed(2)}
              </td>
              <td className="p-3 text-right">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="border border-gray-300 rounded p-1 w-20 text-right focus:outline-none focus:ring focus:border-blue-400 bg-white text-gray-900"
                  value={a.allocation}
                  onChange={(e) => handleAllocationChange(a.id, e.target.value)}
                />
              </td>
              <td className="p-3 text-center">
                <Button onClick={() => handleRemove(a.id)} variant="danger">
                  Remove
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {allocations.length > 0 && (
        <Button onClick={handleRebalance} variant="green" className="mt-6">
          Rebalance to 100%
        </Button>
      )}
    </Card>
  );
}