/**
 * Parse Yahoo Finance CSV data into structured asset data
 * Expected CSV format from Yahoo Finance:
 * Symbol,Current Price,Date,Time,Change,Open,High,Low,Volume,Trade Date,Purchase Price,Quantity
 */

export function parseYahooFinanceCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',');
  
  // Skip header row and parse data
  const rows = lines.slice(1).map(line => {
    const values = line.split(',');
    const row = {};
    headers.forEach((header, index) => {
      row[header.trim()] = values[index]?.trim();
    });
    return row;
  });

  // Group by symbol
  const assetsBySymbol = {};
  
  rows.forEach(row => {
    const symbol = row.Symbol;
    if (!assetsBySymbol[symbol]) {
      assetsBySymbol[symbol] = {
        symbol,
        purchases: [],
        currentPrice: parseFloat(row['Current Price']),
        currentShares: 0,
        totalInvested: 0,
        averageCostBasis: 0
      };
    }

    const purchase = {
      date: row['Trade Date'],
      shares: parseFloat(row.Quantity),
      price: parseFloat(row['Purchase Price']),
      total: parseFloat(row.Quantity) * parseFloat(row['Purchase Price'])
    };

    assetsBySymbol[symbol].purchases.push(purchase);
  });

  // Calculate summary metrics for each asset
  Object.values(assetsBySymbol).forEach(asset => {
    asset.currentShares = asset.purchases.reduce((sum, p) => sum + p.shares, 0);
    asset.totalInvested = asset.purchases.reduce((sum, p) => sum + p.total, 0);
    asset.averageCostBasis = asset.totalInvested / asset.currentShares;
    asset.currentValue = asset.currentShares * asset.currentPrice;
    asset.unrealizedGainLoss = asset.currentValue - asset.totalInvested;
    asset.gainLossPercent = (asset.unrealizedGainLoss / asset.totalInvested) * 100;
  });

  return Object.values(assetsBySymbol);
}

/**
 * Convert parsed asset data to the format expected by the existing system
 * This creates a bridge between your real data and the existing Monte Carlo API
 */
export function convertToPortfolioFormat(assets) {
  // Calculate total portfolio value (use totalInvested as fallback if currentValue is NaN)
  const totalValue = assets.reduce((sum, asset) => {
    const value = isNaN(asset.currentValue) ? asset.totalInvested : asset.currentValue;
    return sum + value;
  }, 0);
  
  // Convert to allocation format (for compatibility with existing API)
  const allocations = assets.map(asset => {
    const value = isNaN(asset.currentValue) ? asset.totalInvested : asset.currentValue;
    const allocation = totalValue > 0 ? (value / totalValue) * 100 : 0;
    
    return {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      symbol: asset.symbol,
      allocation: allocation,
      description: asset.symbol,
      // Use the real CAGR/volatility data that was fetched for each asset
      cagr5Y: asset.cagr5Y || 0.12,
      cagr10Y: asset.cagr10Y || 0.12,
      cagrBlended: asset.cagrBlended || 0.12,
      volatility5Y: asset.volatility5Y || 0.18,
      volatility10Y: asset.volatility10Y || 0.18,
      volatilityBlended: asset.volatilityBlended || 0.18,
      cagrType: '5Y'
    };
  });

  return {
    allocations,
    assets, // Keep the original asset data for individual asset pages
    totalValue,
    totalInvested: assets.reduce((sum, asset) => sum + asset.totalInvested, 0)
  };
} 