import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { parseYahooFinanceCSV, convertToPortfolioFormat } from '../utils/csvParser';
import { fetchAssetData } from '../utils/calcMetrics';

export default function CSVImportSection({ onImportComplete }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsLoading(true);
    setError('');

    try {
      const text = await file.text();
      const assets = parseYahooFinanceCSV(text);
      
      // Fetch real CAGR/volatility data for each asset
      const assetsWithData = await Promise.all(
        assets.map(async (asset) => {
          try {
            const assetData = await fetchAssetData(asset.symbol);
            return {
              ...asset,
              cagr5Y: assetData.cagr5Y,
              cagr10Y: assetData.cagr10Y,
              cagrBlended: assetData.cagrBlended,
              volatility5Y: assetData.volatility5Y,
              volatility10Y: assetData.volatility10Y,
              volatilityBlended: assetData.volatilityBlended,
            };
          } catch (e) {
            console.warn(`Failed to fetch data for ${asset.symbol}:`, e);
            return asset;
          }
        })
      );

      const portfolioData = convertToPortfolioFormat(assetsWithData);
      setPreview(portfolioData);
    } catch (e) {
      setError('Failed to parse CSV file. Please check the format.');
      console.error('CSV parsing error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = () => {
    if (preview) {
      onImportComplete(preview);
    }
  };

  return (
    <Card className="mb-4">
      <h2 className="text-lg font-semibold mb-4">Import Portfolio from Yahoo Finance</h2>
      
      <div className="mb-4">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        <p className="text-sm text-gray-600 mt-2">
          Upload a CSV file exported from Yahoo Finance with your portfolio data.
        </p>
      </div>

      {isLoading && (
        <div className="text-blue-600 mb-4">
          Loading and fetching asset data...
        </div>
      )}

      {error && (
        <div className="text-red-600 mb-4">
          {error}
        </div>
      )}

      {preview && (
        <div className="mb-4">
          <h3 className="font-semibold mb-2">Preview:</h3>
          <div className="bg-gray-50 p-4 rounded">
            <p><strong>Total Portfolio Value:</strong> ${preview.totalValue.toLocaleString()}</p>
            <p><strong>Total Invested:</strong> ${preview.totalInvested.toLocaleString()}</p>
            <p><strong>Assets Found:</strong> {preview.assets.length}</p>
            
            <div className="mt-3">
              <h4 className="font-medium mb-2">Assets:</h4>
              {preview.assets.map((asset, index) => (
                <div key={index} className="text-sm mb-1">
                  <strong>{asset.symbol}</strong>: {asset.currentShares.toLocaleString()} shares @ ${asset.averageCostBasis.toFixed(2)} avg
                  <span className={`ml-2 ${asset.gainLossPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ({asset.gainLossPercent >= 0 ? '+' : ''}{asset.gainLossPercent.toFixed(2)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          <Button onClick={handleImport} className="mt-4">
            Import Portfolio
          </Button>
        </div>
      )}
    </Card>
  );
} 