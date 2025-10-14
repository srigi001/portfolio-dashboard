import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { fetchPortfolioData } from '../utils/googleSheets';
import { fetchAssetData } from '../utils/calcMetrics';

export default function GoogleSheetsImport({ onImportComplete }) {
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);

  const handleImport = async () => {
    if (!spreadsheetId.trim()) {
      setError('Please enter a spreadsheet ID');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      console.log('🔍 Step 1: Fetching data from Google Sheets...');
      // Fetch data from Google Sheets
      const assets = await fetchPortfolioData(spreadsheetId);
      console.log('✅ Step 1 complete. Assets found:', assets.length);
      
      console.log('🔍 Step 2: Fetching asset data for each symbol...');
      // Fetch real CAGR/volatility data for each asset with timeout
      const assetsWithData = await Promise.all(
        assets.map(async (asset, index) => {
          console.log(`  Processing asset ${index + 1}/${assets.length}: ${asset.symbol}`);
          try {
            // Add timeout to prevent hanging
            const assetDataPromise = fetchAssetData(asset.symbol);
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 10000)
            );
            
            const assetData = await Promise.race([assetDataPromise, timeoutPromise]);
            console.log(`  ✅ ${asset.symbol}: Got asset data`);
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
            console.warn(`  ⚠️ Failed to fetch data for ${asset.symbol}:`, e);
            // Return asset with default values if API fails
            return {
              ...asset,
              cagr5Y: 0.08, // Default 8% CAGR
              cagr10Y: 0.08,
              cagrBlended: 0.08,
              volatility5Y: 0.15, // Default 15% volatility
              volatility10Y: 0.15,
              volatilityBlended: 0.15,
            };
          }
        })
      );
      console.log('✅ Step 2 complete. Assets with data:', assetsWithData.length);

      console.log('🔍 Step 3: Converting to portfolio format...');
      // Convert to portfolio format (reusing the existing function)
      const { convertToPortfolioFormat } = await import('../utils/csvParser');
      const portfolioData = convertToPortfolioFormat(assetsWithData);
      console.log('✅ Step 3 complete. Portfolio data:', portfolioData);
      
      setPreview(portfolioData);
    } catch (e) {
      console.error('❌ Google Sheets import error:', e);
      setError(`Failed to import from Google Sheets: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePortfolio = () => {
    console.log('🎯 handleCreatePortfolio called with preview:', preview);
    if (preview) {
      console.log('📤 Calling onImportComplete with preview data');
      onImportComplete(preview);
    } else {
      console.error('❌ No preview data available');
    }
  };

  return (
    <Card className="mb-4">
      <h2 className="text-lg font-semibold mb-4">Import from Google Sheets</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Spreadsheet ID
        </label>
        <input
          type="text"
          value={spreadsheetId}
          onChange={(e) => setSpreadsheetId(e.target.value)}
          placeholder="1ABC123... (from your Google Sheets URL)"
          className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring focus:border-blue-400"
        />
        <p className="text-sm text-gray-600 mt-1">
          Find this in your Google Sheets URL: https://docs.google.com/spreadsheets/d/<strong>SPREADSHEET_ID</strong>/edit
        </p>
      </div>

      <Button onClick={handleImport} disabled={isLoading || !spreadsheetId.trim()}>
        {isLoading ? 'Loading...' : 'Import from Google Sheets'}
      </Button>

      {isLoading && (
        <div className="text-blue-600 mt-4">
          Fetching data from Google Sheets and loading asset information...
        </div>
      )}

      {error && (
        <div className="text-red-600 mt-4">
          {error}
        </div>
      )}

      {preview && (
        <div className="mt-4">
          <h3 className="font-semibold mb-2">Preview:</h3>
          <div className="bg-gray-50 p-4 rounded">
            <p><strong>Total Portfolio Value:</strong> ${(preview.totalValue || 0).toLocaleString()}</p>
            <p><strong>Total Invested:</strong> ${(preview.totalInvested || 0).toLocaleString()}</p>
            <p><strong>Assets Found:</strong> {preview.assets.length}</p>
            
            <div className="mt-3">
              <h4 className="font-medium mb-2">Assets:</h4>
              {preview.assets.map((asset, index) => (
                <div key={index} className="text-sm mb-1">
                  <strong>{asset.symbol}</strong>: {(asset.currentShares || 0).toLocaleString()} shares @ ${(asset.averageCostBasis || 0).toFixed(2)} avg
                  <span className={`ml-2 ${(asset.gainLossPercent || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ({(asset.gainLossPercent || 0) >= 0 ? '+' : ''}{(asset.gainLossPercent || 0).toFixed(2)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          <Button onClick={handleCreatePortfolio} className="mt-4">
            Create Portfolio
          </Button>
        </div>
      )}
    </Card>
  );
} 