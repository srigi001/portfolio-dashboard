// Google Sheets API utilities
// Now calling the real backend API

const BACKEND_BASE = 'https://investment-dashboard-backend-gm79.onrender.com'; // Your actual Render backend URL

/**
 * Read spreadsheet data from the backend API
 */
export async function readSpreadsheet(spreadsheetId, range = 'Universal!H:M') {
  console.log(`🔍 API: Reading spreadsheet ${spreadsheetId} with range ${range} [CACHE-BUSTED]`);
  
  try {
    const response = await fetch(`${BACKEND_BASE}/api/google-sheets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        spreadsheetId,
        range
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`📊 API: Received ${data.rows?.length || 0} rows from Google Sheets`);
    return data.rows || [];
  } catch (error) {
    console.error('❌ Failed to fetch Google Sheets data:', error);
    throw error;
  }
}

/**
 * Parse portfolio data from spreadsheet rows
 * @param {Array} rows - Raw spreadsheet data
 * @returns {Array} - Parsed asset data
 */
export function parsePortfolioData(rows) {
  console.log('🔍 Parsing portfolio data from rows:', rows.length);
  console.log('🔍 Raw rows data:', rows);
  
  if (!rows || rows.length < 2) {
    throw new Error('Spreadsheet must have at least a header row and one data row');
  }

  const headers = rows[0];
  const dataRows = rows.slice(1);
  
  console.log('📋 Headers found:', headers);
  console.log('📋 Header indices:', headers.map((h, i) => `${i}: "${h}"`));
  console.log('📊 Data rows count:', dataRows.length);

  // Find column indices - based on H:M range: Portfolio, Asset, Purchase Date, # of Shares, Currency, Purchase Price Raw
  const symbolIndex = headers.findIndex(h => h.toLowerCase().includes('asset'));
  const dateIndex = headers.findIndex(h => h.toLowerCase().includes('purchase date'));
  const sharesIndex = headers.findIndex(h => h.toLowerCase().includes('# of shares'));
  const priceIndex = headers.findIndex(h => h.toLowerCase().includes('purchase price raw'));
  const currencyIndex = headers.findIndex(h => h.toLowerCase().includes('currency'));
  const currentValueIndex = headers.findIndex(h => h.toLowerCase().includes('current value'));
  const purchaseValueIndex = headers.findIndex(h => h.toLowerCase().includes('purchase value'));

  console.log('🔍 Column indices found:');
  console.log('  Symbol:', symbolIndex, `"${headers[symbolIndex]}"`);
  console.log('  Date:', dateIndex, `"${headers[dateIndex]}"`);
  console.log('  Shares:', sharesIndex, `"${headers[sharesIndex]}"`);
  console.log('  Price:', priceIndex, `"${headers[priceIndex]}"`);
  console.log('  Currency:', currencyIndex, `"${headers[currencyIndex]}"`);
  
  // Debug: Show all headers with their indices
  console.log('🔍 All columns available:');
  headers.forEach((header, index) => {
    console.log(`  ${index}: "${header}"`);
  });

  if (symbolIndex === -1 || dateIndex === -1 || sharesIndex === -1 || priceIndex === -1) {
    console.log('🔍 Available headers:', headers);
    throw new Error('Required columns not found. Expected: Asset/Symbol, Date, Shares/Quantity, Price');
  }

  // Currency conversion rates (simplified - no CAD)
  const exchangeRates = {
    'USD': 1.0,
    'ILS': 0.2933,  // ILS to USD rate (1/3.4093)
  };

  // Group by symbol
  const assetsBySymbol = {};

  console.log('🔍 Processing data rows...');
  dataRows.forEach((row, rowIndex) => {
    console.log(`📊 Row ${rowIndex + 1}:`, row);
    
    const symbol = row[symbolIndex]?.trim();
    if (!symbol) {
      console.log(`⚠️ Row ${rowIndex + 1}: No symbol found, skipping`);
      return;
    }

    // Skip rows where symbol is purely numeric (these are likely prices, not symbols)
    if (/^\d+\.?\d*$/.test(symbol)) {
      console.log(`⚠️ Row ${rowIndex + 1}: Symbol "${symbol}" is purely numeric, likely a price value - skipping`);
      return;
    }

    if (!assetsBySymbol[symbol]) {
      assetsBySymbol[symbol] = {
        symbol,
        purchases: [],
        totalShares: 0,
        currency: 'USD' // Default currency (will be updated from first purchase)
      };
      console.log(`🆕 Created new asset entry for ${symbol}`);
    }

    const shares = parseFloat(row[sharesIndex]) || 0;
    const price = parseFloat(row[priceIndex]) || 0;
    const date = row[dateIndex] || '';
    const currency = row[currencyIndex]?.trim() || 'USD'; // Default to USD if no currency specified

    console.log(`📊 Row ${rowIndex + 1} (${symbol}):`, {
      date,
      shares,
      price,
      currency,
      rawRow: row
    });

    if (shares > 0 && price > 0) {
      // Convert price to USD (only USD and ILS supported)
      const usdRate = exchangeRates[currency] || 1.0;
      if (!exchangeRates[currency]) {
        console.warn(`⚠️ Unknown currency "${currency}" for ${symbol}, using USD rate (1.0)`);
      }
      const priceUSD = price * usdRate;
      
      console.log(`💰 ${symbol}: ${price} ${currency} → $${priceUSD.toFixed(2)} USD (rate: ${usdRate})`);
      
      const purchase = {
        date,
        shares,
        priceUSD: priceUSD, // Price in USD
        priceOriginal: price, // Original price in original currency
        currency: currency,
        totalUSD: shares * priceUSD // Total in USD
      };

      assetsBySymbol[symbol].purchases.push(purchase);
      assetsBySymbol[symbol].currency = currency; // Store the original currency
    }
  });

  // Calculate total shares for each asset
  console.log('🔍 Calculating final totals...');
  Object.values(assetsBySymbol).forEach(asset => {
    asset.totalShares = asset.purchases.reduce((sum, p) => sum + p.shares, 0);
    asset.totalInvested = asset.purchases.reduce((sum, p) => sum + p.totalUSD, 0);
    
    console.log(`📊 Final totals for ${asset.symbol}:`, {
      totalShares: asset.totalShares,
      totalInvested: asset.totalInvested,
      purchasesCount: asset.purchases.length,
      currency: asset.currency
    });
  });

  const finalAssets = Object.values(assetsBySymbol);
  console.log('✅ Parsed assets:', finalAssets);
  return finalAssets;
}

/**
 * Fetch and parse portfolio data from Google Sheets
 * @param {string} spreadsheetId - The spreadsheet ID
 * @param {string} range - The range to read
 * @returns {Promise<Array>} - Parsed asset data
 */
export async function fetchPortfolioData(spreadsheetId, range = 'Universal!H:M') {
  console.log('🔍 Fetching real Google Sheets data...');
  
  const rows = await readSpreadsheet(spreadsheetId, range);
  return parsePortfolioData(rows);
} 