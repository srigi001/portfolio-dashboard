import React, { useState, useEffect, useCallback } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import Tooltip from './ui/Tooltip';

export default function AllocationsSection({
  allocations,
  setAllocations,
  fetchAssetData,
}) {
  const [symbolInput, setSymbolInput] = useState('');
  const [error, setError] = useState('');
  const [localAllocations, setLocalAllocations] = useState(allocations);

  // Update local state when props change
  useEffect(() => {
    setLocalAllocations(allocations);
  }, [allocations]);

  // Debounced update to parent
  const debouncedUpdate = useCallback(
    (newAllocations) => {
      const timer = setTimeout(() => {
        if (JSON.stringify(newAllocations) !== JSON.stringify(allocations)) {
          setAllocations(newAllocations);
        }
      }, 1000);
      return () => clearTimeout(timer);
    },
    [allocations, setAllocations]
  );

  // Update parent when local allocations change
  useEffect(() => {
    return debouncedUpdate(localAllocations);
  }, [localAllocations, debouncedUpdate]);

  // Add a new asset to the allocations list
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
      const updated = [...localAllocations, newAsset];
      setLocalAllocations(updated);
      setSymbolInput('');
      setError('');
    } catch (e) {
      setError(`Failed to fetch data for ${symbolInput}`);
    }
  };

  // Remove an asset by its ID
  const handleRemoveAsset = (id) => {
    const updated = localAllocations.filter((a) => a.id !== id);
    setLocalAllocations(updated);
  };

  // Change allocation % in-line
  const handleAllocationChange = (id, value) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;
    
    setLocalAllocations(
      localAllocations.map((a) =>
        a.id === id
          ? { ...a, allocation: numValue >= 0 ? numValue : 0 }
          : a
      )
    );
  };

  // Rebalance everything to sum to 100%
  const handleRebalance = () => {
    const total = localAllocations.reduce((sum, a) => sum + a.allocation, 0);
    if (total === 0) return;
    const updated = localAllocations.map((a) => ({
      ...a,
      allocation: parseFloat(((a.allocation / total) * 100).toFixed(2)),
    }));
    setLocalAllocations(updated);
  };

  // Helpers to display the chosen CAGR & Volatility
  const getDisplayCagr = (a) => {
    switch (a.cagrType) {
      case '10Y':
        return a.cagr10Y;
      case 'Blended':
        return a.cagrBlended;
      case '5Y':
      default:
        return a.cagr5Y;
    }
  };
  const getDisplayVol = (a) => {
    switch (a.cagrType) {
      case '10Y':
        return a.volatility10Y;
      case 'Blended':
        return a.volatilityBlended;
      case '5Y':
      default:
        return a.volatility5Y;
    }
  };

  // Switch between 5Y / 10Y / Blended without re-running simulation
  const handleTypeChange = (id, type) => {
    setLocalAllocations(
      localAllocations.map((a) =>
        a.id === id ? { ...a, cagrType: type } : a
      )
    );
  };

  return (
    <Card className="mb-4">
      <h2 className="text-lg font-semibold mb-2">Allocations</h2>

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

      <table className="w-full text-sm text-gray-700 border rounded overflow-hidden">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">Symbol</th>
            <th className="p-2 text-left">Description</th>
            <th className="p-2 text-right">
              CAGR % <Tooltip content="Select 5Y, 10Y, or Blended">ℹ️</Tooltip>
            </th>
            <th className="p-2 text-center">Type</th>
            <th className="p-2 text-right">
              Vol % <Tooltip content="Annualized vol over selected window">ℹ️</Tooltip>
            </th>
            <th className="p-2 text-right">Allocation %</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {localAllocations.map((a, i) => (
            <tr key={a.id} className={i % 2 ? 'bg-white' : 'bg-gray-50'}>
              <td className="p-2 font-bold">{a.symbol}</td>
              <td className="p-2">{a.description || '-'}</td>
              <td className="p-2 text-right">
                {(getDisplayCagr(a) * 100).toFixed(2)}
              </td>
              <td className="p-2 text-center">
                <select
                  value={a.cagrType}
                  onChange={(e) => handleTypeChange(a.id, e.target.value)}
                  className="border rounded p-1"
                >
                  <option value="5Y">5Y</option>
                  <option value="10Y">10Y</option>
                  <option value="Blended">Blended</option>
                </select>
              </td>
              <td className="p-2 text-right">
                {(getDisplayVol(a) * 100).toFixed(2)}
              </td>
              <td className="p-2 text-right">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="border border-gray-300 rounded p-1 w-20 text-right focus:outline-none focus:ring focus:border-blue-400 bg-white text-gray-900"
                  value={a.allocation}
                  onChange={(e) => handleAllocationChange(a.id, e.target.value)}
                />
              </td>
              <td className="p-2">
                <Button
                  onClick={() => handleRemoveAsset(a.id)}
                  variant="danger"
                >
                  Remove
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {localAllocations.length > 0 && (
        <Button onClick={handleRebalance} variant="green" className="mt-4">
          Rebalance to 100%
        </Button>
      )}
    </Card>
  );
}