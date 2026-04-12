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
 * @param {Object} customRates - Optional custom exchange rates { ilsRate, gbpRate }
 * @returns {Array} - Parsed asset data
 */
export function parsePortfolioData(rows, customRates = {}) {
  console.log('🔍 Parsing portfolio data from rows:', rows.length);
  console.log('🔍 Raw rows data:', rows);
  
  const dataRowsRaw = rows || [];
  if (dataRowsRaw.length < 1) {
    throw new Error('Spreadsheet data is empty');
  }

  // 1. Find the header row (search first 10 rows for keywords)
  let headerRowIndex = -1;
  let headers = [];
  
  for (let i = 0; i < Math.min(dataRowsRaw.length, 10); i++) {
    const row = dataRowsRaw[i];
    const rowStr = row.join(' ').toLowerCase();
    // A header row should contain at least two of these key terms
    const hasAsset = rowStr.includes('asset') || rowStr.includes('symbol');
    const hasDate = rowStr.includes('date');
    const hasShares = rowStr.includes('shares');
    const hasPrice = rowStr.includes('price');
    const hasPortfolio = rowStr.includes('portfolio') || rowStr.includes('account');
    
    const score = (hasAsset ? 1 : 0) + (hasDate ? 1 : 0) + (hasShares ? 1 : 0) + (hasPrice ? 1 : 0) + (hasPortfolio ? 1 : 0);
    
    if (score >= 2) {
      headerRowIndex = i;
      headers = row;
      console.log(`✅ Detected header row at index ${i} with score ${score}:`, headers);
      break;
    }
  }

  if (headerRowIndex === -1) {
    console.warn('⚠️ Could not detect header row with keywords, falling back to row 0');
    headerRowIndex = 0;
    headers = dataRowsRaw[0];
  }

  const dataRows = dataRowsRaw.slice(headerRowIndex + 1);
  
  console.log('📋 Headers processed:', headers.map((h, i) => `${i}: "${h}"`));

  // Find column indices
  const portfolioIndex = headers.findIndex(h => {
    const val = h.toLowerCase();
    return val.includes('portfolio') || val.includes('account') || val.includes('pension') || val.includes('gemel');
  });
  const symbolIndex = headers.findIndex(h => h.toLowerCase().includes('asset') || h.toLowerCase().includes('symbol'));
  const dateIndex = headers.findIndex(h => h.toLowerCase().includes('purchase date') || h.toLowerCase().includes('date'));
  const sharesIndex = headers.findIndex(h => h.toLowerCase().includes('# of shares') || h.toLowerCase().includes('shares') || h.toLowerCase().includes('qty'));
  const priceIndex = headers.findIndex(h => h.toLowerCase().includes('purchase price raw') || h.toLowerCase().includes('price'));
  const currencyIndex = headers.findIndex(h => h.toLowerCase().includes('currency'));
  const currentValueIndex = headers.findIndex(h => h.toLowerCase().includes('current value'));
  const purchaseValueIndex = headers.findIndex(h => h.toLowerCase().includes('purchase value'));

  console.log('🔍 Column indices found:');
  console.log('  Portfolio:', portfolioIndex !== -1 ? `${portfolioIndex} ("${headers[portfolioIndex]}")` : 'NOT FOUND');
  console.log('  Symbol (Asset):', symbolIndex !== -1 ? `${symbolIndex} ("${headers[symbolIndex]}")` : 'NOT FOUND');
  console.log('  Date:', dateIndex !== -1 ? `${dateIndex} ("${headers[dateIndex]}")` : 'NOT FOUND');
  console.log('  Shares:', sharesIndex !== -1 ? `${sharesIndex} ("${headers[sharesIndex]}")` : 'NOT FOUND');
  console.log('  Price:', priceIndex !== -1 ? `${priceIndex} ("${headers[priceIndex]}")` : 'NOT FOUND');

  if (symbolIndex === -1 || dateIndex === -1 || sharesIndex === -1 || priceIndex === -1) {
    console.error('❌ Missing columns in headers:', headers);
    throw new Error('Required columns (Asset, Date, Shares, Price) not found. Check your spreadsheet headers.');
  }

  // Currency conversion rates (simplified - no CAD)
  const exchangeRates = {
    'USD': 1.0,
    'ILS': customRates.ilsRate ? 1 / customRates.ilsRate : 0.2933,
    'GBP': customRates.gbpRate ? customRates.gbpRate : 1.27,
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
      
      const portfolio = portfolioIndex !== -1 ? (row[portfolioIndex]?.trim() || 'Default') : 'Default';
      
      const purchase = {
        date,
        shares,
        portfolio,
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
 * @param {Object} customRates - Optional custom exchange rates { ilsRate, gbpRate }
 * @returns {Promise<Array>} - Parsed asset data
 */
export async function fetchPortfolioData(spreadsheetId, range = 'Universal!H:M', customRates = {}) {
  console.log('🔍 Fetching real Google Sheets data...');
  
  const rows = await readSpreadsheet(spreadsheetId, range);
  return parsePortfolioData(rows, customRates);
} 