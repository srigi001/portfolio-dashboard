import React, { useState, useEffect } from 'react';

import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';
import { fetchPortfolioData } from '../utils/googleSheets';
import { fetchAssetData, fetch10YPriceHistoryWithDates } from '../utils/calcMetrics';
import { supabase } from '../utils/supabaseClient';

// Helper function to get current date normalized to first of month (YYYY-MM-01)
const getCurrentMonthStart = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
};

// Inline component for one-time deposit input per asset
function OneTimeDepositInput({ asset, oneTimeDeposit, onSet, onRemove, formatCurrency }) {
  // Initialize state from prop, converting number to string for input field
  const [amount, setAmount] = useState(() => {
    if (oneTimeDeposit?.amount) {
      return typeof oneTimeDeposit.amount === 'number' ? oneTimeDeposit.amount.toString() : oneTimeDeposit.amount;
    }
    return '';
  });
  const [date, setDate] = useState(oneTimeDeposit?.date || '');

  // Update local state when prop changes (e.g., when deposit is cleared or updated)
  useEffect(() => {
    if (!oneTimeDeposit) {
      setAmount('');
      setDate('');
    } else {
      // Convert number to string for input field
      const amountStr = typeof oneTimeDeposit.amount === 'number' 
        ? oneTimeDeposit.amount.toString() 
        : (oneTimeDeposit.amount || '');
      setAmount(amountStr);
      setDate(oneTimeDeposit.date || '');
    }
  }, [oneTimeDeposit]);

  const handleSet = () => {
    if (!amount || !date || parseFloat(amount) <= 0) {
      console.warn('One-time deposit validation failed:', { amount, date });
      return;
    }
    onSet({
      date: date,
      amount: parseFloat(amount)
    });
  };

  const handleRemove = () => {
    onRemove();
    setAmount('');
    setDate('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSet();
    }
  };

  return (
    <div className="p-4 border-b border-gray-200">
      <h4 className="text-sm font-medium text-gray-700 mb-3">One-Time Deposit (Optional)</h4>
      
      {/* Add/Edit One-Time Deposit Form */}
      <div className="mb-4 flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">Amount ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Enter deposit amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">Deposit Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {oneTimeDeposit ? (
          <>
            <button
              onClick={handleSet}
              className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!amount || !date || parseFloat(amount) <= 0}
              title={!amount || !date || parseFloat(amount) <= 0 ? `Cannot update: amount=${amount}, date=${date}` : 'Update deposit'}
            >
              Update
            </button>
            <button
              onClick={handleRemove}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              title="Remove this deposit"
            >
              Remove
            </button>
          </>
        ) : (
          <button
            onClick={handleSet}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!amount || !date || parseFloat(amount) <= 0}
          >
            Add
          </button>
        )}
      </div>

      {/* Display existing one-time deposit */}
      {oneTimeDeposit && (
        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded">
          <div className="text-xs text-green-700">
            <div className="font-medium">Current One-Time Deposit:</div>
            <div className="mt-1">
              {formatCurrency ? formatCurrency(oneTimeDeposit.amount) : `$${oneTimeDeposit.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} on {oneTimeDeposit.date}
            </div>
            <div className="mt-1 text-gray-600 italic">
              (Will be applied on the 1st of the deposit month)
            </div>
          </div>
        </div>
      )}
      
      {!oneTimeDeposit && (
        <p className="text-xs text-gray-500 italic">No one-time deposit configured. Add one above to include an additional lump sum deposit in the simulation. Note: Deposit dates are normalized to the 1st of the selected month.</p>
      )}
    </div>
  );
}

// Inline component for monthly deposit input per asset
function MonthlyDepositInput({ asset, monthlyDeposits, onAdd, onRemove, formatCurrency }) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');

  const handleAdd = () => {
    if (!amount || !date || parseFloat(amount) <= 0) return;
    onAdd({
      id: Date.now().toString(),
      date: date,
      amount: parseFloat(amount)
    });
    setAmount('');
    setDate('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  };

  return (
    <div className="p-4 border-b border-gray-200">
      <h4 className="text-sm font-medium text-gray-700 mb-3">Monthly Deposits (Optional)</h4>
      
      {/* Add Monthly Deposit Form */}
      <div className="mb-4 flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">Amount ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Enter monthly amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">Start Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!amount || !date || parseFloat(amount) <= 0}
        >
          Add
        </button>
      </div>

      {/* Existing Monthly Deposits List */}
      {monthlyDeposits && monthlyDeposits.length > 0 && (
        <div className="mt-4">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Monthly Amount ($)</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {monthlyDeposits.map((deposit) => (
                  <tr key={deposit.id}>
                    <td className="px-3 py-2 text-sm text-gray-900">{deposit.date}</td>
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {formatCurrency(deposit.amount)}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      <button
                        onClick={() => onRemove(deposit.id)}
                        className="text-red-600 hover:text-red-800 text-xs font-medium"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {(!monthlyDeposits || monthlyDeposits.length === 0) && (
        <p className="text-xs text-gray-500 italic">No monthly deposits configured. Add one above to include recurring deposits in the simulation.</p>
      )}
    </div>
  );
}

export default function RealPortfolioPage({ portfolio, updatePortfolio, user }) {
  // Helper function to generate user-specific localStorage keys
  const getUserKey = (key) => {
    const userId = user?.id || 'anonymous';
    return `realPortfolio_${userId}_${key}`;
  };

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  const [realPortfolioData, setRealPortfolioData] = useState(() => {
    // Load cached data from user-specific localStorage
    const cached = localStorage.getItem(getUserKey('realPortfolioData'));
    return cached ? JSON.parse(cached) : null;
  });
  const [assetSimulations, setAssetSimulations] = useState(() => {
    // Load cached simulations from user-specific localStorage
    const cached = localStorage.getItem(getUserKey('assetSimulations'));
    return cached ? JSON.parse(cached) : {};
  });
  const [simulatingAssets, setSimulatingAssets] = useState(new Set());
  const [reSimulatingAssets, setReSimulatingAssets] = useState(new Set()); // Track assets being re-simulated after CAGR type change
  const [cagrTypes, setCagrTypes] = useState(() => {
    // Load cached CAGR types from user-specific localStorage
    const cached = localStorage.getItem(getUserKey('cagrTypes'));
    return cached ? JSON.parse(cached) : {};
  });
  const [monthlyDeposits, setMonthlyDeposits] = useState(() => {
    // Load cached monthly deposits from user-specific localStorage
    // Structure: { [symbol]: [{ id, date, amount }, ...] }
    const cached = localStorage.getItem(getUserKey('monthlyDeposits'));
    const parsed = cached ? JSON.parse(cached) : {};
    console.log('📥 Loading monthly deposits from localStorage:', parsed);
    // Filter out undefined/null values and ensure array format
    const cleaned = {};
    Object.keys(parsed).forEach(symbol => {
      if (parsed[symbol] && Array.isArray(parsed[symbol]) && parsed[symbol].length > 0) {
        cleaned[symbol] = parsed[symbol];
      }
    });
    console.log('📥 Cleaned monthly deposits:', cleaned);
    return cleaned;
  });
  const [oneTimeDeposits, setOneTimeDeposits] = useState(() => {
    // Load cached one-time deposits from user-specific localStorage
    // Structure: { [symbol]: { date, amount } } - single deposit per asset
    const cached = localStorage.getItem(getUserKey('oneTimeDeposits'));
    const parsed = cached ? JSON.parse(cached) : {};
    console.log('📥 Loading one-time deposits from localStorage:', parsed);
    // Filter out undefined/null values
    const cleaned = {};
    Object.keys(parsed).forEach(symbol => {
      if (parsed[symbol] && parsed[symbol].date && parsed[symbol].amount) {
        cleaned[symbol] = parsed[symbol];
      }
    });
    console.log('📥 Cleaned one-time deposits:', cleaned);
    return cleaned;
  });
  const [selectedAssets, setSelectedAssets] = useState(() => {
    // Load cached selected assets from user-specific localStorage
    const cached = localStorage.getItem(getUserKey('selectedAssets'));
    return cached ? JSON.parse(cached) : {};
  });
  const [combinedSimulation, setCombinedSimulation] = useState(null);
  const [isRunningCombinedSimulation, setIsRunningCombinedSimulation] = useState(false);
  const [allAssetSimulations, setAllAssetSimulations] = useState(() => {
    // Load cached all asset simulations from user-specific localStorage
    const cached = localStorage.getItem(getUserKey('allAssetSimulations'));
    return cached ? JSON.parse(cached) : {};
  });
  const [isSimulatingAll, setIsSimulatingAll] = useState(false);
  const [priceHistory, setPriceHistory] = useState(() => {
    // Load cached price history from user-specific localStorage
    const cached = localStorage.getItem(getUserKey('priceHistory'));
    return cached ? JSON.parse(cached) : {};
  });
  const [currency, setCurrency] = useState(() => {
    // Load cached currency preference
    const cached = localStorage.getItem(getUserKey('currency'));
    return cached || 'USD';
  });
  const [exchangeRate, setExchangeRate] = useState(() => {
    // Load cached exchange rate
    const cached = localStorage.getItem(getUserKey('exchangeRate'));
    return cached ? parseFloat(cached) : 0;
  });
  const [currencyError, setCurrencyError] = useState('');

  // Google Sheets configuration - User-specific persistence
  const [googleSheetsId, setGoogleSheetsId] = useState(() => {
    // Load from user-specific localStorage (persists across sessions)
    return localStorage.getItem(getUserKey('googleSheetsId')) || '';
  });
  const GOOGLE_SHEETS_RANGE = 'Universal!H:M';

  // Load deposits from Supabase (defined early for use in useEffect)
  const loadDepositsFromSupabase = async () => {
    if (!user || !user.id || user.id === 'mock-user' || user.id === 'anonymous') {
      return { monthlyDeposits: {}, oneTimeDeposits: {} };
    }

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser?.user_metadata) {
        const monthlyDeposits = currentUser.user_metadata.monthlyDeposits || {};
        const oneTimeDeposits = currentUser.user_metadata.oneTimeDeposits || {};
        console.log('📥 Loaded deposits from Supabase:', { monthlyDeposits, oneTimeDeposits });
        return { monthlyDeposits, oneTimeDeposits };
      }
    } catch (err) {
      console.error('❌ Exception loading deposits from Supabase:', err);
    }

    return { monthlyDeposits: {}, oneTimeDeposits: {} };
  };

  // Reload all user-specific data when user changes
  useEffect(() => {
    if (!user) return;

    const loadUserData = async () => {
      // Try to load deposits from Supabase first (for cross-domain sync), then fall back to localStorage
      const supabaseDeposits = await loadDepositsFromSupabase();
      
      // Reload all cached data for the current user
      const cachedData = localStorage.getItem(getUserKey('realPortfolioData'));
      const cachedSimulations = localStorage.getItem(getUserKey('assetSimulations'));
      const cachedCagrTypes = localStorage.getItem(getUserKey('cagrTypes'));
      const cachedSelectedAssets = localStorage.getItem(getUserKey('selectedAssets'));
      const cachedAllSimulations = localStorage.getItem(getUserKey('allAssetSimulations'));
      const cachedMonthlyDeposits = localStorage.getItem(getUserKey('monthlyDeposits'));
      const cachedOneTimeDeposits = localStorage.getItem(getUserKey('oneTimeDeposits'));
      const cachedSheetsId = localStorage.getItem(getUserKey('googleSheetsId'));

      if (cachedData) setRealPortfolioData(JSON.parse(cachedData));
      if (cachedSimulations) setAssetSimulations(JSON.parse(cachedSimulations));
      if (cachedCagrTypes) setCagrTypes(JSON.parse(cachedCagrTypes));
      if (cachedAllSimulations) setAllAssetSimulations(JSON.parse(cachedAllSimulations));
      
      // Load deposits: prefer Supabase, then localStorage, then merge
      let finalMonthlyDeposits = {};
      let finalOneTimeDeposits = {};
      
      // Start with Supabase data if available
      if (Object.keys(supabaseDeposits.monthlyDeposits).length > 0) {
        finalMonthlyDeposits = supabaseDeposits.monthlyDeposits;
        console.log('✅ Using monthly deposits from Supabase:', finalMonthlyDeposits);
      } else if (cachedMonthlyDeposits) {
        const parsed = JSON.parse(cachedMonthlyDeposits);
        Object.keys(parsed).forEach(symbol => {
          if (parsed[symbol] && Array.isArray(parsed[symbol]) && parsed[symbol].length > 0) {
            finalMonthlyDeposits[symbol] = parsed[symbol];
          }
        });
        console.log('✅ Using monthly deposits from localStorage:', finalMonthlyDeposits);
      }
      
      if (Object.keys(supabaseDeposits.oneTimeDeposits).length > 0) {
        finalOneTimeDeposits = supabaseDeposits.oneTimeDeposits;
        console.log('✅ Using one-time deposits from Supabase:', finalOneTimeDeposits);
      } else if (cachedOneTimeDeposits) {
        const parsed = JSON.parse(cachedOneTimeDeposits);
        Object.keys(parsed).forEach(symbol => {
          if (parsed[symbol] && parsed[symbol].date && parsed[symbol].amount) {
            finalOneTimeDeposits[symbol] = parsed[symbol];
          }
        });
        console.log('✅ Using one-time deposits from localStorage:', finalOneTimeDeposits);
      }
      
      // Update state and localStorage with loaded deposits
      if (Object.keys(finalMonthlyDeposits).length > 0 || Object.keys(supabaseDeposits.monthlyDeposits).length === 0) {
        setMonthlyDeposits(finalMonthlyDeposits);
        saveToLocalStorage('monthlyDeposits', finalMonthlyDeposits);
      }
      
      if (Object.keys(finalOneTimeDeposits).length > 0 || Object.keys(supabaseDeposits.oneTimeDeposits).length === 0) {
        setOneTimeDeposits(finalOneTimeDeposits);
        saveToLocalStorage('oneTimeDeposits', finalOneTimeDeposits);
      }
      
      if (cachedSelectedAssets) {
        const selected = JSON.parse(cachedSelectedAssets);
        setSelectedAssets(selected);
      }
      if (cachedAllSimulations) setAllAssetSimulations(JSON.parse(cachedAllSimulations));
      if (cachedSheetsId) setGoogleSheetsId(cachedSheetsId);

      console.log('✅ Loaded user-specific cache for:', user.email || user.id);
      // useEffect watching selectedAssets and allAssetSimulations will automatically rebuild combined simulation
    };

    loadUserData();
  }, [user?.id]);

  // Persistence functions - now user-specific
  const saveToLocalStorage = (key, data) => {
    try {
      localStorage.setItem(getUserKey(key), JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  };

  const updateRealPortfolioData = (data) => {
    setRealPortfolioData(data);
    saveToLocalStorage('realPortfolioData', data);
  };

  const updateAssetSimulations = (simulations) => {
    setAssetSimulations(simulations);
    saveToLocalStorage('assetSimulations', simulations);
  };

  const updateCagrTypes = (types) => {
    setCagrTypes(types);
    saveToLocalStorage('cagrTypes', types);
  };

  const updateSelectedAssets = (assets) => {
    setSelectedAssets(assets);
    saveToLocalStorage('selectedAssets', assets);
  };

  const updateAllAssetSimulations = (simulations) => {
    setAllAssetSimulations(simulations);
    saveToLocalStorage('allAssetSimulations', simulations);
  };

  // Save deposits to Supabase for cross-domain sync
  const saveDepositsToSupabase = async (monthlyDeposits, oneTimeDeposits) => {
    if (!user || !user.id || user.id === 'mock-user' || user.id === 'anonymous') {
      console.log('⚠️ Cannot save to Supabase: no valid user');
      return;
    }

    try {
      // Update user metadata with deposits
      const { error } = await supabase.auth.updateUser({
        data: {
          monthlyDeposits: monthlyDeposits,
          oneTimeDeposits: oneTimeDeposits
        }
      });

      if (error) {
        console.error('❌ Failed to save deposits to Supabase:', error);
      } else {
        console.log('✅ Saved deposits to Supabase');
      }
    } catch (err) {
      console.error('❌ Exception saving deposits to Supabase:', err);
    }
  };

  const updateMonthlyDeposits = async (deposits) => {
    // Clean the deposits object before saving (remove undefined/null entries)
    const cleaned = {};
    Object.keys(deposits).forEach(symbol => {
      if (deposits[symbol] && Array.isArray(deposits[symbol]) && deposits[symbol].length > 0) {
        cleaned[symbol] = deposits[symbol];
      }
    });
    console.log('💾 Saving monthly deposits:', cleaned);
    setMonthlyDeposits(cleaned);
    saveToLocalStorage('monthlyDeposits', cleaned);
    // Also save to Supabase for cross-domain sync
    await saveDepositsToSupabase(cleaned, oneTimeDeposits);
  };

  const updateOneTimeDeposits = async (deposits) => {
    // Clean the deposits object before saving (remove undefined/null entries)
    const cleaned = {};
    Object.keys(deposits).forEach(symbol => {
      if (deposits[symbol] && deposits[symbol].date && deposits[symbol].amount) {
        cleaned[symbol] = deposits[symbol];
      }
    });
    console.log('💾 Saving one-time deposits:', cleaned);
    setOneTimeDeposits(cleaned);
    saveToLocalStorage('oneTimeDeposits', cleaned);
    // Also save to Supabase for cross-domain sync
    await saveDepositsToSupabase(monthlyDeposits, cleaned);
  };

  const saveGoogleSheetsId = (id) => {
    setGoogleSheetsId(id);
    localStorage.setItem(getUserKey('googleSheetsId'), id);
  };

  const syncGoogleSheets = async () => {
    if (!googleSheetsId) {
      setSyncStatus('❌ Please enter your Google Sheets ID first');
      return;
    }

    setIsSyncing(true);
    setSyncStatus('🔄 Syncing with Google Sheets...');
    
    try {
      console.log('🔍 Starting Google Sheets sync...');
      
      // Fetch portfolio data from Google Sheets
      const assets = await fetchPortfolioData(googleSheetsId, GOOGLE_SHEETS_RANGE);
      console.log('📊 Fetched assets with currency conversion:', assets.map(a => ({
        symbol: a.symbol,
        currency: a.currency,
        shares: a.currentShares,
        avgPriceUSD: a.averageCostBasis,
        totalUSD: a.totalInvested
      })));

      // Fetch current market data and price history for each asset
      const assetsWithData = [];
      const newPriceHistory = {};
      for (const asset of assets) {
        try {
          console.log(`🔍 Fetching data for ${asset.symbol}...`);
          const assetData = await fetchAssetData(asset.symbol);
          
          // Fetch price history with dates for historical chart
          try {
            const priceHistoryData = await fetch10YPriceHistoryWithDates(asset.symbol);
            newPriceHistory[asset.symbol] = priceHistoryData;
            console.log(`📈 Fetched ${priceHistoryData.length} price points with dates for ${asset.symbol}`);
          } catch (e) {
            console.warn(`⚠️ Failed to fetch price history for ${asset.symbol}:`, e);
          }
          
          const assetWithData = {
            ...asset,
            cagr5Y: assetData.cagr5Y,
            cagr10Y: assetData.cagr10Y,
            cagrBlended: assetData.cagrBlended,
            volatility5Y: assetData.volatility5Y,
            volatility10Y: assetData.volatility10Y,
            volatilityBlended: assetData.volatilityBlended,
            currentPrice: assetData.currentPrice, // Last price from 10Y data
          };
          
          // Asset data stored successfully
          
          assetsWithData.push(assetWithData);
        } catch (e) {
          console.warn(`Failed to fetch data for ${asset.symbol}:`, e);
          assetsWithData.push(asset);
        }
      }
      
      // Store price history
      setPriceHistory(newPriceHistory);
      localStorage.setItem(getUserKey('priceHistory'), JSON.stringify(newPriceHistory));

      // Calculate current portfolio value using current market prices
      const totalPortfolioValue = Math.round((assetsWithData.reduce((sum, asset) => {
        const currentMarketValue = (asset.currentPrice || 0) * asset.totalShares;
        return sum + currentMarketValue;
      }, 0)) * 100) / 100;

      const assetsWithValues = assetsWithData.map(asset => {
        const totalInvested = Math.round((asset.purchases.reduce((sum, p) => sum + p.totalUSD, 0)) * 100) / 100;
        const currentValue = Math.round(((asset.currentPrice || 0) * asset.totalShares) * 100) / 100;
        
        console.log(`💰 ${asset.symbol} calculations:`, {
          currentPrice: asset.currentPrice,
          totalShares: asset.totalShares,
          totalInvested: totalInvested,
          currentValue: currentValue
        });
        
        return {
          ...asset,
          totalInvested: totalInvested,
          currentValue: currentValue
        };
      });

      console.log('📊 Portfolio summary:', {
        totalValue: totalPortfolioValue,
        assetCount: assetsWithValues.length,
        assets: assetsWithValues.map(a => ({
          symbol: a.symbol,
          shares: a.totalShares,
          totalInvested: a.totalInvested,
          currentValue: a.currentValue
        }))
      });

      updateRealPortfolioData({
        assets: assetsWithValues,
        totalValue: totalPortfolioValue,
        lastSync: new Date().toISOString()
      });

      // Clear combined simulation before re-simulating (in case old simulations exist)
      setCombinedSimulation(null);

      // Auto-simulate all assets (will use current oneTimeDeposits and monthlyDeposits state)
      // Note: If deposits were cleared, state should be empty and simulations will not include them
      console.log('📊 About to simulate assets. Current deposits state:', {
        oneTimeDeposits: oneTimeDeposits,
        monthlyDeposits: monthlyDeposits,
        hasOneTimeDeposits: Object.keys(oneTimeDeposits).length > 0,
        hasMonthlyDeposits: Object.keys(monthlyDeposits).length > 0
      });
      await simulateAllAssets(assetsWithValues);

      setSyncStatus('✅ Sync completed successfully!');
    } catch (error) {
      console.error('❌ Sync failed:', error);
      setSyncStatus('❌ Sync failed: ' + error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const simulateAllAssets = async (assets) => {
    console.log('🚀 Auto-simulating all assets...');
    console.log('🔍 Current deposits state:', {
      oneTimeDeposits: Object.keys(oneTimeDeposits).length > 0 ? oneTimeDeposits : 'empty',
      monthlyDeposits: Object.keys(monthlyDeposits).length > 0 ? monthlyDeposits : 'empty'
    });
    setIsSimulatingAll(true);
    
    const allSimulations = {};
    
    for (const asset of assets) {
      try {
        const cagrType = cagrTypes[asset.symbol] || '5Y';
        let cagr, volatility;
        
        switch (cagrType) {
          case '10Y':
            cagr = asset.cagr10Y || 0.08;
            volatility = asset.volatility10Y || 0.15;
            break;
          case 'Blended':
            cagr = asset.cagrBlended || 0.08;
            volatility = asset.volatilityBlended || 0.15;
            break;
          default: // '5Y'
            cagr = asset.cagr5Y || 0.08;
            volatility = asset.volatility5Y || 0.15;
        }
        
        // Get monthly deposits for this asset (convert from {id, date, amount} to {date, amount} for backend)
        // Normalize dates to first of month (backend only checks dates on month boundaries)
        const assetMonthlyDeposits = (monthlyDeposits[asset.symbol] || []).map(d => {
          const dateParts = d.date.split('-');
          const normalizedDate = dateParts.length === 3 ? `${dateParts[0]}-${dateParts[1]}-01` : d.date;
          return {
            date: normalizedDate,
            amount: d.amount
          };
        });
        
        if (assetMonthlyDeposits.length > 0) {
          console.log(`💰 Monthly deposits for ${asset.symbol}:`, assetMonthlyDeposits);
        }

        // Build one-time deposits array: always include initial deposit, plus optional user deposit
        const currentMonthStart = getCurrentMonthStart();
        const oneTimeDepositsArray = [{
          date: currentMonthStart,
          amount: asset.currentValue
        }];
        
        // Add optional user-defined one-time deposit if it exists
        // IMPORTANT: Only use deposits if they exist in current state (not from old cached simulations)
        const userOneTimeDeposit = oneTimeDeposits[asset.symbol];
        if (userOneTimeDeposit && userOneTimeDeposit.date && userOneTimeDeposit.amount > 0) {
          // Normalize date to first of month (backend only checks dates on month boundaries)
          // Parse YYYY-MM-DD and convert to YYYY-MM-01
          const dateParts = userOneTimeDeposit.date.split('-');
          if (dateParts.length === 3) {
            const normalizedDate = `${dateParts[0]}-${dateParts[1]}-01`;
            
            oneTimeDepositsArray.push({
              date: normalizedDate,
              amount: userOneTimeDeposit.amount
            });
            console.log(`💰 Adding user one-time deposit for ${asset.symbol}:`, {
              originalDate: userOneTimeDeposit.date,
              normalizedDate: normalizedDate,
              amount: userOneTimeDeposit.amount
            });
          } else {
            console.warn(`⚠️ Invalid date format for one-time deposit: ${userOneTimeDeposit.date}`);
          }
        } else {
          // Log when no user deposit is found (for debugging)
          if (Object.keys(oneTimeDeposits).length > 0) {
            console.log(`ℹ️ No user one-time deposit for ${asset.symbol} (deposits exist for other assets: ${Object.keys(oneTimeDeposits).join(', ')})`);
          }
        }

        const payload = {
          allocations: [{
            allocation: 100,
            cagr: cagr,
            volatility: volatility,
          }],
          oneTimeDeposits: oneTimeDepositsArray,
          monthlyChanges: assetMonthlyDeposits,
          years: 10
        };
        
        console.log(`📊 Simulation payload for ${asset.symbol}:`, {
          allocations: payload.allocations,
          oneTimeDeposits: payload.oneTimeDeposits,
          monthlyChanges: payload.monthlyChanges,
          monthlyChangesCount: payload.monthlyChanges.length,
          years: payload.years
        });
        
        const res = await fetch(
          'https://investment-dashboard-backend-gm79.onrender.com/api/simulate',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }
        );
        
        if (res.ok) {
          const result = await res.json();
          allSimulations[asset.symbol] = result;
          console.log(`✅ Auto-simulation completed for ${asset.symbol}`);
        } else {
          console.warn(`⚠️ Auto-simulation failed for ${asset.symbol}`);
        }
      } catch (error) {
        console.warn(`⚠️ Auto-simulation error for ${asset.symbol}:`, error);
      }
    }
    
    updateAllAssetSimulations(allSimulations);
    setIsSimulatingAll(false);
    console.log('✅ All assets auto-simulated:', Object.keys(allSimulations));
    
    // Auto-select all assets when simulations complete
    const autoSelectedAssets = {};
    assets.forEach(asset => {
      autoSelectedAssets[asset.symbol] = true;
    });
    updateSelectedAssets(autoSelectedAssets);
    console.log('✅ Auto-selected all assets:', Object.keys(autoSelectedAssets));
    // useEffect will automatically update combined simulation when selectedAssets changes
  };

  // Effect to update combined simulation whenever selectedAssets or allAssetSimulations change
  useEffect(() => {
    const selectedAssetSymbols = Object.keys(selectedAssets).filter(symbol => selectedAssets[symbol]);
    
    console.log('🔍 useEffect triggered for combined simulation:', {
      selectedAssetSymbols,
      availableSimulations: Object.keys(allAssetSimulations),
      selectedAssetsCount: selectedAssetSymbols.length,
      simulationsCount: Object.keys(allAssetSimulations).length
    });
    
    if (selectedAssetSymbols.length === 0) {
      setCombinedSimulation(null);
      return;
    }
    
    // Get pre-calculated simulations for selected assets
    const selectedSimulations = selectedAssetSymbols
      .map(symbol => allAssetSimulations[symbol])
      .filter(sim => sim); // Filter out any missing simulations
    
    console.log('📊 Found simulations for selected assets:', {
      requested: selectedAssetSymbols,
      found: selectedSimulations.length,
      missing: selectedAssetSymbols.length - selectedSimulations.length
    });
    
    if (selectedSimulations.length === 0) {
      console.warn('⚠️ No simulations found for selected assets');
      setCombinedSimulation(null);
      return;
    }
    
    // Combine the pre-calculated simulation results
    const combinedResult = {
      simulationStartDate: getCurrentMonthStart(),
      months: selectedSimulations[0].months, // All should have same months
      mean: [],
      median: [],
      percentile10: [],
      percentile90: []
    };
    
    // Sum up the results for each time point
    for (let i = 0; i < combinedResult.months.length; i++) {
      let sumMean = 0;
      let sumMedian = 0;
      let sumP10 = 0;
      let sumP90 = 0;
      
      selectedSimulations.forEach(sim => {
        sumMean += sim.mean[i] || 0;
        sumMedian += sim.median[i] || 0;
        sumP10 += sim.percentile10[i] || 0;
        sumP90 += sim.percentile90[i] || 0;
      });
      
      combinedResult.mean.push(Math.round(sumMean));
      combinedResult.median.push(Math.round(sumMedian));
      combinedResult.percentile10.push(Math.round(sumP10));
      combinedResult.percentile90.push(Math.round(sumP90));
    }
    
    console.log(`✅ Updated combined simulation with selected assets:`, selectedAssetSymbols);
    setCombinedSimulation(combinedResult);
  }, [selectedAssets, allAssetSimulations]);

  const updateCombinedSimulation = () => {
    // This function is now a no-op - the useEffect handles updates
    // But we keep it for backward compatibility with setTimeout calls
    // The useEffect will automatically trigger when state changes
  };

  // Re-simulate a single asset when CAGR type, monthly deposits, or one-time deposit changes
  const reSimulateAsset = async (asset, newCagrType, currentMonthlyDeposits = null, currentOneTimeDeposit = null) => {
    if (reSimulatingAssets.has(asset.symbol)) return;
    
    setReSimulatingAssets(prev => new Set(prev).add(asset.symbol));
    
    try {
      console.log(`🔄 Re-simulating ${asset.symbol} with new CAGR type: ${newCagrType}...`);
      
      // Use the new CAGR type passed as parameter (state update is async)
      const cagrType = newCagrType || cagrTypes[asset.symbol] || '5Y';
      
      // Select CAGR and volatility based on type
      let cagr, volatility;
      switch (cagrType) {
        case '10Y':
          cagr = asset.cagr10Y || 0.08;
          volatility = asset.volatility10Y || 0.15;
          break;
        case 'Blended':
          cagr = asset.cagrBlended || 0.08;
          volatility = asset.volatilityBlended || 0.15;
          break;
        default: // '5Y'
          cagr = asset.cagr5Y || 0.08;
          volatility = asset.volatility5Y || 0.15;
      }
      
      // Get monthly deposits - use passed value if provided, otherwise use current state
      const depositsToUse = currentMonthlyDeposits !== null 
        ? currentMonthlyDeposits 
        : (monthlyDeposits[asset.symbol] || []);
      
      // Convert from {id, date, amount} to {date, amount} for backend
      // Normalize dates to first of month (backend only checks dates on month boundaries)
      const assetMonthlyDeposits = depositsToUse.map(d => {
        const dateParts = d.date.split('-');
        const normalizedDate = dateParts.length === 3 ? `${dateParts[0]}-${dateParts[1]}-01` : d.date;
        return {
          date: normalizedDate,
          amount: d.amount
        };
      });
      
      if (assetMonthlyDeposits.length > 0) {
        console.log(`💰 Monthly deposits for ${asset.symbol} (re-simulation):`, assetMonthlyDeposits);
      }

      // Get one-time deposit - use passed value if provided, otherwise use current state
      const oneTimeDepositToUse = currentOneTimeDeposit !== null
        ? currentOneTimeDeposit
        : (oneTimeDeposits[asset.symbol] || null);

      // Build one-time deposits array: always include initial deposit, plus optional user deposit
      const oneTimeDepositsArray = [{
        date: '2025-01-01',
        amount: asset.currentValue
      }];
      
      // Add optional user-defined one-time deposit if it exists
      if (oneTimeDepositToUse && oneTimeDepositToUse.date && oneTimeDepositToUse.amount > 0) {
        // Normalize date to first of month (backend only checks dates on month boundaries)
        // Parse YYYY-MM-DD and convert to YYYY-MM-01
        const dateParts = oneTimeDepositToUse.date.split('-');
        if (dateParts.length === 3) {
          const normalizedDate = `${dateParts[0]}-${dateParts[1]}-01`;
          
          oneTimeDepositsArray.push({
            date: normalizedDate,
            amount: oneTimeDepositToUse.amount
          });
        } else {
          console.warn(`⚠️ Invalid date format for one-time deposit: ${oneTimeDepositToUse.date}`);
        }
      }

      const payload = {
        allocations: [{
          allocation: 100,
          cagr: cagr,
          volatility: volatility,
        }],
        oneTimeDeposits: oneTimeDepositsArray,
        monthlyChanges: assetMonthlyDeposits,
        years: 10
      };

      console.log(`📊 Re-simulation payload for ${asset.symbol} (${cagrType}):`, payload);
      console.log(`💰 One-time deposits breakdown:`, {
        initialDeposit: { date: getCurrentMonthStart(), amount: asset.currentValue },
        userDeposit: oneTimeDepositToUse,
        normalizedUserDeposit: oneTimeDepositToUse && oneTimeDepositToUse.date && oneTimeDepositToUse.amount > 0 ? {
          originalDate: oneTimeDepositToUse.date,
          normalizedDate: oneTimeDepositsArray.find(d => d.date !== getCurrentMonthStart())?.date,
          amount: oneTimeDepositToUse.amount
        } : null,
        totalDeposits: oneTimeDepositsArray.length,
        allDeposits: oneTimeDepositsArray,
        totalAmount: oneTimeDepositsArray.reduce((sum, d) => sum + d.amount, 0)
      });

      const res = await fetch(
        'https://investment-dashboard-backend-gm79.onrender.com/api/simulate',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Simulation failed');
      }
      
      const result = await res.json();
      console.log(`✅ Re-simulation completed for ${asset.symbol}:`, result);
      
      // Update allAssetSimulations so the combined simulation reflects the change
      // Use functional update to ensure we have the latest state
      setAllAssetSimulations(prev => {
        const updated = {
          ...prev,
          [asset.symbol]: result
        };
        saveToLocalStorage('allAssetSimulations', updated);
        return updated;
      });
      
      // Also update assetSimulations for consistency
      setAssetSimulations(prev => {
        const updated = {
          ...prev,
          [asset.symbol]: result
        };
        saveToLocalStorage('assetSimulations', updated);
        return updated;
      });
      
    } catch (error) {
      console.error(`❌ Re-simulation error for ${asset.symbol}:`, error);
    } finally {
      setReSimulatingAssets(prev => {
        const newSet = new Set(prev);
        newSet.delete(asset.symbol);
        return newSet;
      });
    }
  };

  const runAssetSimulation = async (asset) => {
    if (simulatingAssets.has(asset.symbol)) return;
    
    setSimulatingAssets(prev => new Set(prev).add(asset.symbol));
    
    try {
      console.log(`🚀 Starting simulation for ${asset.symbol}...`);
      
      // Get the selected CAGR type for this asset (default to '5Y')
      const cagrType = cagrTypes[asset.symbol] || '5Y';
      
      // Select CAGR and volatility based on type
      let cagr, volatility;
      switch (cagrType) {
        case '10Y':
          cagr = asset.cagr10Y || 0.08;
          volatility = asset.volatility10Y || 0.15;
          break;
        case 'Blended':
          cagr = asset.cagrBlended || 0.08;
          volatility = asset.volatilityBlended || 0.15;
          break;
        default: // '5Y'
          cagr = asset.cagr5Y || 0.08;
          volatility = asset.volatility5Y || 0.15;
      }
      
      // Get monthly deposits for this asset (convert from {id, date, amount} to {date, amount} for backend)
      // Normalize dates to first of month (backend only checks dates on month boundaries)
      const assetMonthlyDeposits = (monthlyDeposits[asset.symbol] || []).map(d => {
        const dateParts = d.date.split('-');
        const normalizedDate = dateParts.length === 3 ? `${dateParts[0]}-${dateParts[1]}-01` : d.date;
        return {
          date: normalizedDate,
          amount: d.amount
        };
      });
      
      if (assetMonthlyDeposits.length > 0) {
        console.log(`💰 Monthly deposits for ${asset.symbol} (runAssetSimulation):`, assetMonthlyDeposits);
      }

      // Build one-time deposits array: always include initial deposit, plus optional user deposit
      const oneTimeDepositsArray = [{
        date: '2025-01-01',
        amount: asset.currentValue // Use current value as initial deposit
      }];
      
      // Add optional user-defined one-time deposit if it exists
      const userOneTimeDeposit = oneTimeDeposits[asset.symbol];
      if (userOneTimeDeposit && userOneTimeDeposit.date && userOneTimeDeposit.amount > 0) {
        // Normalize date to first of month (backend only checks dates on month boundaries)
        // Parse YYYY-MM-DD and convert to YYYY-MM-01
        const dateParts = userOneTimeDeposit.date.split('-');
        if (dateParts.length === 3) {
          const normalizedDate = `${dateParts[0]}-${dateParts[1]}-01`;
          
          oneTimeDepositsArray.push({
            date: normalizedDate,
            amount: userOneTimeDeposit.amount
          });
        } else {
          console.warn(`⚠️ Invalid date format for one-time deposit: ${userOneTimeDeposit.date}`);
        }
      }

      const payload = {
        allocations: [{
          allocation: 100, // 100% allocation for single asset
          cagr: cagr,
          volatility: volatility,
        }],
        oneTimeDeposits: oneTimeDepositsArray,
        monthlyChanges: assetMonthlyDeposits,
        years: 10 // 10-year projection
      };

      console.log(`📊 Simulation payload for ${asset.symbol} (${cagrType}):`, payload);
      console.log(`💰 Deposit value: $${asset.currentValue.toFixed(2)}`);
      console.log(`🔍 Debug - Asset values for ${asset.symbol}:`, {
        currentPrice: asset.currentPrice,
        totalShares: asset.totalShares,
        currentValue: asset.currentValue,
        totalInvested: asset.totalInvested
      });

      const res = await fetch(
        'https://investment-dashboard-backend-gm79.onrender.com/api/simulate',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Simulation failed');
      }
      
      const result = await res.json();
      console.log(`✅ Simulation result for ${asset.symbol}:`, result);
      
      updateAssetSimulations({
        ...assetSimulations,
        [asset.symbol]: result
      });
      
    } catch (error) {
      console.error(`❌ Simulation error for ${asset.symbol}:`, error);
    } finally {
      setSimulatingAssets(prev => {
        const newSet = new Set(prev);
        newSet.delete(asset.symbol);
        return newSet;
      });
    }
  };

  const getSimulationOption = (asset, simulationResult) => {
    if (!simulationResult) return {};

    const { months, median, percentile10, percentile90 } = simulationResult;
    const cagrType = cagrTypes[asset.symbol] || '5Y';
    
    // Calculate the minimum value across all data points to set Y-axis start
    const allValues = [...median, ...percentile10, ...percentile90];
    const minValue = Math.min(...allValues);
    const yAxisMin = Math.max(0, minValue * 0.95); // Start at 95% of minimum value

    return {
      title: {
        text: `${asset.symbol} - 10 Year Projection (${cagrType})`,
        left: 'center',
        top: 10,
        textStyle: { color: '#1f2937', fontSize: 14 },
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          const idx = params[0]?.dataIndex || 0;
          const offset = months[idx];
          const yrs = Math.floor(offset / 12);
          const mos = offset % 12;
          const date = dayjs().add(offset, 'month');

          const titleParts = [];
          if (yrs > 0) {
            titleParts.push(`${yrs} Year${yrs !== 1 ? 's' : ''}`);
          }
          if (mos > 0) {
            titleParts.push(`${mos} Month${mos !== 1 ? 's' : ''}`);
          }

          const formatUSD = (v) => {
            if (v === undefined || v === null) return 'N/A';
            const convertedValue = convertCurrency(v);
            const symbol = currency === 'ILS' ? '₪' : '$';
            return `${symbol}${Math.round(convertedValue).toLocaleString('en-US')}`;
          };

          return `
            <div style="font-weight: bold; margin-bottom: 8px;">
              ${titleParts.join(', ')} (${date.format('MMM YYYY')})
            </div>
            <div style="margin-bottom: 4px;">
              <span style="color: #10b981;">●</span> Median: ${formatUSD(median[idx])}
            </div>
            <div style="margin-bottom: 4px;">
              <span style="color: #3b82f6;">●</span> 10th Percentile: ${formatUSD(percentile10[idx])}
            </div>
            <div style="margin-bottom: 4px;">
              <span style="color: #ef4444;">●</span> 90th Percentile: ${formatUSD(percentile90[idx])}
            </div>
          `;
        },
      },
      grid: {
        left: '10%',
        right: '10%',
        top: '15%',
        bottom: '15%',
      },
      xAxis: {
        type: 'category',
        data: months.map((m, i) => dayjs().add(m, 'month').format('MMM YYYY')),
        axisLabel: { fontSize: 10 },
      },
      yAxis: {
        type: 'value',
        min: yAxisMin, // Start at 95% of the minimum value to show proper starting point
        axisLabel: {
          formatter: (value) => {
            const convertedValue = convertCurrency(value);
            const symbol = currency === 'ILS' ? '₪' : '$';
            if (convertedValue >= 1000000) {
              return `${symbol}${(convertedValue / 1000000).toFixed(0)}M`;
            } else {
              return `${symbol}${(convertedValue / 1000).toFixed(0)}k`;
            }
          },
          fontSize: 10,
        },
      },
      series: [
        {
          name: '10th Percentile',
          data: percentile10,
          type: 'line',
          showSymbol: false,
          lineStyle: { color: '#3b82f6' },
        },
        {
          name: 'Median',
          data: median,
          type: 'line',
          showSymbol: false,
          lineStyle: { color: '#10b981', width: 2 },
        },
        {
          name: '90th Percentile',
          data: percentile90,
          type: 'line',
          showSymbol: false,
          lineStyle: { color: '#ef4444' },
        },
      ],
    };
  };

  // Helper function to convert USD to ILS
  const convertCurrency = (usdValue) => {
    if (currency === 'ILS' && exchangeRate > 0) {
      return usdValue * exchangeRate;
    }
    return usdValue;
  };

  // Helper function to format currency value
  const formatCurrency = (value) => {
    const convertedValue = convertCurrency(value);
    const symbol = currency === 'ILS' ? '₪' : '$';
    return `${symbol}${convertedValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Handle currency toggle
  const handleCurrencyToggle = (newCurrency) => {
    if (newCurrency === 'ILS' && (!exchangeRate || exchangeRate <= 0)) {
      setCurrencyError('Please enter an exchange rate before switching to ₪');
      return;
    }
    setCurrencyError('');
    setCurrency(newCurrency);
    localStorage.setItem(getUserKey('currency'), newCurrency);
  };

  // Handle exchange rate change
  const handleExchangeRateChange = (value) => {
    const rate = parseFloat(value) || 0;
    setExchangeRate(rate);
    localStorage.setItem(getUserKey('exchangeRate'), rate.toString());
    if (rate > 0 && currencyError) {
      setCurrencyError('');
    }
  };

  // Helper function to normalize date to YYYY-MM-DD format
  const normalizeDate = (dateStr) => {
    if (!dateStr) return null;
    
    // If already in YYYY-MM-DD format, return as is (after removing time if present)
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      return dateStr.split('T')[0];
    }
    
    // Try to parse various date formats
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return null;
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (e) {
      console.warn('⚠️ Failed to parse date:', dateStr, e);
      return null;
    }
  };

  // Calculate historical portfolio value over time
  const calculateHistoricalPortfolioValue = (assets, priceHistoryData) => {
    if (!assets || assets.length === 0 || !priceHistoryData) return [];
    
    // Find earliest purchase date across all assets (for selected assets only)
    const selectedSymbols = Object.keys(selectedAssets).filter(s => selectedAssets[s]);
    if (selectedSymbols.length === 0) return [];
    
    const allPurchaseDates = [];
    selectedSymbols.forEach(symbol => {
      const asset = assets.find(a => a.symbol === symbol);
      if (asset && asset.purchases && asset.purchases.length > 0) {
        asset.purchases.forEach(p => {
          if (p.date) {
            const normalizedDate = normalizeDate(p.date);
            if (normalizedDate) {
              allPurchaseDates.push(normalizedDate);
            }
          }
        });
      }
    });
    
    if (allPurchaseDates.length === 0) return [];
    
    // Sort dates and get the earliest and most recent purchase dates
    const sortedPurchaseDates = allPurchaseDates.sort();
    const earliestDate = sortedPurchaseDates[0];
    const mostRecentPurchaseDate = sortedPurchaseDates[sortedPurchaseDates.length - 1];
    
    console.log('📅 Historical calculation:', {
      earliestPurchaseDate: earliestDate,
      mostRecentPurchaseDate: mostRecentPurchaseDate,
      selectedSymbols,
      allPurchaseDates: allPurchaseDates.slice(0, 5) // Show first 5 for debugging
    });
    
    // Get all unique dates from price history (daily resolution)
    // We need to merge dates from all selected assets to get a complete daily timeline
    const allDatesSet = new Set();
    
    // First, collect all dates from all selected assets' price history
    selectedSymbols.forEach(symbol => {
      if (priceHistoryData[symbol]) {
        priceHistoryData[symbol].forEach(({ date }) => {
          // Only include dates from the first purchase onwards and up to the most recent purchase date
          if (date >= earliestDate && date <= mostRecentPurchaseDate) {
            allDatesSet.add(date);
          }
        });
      }
    });
    
    // Sort all dates to get chronological order
    const sortedDates = Array.from(allDatesSet).sort();
    if (sortedDates.length === 0) return [];
    
    console.log('📊 Historical data points:', {
      totalDates: sortedDates.length,
      firstDate: sortedDates[0],
      lastDate: sortedDates[sortedDates.length - 1],
      dateRange: `${sortedDates[0]} to ${sortedDates[sortedDates.length - 1]}`
    });
    
    // Calculate portfolio value for each daily date
    const historicalValues = sortedDates.map(date => {
      let portfolioValue = 0;
      
      selectedSymbols.forEach(symbol => {
        const asset = assets.find(a => a.symbol === symbol);
        if (!asset || !asset.purchases) return;
        
        // Calculate cumulative shares owned up to this date
        const cumulativeShares = asset.purchases
          .filter(p => {
            const purchaseDate = normalizeDate(p.date);
            return purchaseDate && purchaseDate <= date;
          })
          .reduce((sum, p) => sum + (p.shares || 0), 0);
        
        // Find price for this date (or closest previous date)
        if (priceHistoryData[symbol]) {
          let price = null;
          for (let i = priceHistoryData[symbol].length - 1; i >= 0; i--) {
            if (priceHistoryData[symbol][i].date <= date) {
              price = priceHistoryData[symbol][i].price;
              break;
            }
          }
          
          if (price && cumulativeShares > 0) {
            portfolioValue += price * cumulativeShares;
          }
        }
      });
      
      return { date, value: portfolioValue };
    });
    
    return {
      values: historicalValues,
      mostRecentPurchaseDate: mostRecentPurchaseDate
    };
  };

  const getCombinedSimulationOption = () => {
    if (!combinedSimulation) return {};
    
    const months = combinedSimulation.months;
    const median = combinedSimulation.median;
    const percentile10 = combinedSimulation.percentile10;
    const percentile90 = combinedSimulation.percentile90;
    const simulationStartDate = combinedSimulation.simulationStartDate || getCurrentMonthStart();
    
    // Parse the start date to use as base for x-axis
    const startDate = dayjs(simulationStartDate);
    
    // Calculate historical portfolio value
    const historicalResult = calculateHistoricalPortfolioValue(realPortfolioData?.assets || [], priceHistory);
    const historicalData = historicalResult?.values || [];
    const mostRecentPurchaseDate = historicalResult?.mostRecentPurchaseDate;
    
    if (!historicalData || historicalData.length === 0) {
      // If no historical data, just show projections
      return {};
    }
    
    // Combine historical and projected dates
    const historicalDates = historicalData.map(d => d.date);
    const projectedDates = months.map((_, index) => {
      const date = startDate.add(index, 'month');
      return date.format('YYYY-MM-01');
    });
    
    // Combine all dates, removing duplicates and sorting
    const allDates = [...new Set([...historicalDates, ...projectedDates])].sort();
    
    // Find the index where historical ends (at most recent purchase date) and projection begins
    // Historical data ends at the most recent purchase date, projection starts from the simulation start date
    // Find the last historical date index (should be at or before the most recent purchase date)
    let lastHistoricalIndex = -1;
    if (mostRecentPurchaseDate) {
      for (let i = allDates.length - 1; i >= 0; i--) {
        if (allDates[i] <= mostRecentPurchaseDate) {
          lastHistoricalIndex = i;
          break;
        }
      }
    } else {
      // Fallback: use the last historical date if mostRecentPurchaseDate is not available
      lastHistoricalIndex = historicalDates.length > 0 
        ? allDates.findIndex(d => d === historicalDates[historicalDates.length - 1])
        : -1;
    }
    
    // Find the first projection date index
    // Projections are monthly and start from the simulation start date (first of current month)
    // We want to show projections starting from the current month
    const firstProjectionDate = simulationStartDate; // e.g., "2025-11-01"
    let finalProjectionStartIndex = allDates.findIndex(d => {
      // Find the first date that is a projection date and is >= simulation start date
      return projectedDates.includes(d) && d >= firstProjectionDate;
    });
    
    // Safety check: if no projection found, use the first projection date
    if (finalProjectionStartIndex < 0) {
      finalProjectionStartIndex = allDates.findIndex(d => projectedDates.includes(d));
    }
    
    // Ensure historical data doesn't extend beyond the most recent purchase date
    // This ensures a clear visual separation between actual historical data and projections
    
    // Build data arrays: historical values + projected values
    // Historical data should only show up to the most recent purchase date
    const historicalValuesArray = allDates.map((date, idx) => {
      // Only show historical data up to the most recent purchase date
      if (idx > lastHistoricalIndex) return null;
      const histPoint = historicalData.find(d => d.date === date);
      return histPoint ? histPoint.value : null;
    });
    
    const medianArray = allDates.map((date, idx) => {
      if (idx < finalProjectionStartIndex) return null; // Historical period
      const projIdx = projectedDates.indexOf(date);
      return projIdx >= 0 ? median[projIdx] : null;
    });
    
    const percentile10Array = allDates.map((date, idx) => {
      if (idx < finalProjectionStartIndex) return null;
      const projIdx = projectedDates.indexOf(date);
      return projIdx >= 0 ? percentile10[projIdx] : null;
    });
    
    const percentile90Array = allDates.map((date, idx) => {
      if (idx < finalProjectionStartIndex) return null;
      const projIdx = projectedDates.indexOf(date);
      return projIdx >= 0 ? percentile90[projIdx] : null;
    });
    
    // Calculate Y-axis minimum (95% of minimum value) including historical data
    const historicalValues = historicalData.map(d => d.value);
    const allValues = [...historicalValues.filter(v => v > 0), ...median.filter(v => v > 0), ...percentile10.filter(v => v > 0), ...percentile90.filter(v => v > 0)];
    const minValue = Math.min(...allValues);
    const yAxisMin = Math.max(0, minValue * 0.95);
    
    return {
      title: {
        text: 'Combined Portfolio - Historical & Projected',
        left: 'center',
        top: 10,
        textStyle: { color: '#1f2937', fontSize: 14 },
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          const idx = params[0]?.dataIndex || 0;
          const dateStr = allDates[idx];
          const date = dayjs(dateStr);
          
          const formatUSD = (v) => {
            if (v === undefined || v === null) return 'N/A';
            const convertedValue = convertCurrency(v);
            const symbol = currency === 'ILS' ? '₪' : '$';
            return `${symbol}${Math.round(convertedValue).toLocaleString('en-US')}`;
          };

          // Format date: show day for historical data, month/year for projected
          // Check if this is actually historical data (has historical value) rather than just checking index
          const isHistoricalData = historicalValuesArray[idx] !== null;
          const dateFormat = isHistoricalData
            ? date.format('MMM DD, YYYY')  // Daily format: "Nov 16, 2025"
            : date.format('MMM YYYY');      // Monthly format: "Nov 2025"

          let tooltipContent = `
            <div style="font-weight: bold; margin-bottom: 8px;">
              ${dateFormat}
            </div>
          `;
          
          // Add historical value if available
          if (historicalValuesArray[idx] !== null) {
            tooltipContent += `
              <div style="margin-bottom: 4px;">
                <span style="color: #6366f1;">●</span> Historical: ${formatUSD(historicalValuesArray[idx])}
              </div>
            `;
          }
          
          // Add projected values if available
          if (medianArray[idx] !== null) {
            tooltipContent += `
              <div style="margin-bottom: 4px;">
                <span style="color: #3b82f6;">●</span> Median: ${formatUSD(medianArray[idx])}
              </div>
              <div style="margin-bottom: 4px;">
                <span style="color: #3b82f6;">●</span> 10th Percentile: ${formatUSD(percentile10Array[idx])}
              </div>
              <div style="margin-bottom: 4px;">
                <span style="color: #10b981;">●</span> 90th Percentile: ${formatUSD(percentile90Array[idx])}
              </div>
            `;
          }
          
          return tooltipContent;
        },
      },
      legend: {
        data: ['Historical Portfolio Value', '10th Percentile', 'Median', '90th Percentile'],
        top: 30,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%', // Increased bottom margin for zoom slider
        top: '15%',
        containLabel: true,
      },
      dataZoom: [
        {
          type: 'slider',
          show: true,
          xAxisIndex: [0],
          start: 0, // Start showing from beginning
          end: 100, // Show all data initially
          bottom: 10,
          height: 20,
          handleIcon: 'M10.7,11.9v-1.3H9.3v1.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4v1.3h1.3v-1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z M13.3,24.4H6.7V23.1h6.6V24.4z M13.3,19.6H6.7v-1.4h6.6V19.6z',
          handleSize: '80%',
          handleStyle: {
            color: '#3b82f6',
            shadowBlur: 3,
            shadowColor: 'rgba(0, 0, 0, 0.6)',
            shadowOffsetX: 2,
            shadowOffsetY: 2
          },
          textStyle: {
            color: '#6b7280',
            fontSize: 10
          },
          borderColor: '#e5e7eb',
          fillerColor: 'rgba(59, 130, 246, 0.2)',
          dataBackground: {
            lineStyle: {
              color: '#9ca3af',
              width: 1
            },
            areaStyle: {
              color: '#f3f4f6'
            }
          },
          selectedDataBackground: {
            lineStyle: {
              color: '#3b82f6',
              width: 2
            },
            areaStyle: {
              color: 'rgba(59, 130, 246, 0.3)'
            }
          },
          moveHandleStyle: {
            color: '#3b82f6'
          }
        },
        {
          type: 'inside',
          xAxisIndex: [0],
          start: 0,
          end: 100,
          zoomOnMouseWheel: true, // Enable mouse wheel zoom
          moveOnMouseMove: true, // Enable pan with mouse drag
          moveOnMouseWheel: false // Disable move on wheel (use zoom instead)
        }
      ],
      xAxis: {
        type: 'category',
        data: allDates.map((date, idx) => {
          const dateObj = dayjs(date);
          // For historical data (daily), show daily labels
          // For projected data (monthly), show monthly labels
          // Check if this is actually historical data (has historical value)
          const isHistoricalData = historicalValuesArray[idx] !== null;
          if (isHistoricalData) {
            // Daily labels for historical - show date
            return dateObj.format('MMM DD');
          } else {
            // Monthly labels for projected
            return dateObj.format('MMM YYYY');
          }
        }),
        axisLabel: { 
          fontSize: 10, 
          rotate: 45,
          interval: (index, value) => {
            // Auto-hide labels to prevent crowding
            // For daily historical data, show labels based on data density
            const isHistoricalData = historicalValuesArray[index] !== null;
            if (isHistoricalData) {
              // Count total historical data points
              const totalHistorical = historicalValuesArray.filter(v => v !== null).length;
              if (totalHistorical > 365) {
                // More than a year: show weekly labels (every ~7 days)
                return index % 7 === 0;
              } else if (totalHistorical > 90) {
                // More than 3 months: show every 3 days
                return index % 3 === 0;
              } else {
                // Less than 3 months: show every day
                return true;
              }
            }
            // For projected monthly data, show all labels
            return true;
          }
        },
      },
      yAxis: {
        type: 'value',
        min: yAxisMin,
        axisLabel: {
          formatter: (value) => {
            const convertedValue = convertCurrency(value);
            const symbol = currency === 'ILS' ? '₪' : '$';
            if (convertedValue >= 1000000) {
              return `${symbol}${(convertedValue / 1000000).toFixed(0)}M`;
            } else {
              return `${symbol}${(convertedValue / 1000).toFixed(0)}k`;
            }
          },
          fontSize: 10,
        },
      },
      series: [
        {
          name: 'Historical Portfolio Value',
          data: historicalValuesArray,
          type: 'line',
          smooth: true,
          lineStyle: { color: '#6366f1', width: 2 },
          itemStyle: { color: '#6366f1' },
          markLine: {
            silent: true,
            lineStyle: { color: '#9ca3af', width: 1, type: 'dashed' },
            data: [{ xAxis: finalProjectionStartIndex >= 0 ? finalProjectionStartIndex : allDates.length - 1 }],
            label: { show: false },
          },
        },
        {
          name: '10th Percentile',
          data: percentile10Array,
          type: 'line',
          smooth: true,
          lineStyle: { color: '#ef4444', width: 2 },
          areaStyle: { opacity: 0.1, color: '#ef4444' },
        },
        {
          name: 'Median',
          data: medianArray,
          type: 'line',
          smooth: true,
          lineStyle: { color: '#3b82f6', width: 3 },
          areaStyle: { opacity: 0.1, color: '#3b82f6' },
        },
        {
          name: '90th Percentile',
          data: percentile90Array,
          type: 'line',
          smooth: true,
          lineStyle: { color: '#10b981', width: 2 },
          areaStyle: { opacity: 0.1, color: '#10b981' },
        },
      ],
    };
  };

  const getLoadingChartOption = () => {
    return {
      title: {
        text: 'Simulating Assets...',
        left: 'center',
        top: '45%',
        textStyle: { 
          color: '#6b7280', 
          fontSize: 16,
          fontWeight: 'normal'
        },
      },
      tooltip: {
        trigger: 'axis',
        formatter: () => {
          return 'Simulations in progress...<br/>Please wait while we calculate projections for all assets.';
        },
      },
      graphic: {
        elements: [{
          type: 'group',
          left: 'center',
          top: 'center',
          children: [{
            type: 'rect',
            shape: { width: 4, height: 20 },
            style: { fill: '#3b82f6' },
            keyframeAnimation: {
              duration: 1000,
              loop: true,
              keyframes: [
                { percent: 0, scaleY: 0.3, style: { fill: '#3b82f6' } },
                { percent: 0.5, scaleY: 1, style: { fill: '#10b981' } },
                { percent: 1, scaleY: 0.3, style: { fill: '#ef4444' } }
              ]
            },
            x: -10
          }, {
            type: 'rect',
            shape: { width: 4, height: 20 },
            style: { fill: '#3b82f6' },
            keyframeAnimation: {
              duration: 1000,
              loop: true,
              keyframes: [
                { percent: 0, scaleY: 0.3, style: { fill: '#ef4444' } },
                { percent: 0.5, scaleY: 0.3, style: { fill: '#3b82f6' } },
                { percent: 1, scaleY: 1, style: { fill: '#10b981' } }
              ]
            },
            x: -5
          }, {
            type: 'rect',
            shape: { width: 4, height: 20 },
            style: { fill: '#3b82f6' },
            keyframeAnimation: {
              duration: 1000,
              loop: true,
              keyframes: [
                { percent: 0, scaleY: 1, style: { fill: '#10b981' } },
                { percent: 0.5, scaleY: 0.3, style: { fill: '#ef4444' } },
                { percent: 1, scaleY: 0.3, style: { fill: '#3b82f6' } }
              ]
            },
            x: 0
          }, {
            type: 'rect',
            shape: { width: 4, height: 20 },
            style: { fill: '#3b82f6' },
            keyframeAnimation: {
              duration: 1000,
              loop: true,
              keyframes: [
                { percent: 0, scaleY: 0.3, style: { fill: '#ef4444' } },
                { percent: 0.5, scaleY: 1, style: { fill: '#10b981' } },
                { percent: 1, scaleY: 0.3, style: { fill: '#3b82f6' } }
              ]
            },
            x: 5
          }, {
            type: 'rect',
            shape: { width: 4, height: 20 },
            style: { fill: '#3b82f6' },
            keyframeAnimation: {
              duration: 1000,
              loop: true,
              keyframes: [
                { percent: 0, scaleY: 0.3, style: { fill: '#3b82f6' } },
                { percent: 0.5, scaleY: 0.3, style: { fill: '#ef4444' } },
                { percent: 1, scaleY: 1, style: { fill: '#10b981' } }
              ]
            },
            x: 10
          }]
        }]
      },
      xAxis: { 
        show: false,
        type: 'category',
        data: Array.from({length: 121}, (_, i) => `Month ${i}`)
      },
      yAxis: { 
        show: false,
        type: 'value'
      },
      grid: { show: false },
      series: [{
        name: 'Loading',
        data: Array.from({length: 121}, () => 0),
        type: 'line',
        lineStyle: { opacity: 0 },
        symbol: 'none',
        silent: true
      }]
    };
  };

  // Security check - only allow access to the owner
  if (!user || user.email !== 'srigi001@gmail.com') {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Access Denied
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>This page is only accessible to the portfolio owner.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">

      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">Real Portfolio</h1>
        <p className="text-gray-600 mb-4">
          Sync your actual portfolio from Google Sheets and view real performance data.
        </p>
      </div>

      {/* Google Sheets Sync Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Google Sheets Sync</h2>
        <p className="text-sm text-gray-600 mb-4">
          💾 All data is automatically saved to your profile and will persist across sessions. When you return, simply click "Sync from Google Sheets" to refresh with the latest data.
        </p>
        
        <div className="space-y-4">
          {/* Manual Google Sheets ID Input */}
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Google Sheets ID
              </label>
              <input
                type="text"
                value={googleSheetsId}
                onChange={(e) => saveGoogleSheetsId(e.target.value)}
                placeholder="Enter your Google Sheets ID (e.g., 1ABC123DEF456...)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {googleSheetsId && (
                <p className="mt-1 text-xs text-gray-500">
                  ✓ Saved to your profile
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={syncGoogleSheets}
              disabled={isSyncing || !googleSheetsId}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isSyncing ? '🔄 Syncing...' : '🔄 Sync from Google Sheets'}
            </button>

            <button
              onClick={() => {
                // Clear all localStorage items
                localStorage.removeItem(getUserKey('realPortfolioData'));
                localStorage.removeItem(getUserKey('assetSimulations'));
                localStorage.removeItem(getUserKey('cagrTypes'));
                localStorage.removeItem(getUserKey('selectedAssets'));
                localStorage.removeItem(getUserKey('allAssetSimulations'));
                localStorage.removeItem(getUserKey('monthlyDeposits'));
                localStorage.removeItem(getUserKey('oneTimeDeposits'));
                localStorage.removeItem(getUserKey('googleSheetsId'));
                
                // Clear all state
                setRealPortfolioData(null);
                setAssetSimulations({});
                setCagrTypes({});
                setSelectedAssets({});
                setAllAssetSimulations({});
                setMonthlyDeposits({});
                setOneTimeDeposits({});
                setGoogleSheetsId('');
                setCombinedSimulation(null);
                
                // Verify cleanup
                console.log('🗑️ Cache cleared. Verifying one-time deposits:', {
                  localStorage: localStorage.getItem(getUserKey('oneTimeDeposits')),
                  stateWillBe: {}
                });
                
                setSyncStatus('✅ Cache cleared - All deposits and simulations removed');
              }}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              🗑️ Clear Cache
            </button>
          </div>

          {syncStatus && (
            <div className="p-3 bg-gray-100 rounded text-sm">
              {syncStatus}
            </div>
          )}
        </div>
      </div>

      {/* Real Portfolio Data Display */}
      {realPortfolioData && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Portfolio Overview</h2>
            
            {/* Currency Toggle */}
            <div className="flex items-center space-x-3">
              <label className="text-sm text-gray-700">Exchange Rate (USD to ₪):</label>
              <input
                type="number"
                value={exchangeRate || ''}
                onChange={(e) => handleExchangeRateChange(e.target.value)}
                placeholder="e.g., 3.5"
                step="0.01"
                min="0"
                className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex items-center space-x-2">
                <span className={`text-sm font-medium ${currency === 'USD' ? 'text-blue-600' : 'text-gray-400'}`}>$</span>
                <button
                  type="button"
                  onClick={() => {
                    const newCurrency = currency === 'USD' ? 'ILS' : 'USD';
                    handleCurrencyToggle(newCurrency);
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    currency === 'ILS' ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      currency === 'ILS' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className={`text-sm font-medium ${currency === 'ILS' ? 'text-blue-600' : 'text-gray-400'}`}>₪</span>
              </div>
            </div>
          </div>
          
          {currencyError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
              {currencyError}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded text-center">
              <div className="text-sm text-blue-600">Total Value ({currency === 'ILS' ? '₪' : 'USD'})</div>
              <div className="text-2xl font-bold">
                {formatCurrency(realPortfolioData.totalValue)}
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded text-center">
              <div className="text-sm text-green-600">Assets</div>
              <div className="text-2xl font-bold">{realPortfolioData.assets.length}</div>
            </div>
            <div className="bg-purple-50 p-4 rounded text-center">
              <div className="text-sm text-purple-600">Last Sync</div>
              <div className="text-sm font-medium">
                {new Date(realPortfolioData.lastSync).toLocaleString()}
              </div>
          </div>
        </div>

        {/* Combined Simulation Section */}
        {realPortfolioData && (
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4">Combined Portfolio Simulation</h2>
              
              {/* Asset Selection */}
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Select Assets for Simulation:</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {realPortfolioData.assets.map((asset, index) => (
                    <label key={index} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedAssets[asset.symbol] || false}
                        onChange={(e) => {
                          const newSelected = { ...selectedAssets };
                          newSelected[asset.symbol] = e.target.checked;
                          updateSelectedAssets(newSelected);
                          // useEffect will automatically update combined simulation
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 flex items-center space-x-2">
                        <span>{asset.symbol} ({formatCurrency(asset.currentValue)} - {cagrTypes[asset.symbol] || '5Y'})</span>
                        {reSimulatingAssets.has(asset.symbol) && (
                          <span className="text-xs text-blue-600 flex items-center">
                            <svg className="animate-spin h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Simulating...
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Selected Value Display */}
              <div className="mb-4">
                <div className="text-sm text-gray-600">
                  Total Selected Value: {formatCurrency(Object.keys(selectedAssets)
                    .filter(symbol => selectedAssets[symbol])
                    .reduce((sum, symbol) => {
                      const asset = realPortfolioData.assets.find(a => a.symbol === symbol);
                      return sum + (asset?.currentValue || 0);
                    }, 0))}
                </div>
              </div>

              {/* Combined Simulation Chart */}
              <div className="mt-6">
                {isSimulatingAll ? (
                  <div className="relative">
                    <ReactECharts
                      option={getLoadingChartOption()}
                      style={{ height: '400px' }}
                    />
                  </div>
                ) : combinedSimulation ? (
                  <ReactECharts
                    option={getCombinedSimulationOption()}
                    style={{ height: '400px' }}
                  />
                ) : (
                  <div className="h-96 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <div className="text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">Select assets to view simulation</h3>
                      <p className="mt-1 text-sm text-gray-500">Choose one or more assets from the checkboxes above</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Assets Table */}
          <div className="space-y-6">
            {realPortfolioData.assets.map((asset, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
                {/* Asset Header */}
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-lg font-semibold text-gray-900">{asset.symbol}</div>
                      <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {formatCurrency(asset.currentPrice || 0)}
                      </span>
                      <div className="text-sm text-gray-600">
                        Total Shares: {asset.totalShares.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600">
                        Total Invested: {formatCurrency(asset.totalInvested)}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div>
                        <div className="text-sm text-gray-500 flex items-center space-x-2">
                          <span>CAGR Type</span>
                          {reSimulatingAssets.has(asset.symbol) && (
                            <span className="text-xs text-blue-600 flex items-center">
                              <svg className="animate-spin h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Simulating...
                            </span>
                          )}
                        </div>
                        <select
                          value={cagrTypes[asset.symbol] || '5Y'}
                          onChange={(e) => {
                            const newCagrType = e.target.value;
                            updateCagrTypes({
                              ...cagrTypes,
                              [asset.symbol]: newCagrType
                            });
                            // Trigger re-simulation with new CAGR type
                            const currentMonthlyDeposits = monthlyDeposits[asset.symbol] || [];
                            const currentOneTimeDeposit = oneTimeDeposits[asset.symbol] || null;
                            reSimulateAsset(asset, newCagrType, currentMonthlyDeposits, currentOneTimeDeposit);
                          }}
                          disabled={reSimulatingAssets.has(asset.symbol)}
                          className="text-sm border border-gray-300 rounded px-2 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="5Y">5Y ({((asset.cagr5Y || 0) * 100).toFixed(2)}%)</option>
                          <option value="10Y">10Y ({((asset.cagr10Y || 0) * 100).toFixed(2)}%)</option>
                          <option value="Blended">Blended ({((asset.cagrBlended || 0) * 100).toFixed(2)}%)</option>
                        </select>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Simulation Deposit</div>
                        <div className="text-sm font-medium text-green-600">
                          ${asset.currentValue.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* One-Time Deposit Section */}
                <OneTimeDepositInput
                  key={`one-time-${asset.symbol}-${oneTimeDeposits[asset.symbol]?.date || 'none'}`}
                  asset={asset}
                  oneTimeDeposit={oneTimeDeposits[asset.symbol] || null}
                  onSet={(deposit) => {
                    updateOneTimeDeposits({
                      ...oneTimeDeposits,
                      [asset.symbol]: deposit
                    });
                    // Trigger re-simulation with updated deposit
                    const currentCagrType = cagrTypes[asset.symbol] || '5Y';
                    const currentMonthlyDeposits = monthlyDeposits[asset.symbol] || [];
                    reSimulateAsset(asset, currentCagrType, currentMonthlyDeposits, deposit);
                  }}
                  onRemove={() => {
                    const updated = { ...oneTimeDeposits };
                    delete updated[asset.symbol];
                    updateOneTimeDeposits(updated);
                    // Trigger re-simulation without the deposit
                    const currentCagrType = cagrTypes[asset.symbol] || '5Y';
                    const currentMonthlyDeposits = monthlyDeposits[asset.symbol] || [];
                    reSimulateAsset(asset, currentCagrType, currentMonthlyDeposits, null);
                  }}
                />

                {/* Monthly Deposits Section */}
                <MonthlyDepositInput 
                  key={`monthly-${asset.symbol}-${(monthlyDeposits[asset.symbol] || []).length}`}
                  asset={asset}
                  monthlyDeposits={monthlyDeposits[asset.symbol] || []}
                  formatCurrency={formatCurrency}
                  onAdd={(deposit) => {
                    const currentDeposits = monthlyDeposits[asset.symbol] || [];
                    const updatedDeposits = [...currentDeposits, deposit];
                    updateMonthlyDeposits({
                      ...monthlyDeposits,
                      [asset.symbol]: updatedDeposits
                    });
                    // Trigger re-simulation with updated deposits
                    const currentCagrType = cagrTypes[asset.symbol] || '5Y';
                    const currentOneTimeDeposit = oneTimeDeposits[asset.symbol] || null;
                    reSimulateAsset(asset, currentCagrType, updatedDeposits, currentOneTimeDeposit);
                  }}
                  onRemove={(depositId) => {
                    const currentDeposits = monthlyDeposits[asset.symbol] || [];
                    const updatedDeposits = currentDeposits.filter(d => d.id !== depositId);
                    const updated = { ...monthlyDeposits };
                    if (updatedDeposits.length > 0) {
                      updated[asset.symbol] = updatedDeposits;
                    } else {
                      // Explicitly delete the key instead of setting to undefined
                      delete updated[asset.symbol];
                    }
                    updateMonthlyDeposits(updated);
                    // Trigger re-simulation with updated deposits
                    const currentCagrType = cagrTypes[asset.symbol] || '5Y';
                    const currentOneTimeDeposit = oneTimeDeposits[asset.symbol] || null;
                    reSimulateAsset(asset, currentCagrType, updatedDeposits.length > 0 ? updatedDeposits : [], currentOneTimeDeposit);
                  }}
                />

                {/* Purchase History Table */}
                <div className="p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Purchase History</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Shares</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Purchase Price $</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">% Change</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">$ Yield</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {asset.purchases.map((purchase, pIndex) => {
                          // Calculate percentage change and dollar yield using actual current price from price history
                          const currentPrice = asset.currentPrice || 0; // This should be the last price from 10Y data
                          
                          // Calculate performance metrics
                          
                          const priceChange = ((currentPrice - purchase.priceUSD) / purchase.priceUSD) * 100;
                          const dollarYield = (currentPrice - purchase.priceUSD) * purchase.shares;
                          const isPositive = priceChange >= 0;
                          
                          return (
                            <tr key={pIndex}>
                              <td className="px-3 py-2 text-sm text-gray-900">{purchase.date}</td>
                              <td className="px-3 py-2 text-sm text-gray-500">{purchase.shares.toLocaleString()}</td>
                              <td className="px-3 py-2 text-sm text-gray-500">{formatCurrency(purchase.priceUSD)}</td>
                              <td className={`px-3 py-2 text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                              </td>
                              <td className={`px-3 py-2 text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                {dollarYield >= 0 ? '+' : ''}{formatCurrency(dollarYield)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      {!realPortfolioData && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">
            Get Started
          </h3>
          <p className="text-yellow-700">
            Click "Sync from Google Sheets" to load your real portfolio data. 
            This will fetch your actual holdings and current market data.
          </p>
        </div>
      )}
    </div>
  );
} 