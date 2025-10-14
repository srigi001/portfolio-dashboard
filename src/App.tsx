import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import SummaryPage from './components/SummaryPage';
import PortfolioPage from './components/PortfolioPage';
import RealPortfolioPage from './components/RealPortfolioPage';
import AccessDeniedPage from './components/AccessDeniedPage';
import { Button } from './components/ui/Button';
import { useLocalPortfolios } from './hooks/useLocalPortfolios';
import { useSupabaseUser } from './hooks/useSupabaseUser';
import { useSupabasePortfolios } from './hooks/useSupabasePortfolios';
import { supabase } from './utils/supabaseClient';
import { USE_GOOGLE_AUTH, API_BASE_URL } from './utils/config';
import { fetchPortfolioData } from './utils/googleSheets';
import { fetchAssetData } from './utils/calcMetrics';

export default function App() {
  // Google Sheets configuration - Manual input for security
  const [googleSheetsId, setGoogleSheetsId] = useState(() => {
    return sessionStorage.getItem('googleSheetsId') || '';
  });
  const GOOGLE_SHEETS_RANGE = 'Universal!H:M';
  // Choose between local‐storage hook vs. Supabase hook
  const localHook = useLocalPortfolios();
  const { user, loading: userLoading } = useSupabaseUser();
  const sbHook = useSupabasePortfolios(user);

  // Depending on the flag, pick the correct hook
  const hook = USE_GOOGLE_AUTH ? sbHook : localHook;
  const { portfolios, savePortfolio, deletePortfolio, reorderPortfolios, loading } = hook;

  // Initialize selectedId from localStorage
  const [selectedId, setSelectedId] = useState(() => {
    return localStorage.getItem('selectedPortfolioId') || 'summary';
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Persist selectedId to localStorage
  useEffect(() => {
    localStorage.setItem('selectedPortfolioId', selectedId);
  }, [selectedId]);

  // Automatic Google Sheets sync function
  const syncGoogleSheets = async () => {
    if (isSyncing) return; // Prevent multiple simultaneous syncs
    
    setIsSyncing(true);
    console.log('🔄 Starting automatic Google Sheets sync...');
    console.log('📊 Current portfolios before sync:', portfolios.length);
    portfolios.forEach((p, i) => console.log(`  ${i}: ${p.name} (${p.id})`));
    
    try {
      // Fetch latest data from Google Sheets
      if (!googleSheetsId) {
        throw new Error('Please enter your Google Sheets ID first');
      }
      const assets = await fetchPortfolioData(googleSheetsId, GOOGLE_SHEETS_RANGE);
      console.log('📊 Fetched assets from Google Sheets:', assets.length);
      
      // Fetch real CAGR/volatility data for each asset
      const assetsWithData = await Promise.all(
        assets.map(async (asset) => {
          try {
            console.log(`🔍 Fetching data for ${asset.symbol}...`);
            const assetData = await fetchAssetData(asset.symbol);
            console.log(`📊 ${asset.symbol}: CAGR5Y=${assetData.cagr5Y}, Vol5Y=${assetData.volatility5Y}`);
            console.log(`📊 ${asset.symbol} full data:`, assetData);
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

      // Convert to portfolio format
      const { convertToPortfolioFormat } = await import('./utils/csvParser');
      const portfolioData = convertToPortfolioFormat(assetsWithData);
      
      // Check if we have an existing imported portfolio
      const existingPortfolio = portfolios.find(p => p.name === 'Imported Portfolio');
      console.log('🔍 Existing imported portfolio:', existingPortfolio ? existingPortfolio.id : 'NOT FOUND');
      
      if (existingPortfolio) {
        // Update existing portfolio
        console.log('🔄 Updating existing portfolio...');
        console.log('📝 Original portfolio:', existingPortfolio);
        const updatedPortfolio = {
          ...existingPortfolio,
          allocations: portfolioData.allocations,
          simulationResult: null, // Clear simulation to force re-run
        };
        console.log('📝 Updated portfolio:', updatedPortfolio);
        console.log('💾 About to save portfolio with ID:', updatedPortfolio.id);
        savePortfolio(updatedPortfolio);
        console.log('✅ Portfolio updated successfully');
      } else {
        // Create new portfolio
        console.log('🆕 Creating new portfolio...');
        const id = 'portfolio-' + Date.now();
        const newPortfolio = {
          id,
          name: 'Imported Portfolio',
          allocations: portfolioData.allocations,
          oneTimeDeposits: [],
          monthlyChanges: [],
          simulationResult: null,
          order: portfolios.length,
          isPension: false,
        };
        console.log('📝 New portfolio:', newPortfolio);
        savePortfolio(newPortfolio);
        setSelectedId(id);
        console.log('✅ New portfolio created successfully');
      }
      
      setLastSyncTime(new Date());
      console.log('✅ Google Sheets sync completed successfully');
      
    } catch (error) {
      console.error('❌ Google Sheets sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Safe test sync function for debugging
  const testSync = async () => {
    console.log('🧪 TEST SYNC: Starting safe test...');
    console.log('📊 Current portfolios:', portfolios.length);
    portfolios.forEach((p, i) => console.log(`  ${i}: ${p.name} (${p.id})`));
    
    // Only create a new portfolio, don't update existing ones
    try {
      if (!googleSheetsId) {
        throw new Error('Please enter your Google Sheets ID first');
      }
      const assets = await fetchPortfolioData(googleSheetsId, GOOGLE_SHEETS_RANGE);
      console.log('📊 Fetched assets:', assets.length);
      
      // Fetch real CAGR/volatility data for each asset
      const assetsWithData = await Promise.all(
        assets.map(async (asset) => {
          try {
            const assetData = await fetchAssetData(asset.symbol);
            console.log(`📊 ${asset.symbol}: CAGR5Y=${assetData.cagr5Y}, Vol5Y=${assetData.volatility5Y}`);
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
      
      const { convertToPortfolioFormat } = await import('./utils/csvParser');
      const portfolioData = convertToPortfolioFormat(assetsWithData);
      
      // Only create if no imported portfolio exists
      const existingPortfolio = portfolios.find(p => p.name === 'Imported Portfolio');
      if (!existingPortfolio) {
        console.log('🆕 Creating new portfolio (safe test)...');
        const id = 'portfolio-' + Date.now();
        const newPortfolio = {
          id,
          name: 'Imported Portfolio (Test)',
          allocations: portfolioData.allocations,
          oneTimeDeposits: [],
          monthlyChanges: [],
          simulationResult: null,
          order: portfolios.length,
          isPension: false,
        };
        console.log('📝 New portfolio:', newPortfolio);
        savePortfolio(newPortfolio);
        console.log('✅ Test portfolio created successfully');
      } else {
        console.log('⚠️ Imported portfolio already exists, skipping creation');
      }
    } catch (error) {
      console.error('❌ Test sync failed:', error);
    }
  };

  // Force update existing portfolio with new data
  const forceUpdatePortfolio = async () => {
    console.log('🔄 FORCE UPDATE: Updating existing portfolio with new data...');
    
    try {
      if (!googleSheetsId) {
        throw new Error('Please enter your Google Sheets ID first');
      }
      const assets = await fetchPortfolioData(googleSheetsId, GOOGLE_SHEETS_RANGE);
      console.log('📊 Fetched assets:', assets.length);
      
      // Process assets sequentially in an ordered queue
      const assetsWithData = [];
      for (const asset of assets) {
        try {
          console.log(`🔍 Fetching data for ${asset.symbol}...`);
          const assetData = await fetchAssetData(asset.symbol);
          console.log(`📊 ${asset.symbol}: CAGR5Y=${assetData.cagr5Y}, Vol5Y=${assetData.volatility5Y}`);
          console.log(`📊 ${asset.symbol} full data:`, assetData);
          
          assetsWithData.push({
            ...asset,
            cagr5Y: assetData.cagr5Y,
            cagr10Y: assetData.cagr10Y,
            cagrBlended: assetData.cagrBlended,
            volatility5Y: assetData.volatility5Y,
            volatility10Y: assetData.volatility10Y,
            volatilityBlended: assetData.volatilityBlended,
          });
          
          console.log(`✅ Completed ${asset.symbol}, moving to next asset...`);
        } catch (e) {
          console.warn(`Failed to fetch data for ${asset.symbol}:`, e);
          assetsWithData.push(asset);
        }
      }
      
      const { convertToPortfolioFormat } = await import('./utils/csvParser');
      const portfolioData = convertToPortfolioFormat(assetsWithData);
      
      // Find and update existing portfolio
      const existingPortfolio = portfolios.find(p => p.name === 'Imported Portfolio');
      if (existingPortfolio) {
        console.log('🔄 Updating existing portfolio...');
        const updatedPortfolio = {
          ...existingPortfolio,
          allocations: portfolioData.allocations,
          simulationResult: null, // Clear simulation to force re-run
        };
        console.log('📝 Updated portfolio allocations:', updatedPortfolio.allocations);
        savePortfolio(updatedPortfolio);
        console.log('✅ Portfolio updated successfully');
      } else {
        console.log('⚠️ No existing portfolio found to update');
      }
    } catch (error) {
      console.error('❌ Force update failed:', error);
    }
  };

  // Run sync on page load and every 5 minutes
  useEffect(() => {
    if (USE_GOOGLE_AUTH && user && !loading) {
      // TEMPORARILY DISABLED: Automatic sync to prevent data loss
      // syncGoogleSheets();
      
      // Set up periodic sync every 5 minutes
      // const interval = setInterval(syncGoogleSheets, 5 * 60 * 1000);
      
      // return () => clearInterval(interval);
    }
  }, [USE_GOOGLE_AUTH, user, loading]);

  // Handler: Add a new portfolio (default isPension: false)
  const handleAddPortfolio = () => {
    const id = 'portfolio-' + Date.now();
    const newP = {
      id,
      name: 'New Portfolio',
      allocations: [],
      oneTimeDeposits: [],
      monthlyChanges: [],
      simulationResult: null,
      order: portfolios.length,
      isPension: false,
    };
    savePortfolio(newP);
    setSelectedId(id);
  };

  // Handler: Delete a portfolio
  const handleDeletePortfolio = (id: string) => {
    deletePortfolio(id);
    if (selectedId === id) setSelectedId('summary');
  };

  // Handler: Duplicate (carry over isPension)
  const handleDuplicatePortfolio = (id: string) => {
    const orig = portfolios.find((p) => p.id === id);
    if (!orig) return;
    const copy = {
      ...orig,
      id: 'portfolio-' + Date.now(),
      name: `Copy of ${orig.name}`,
      order: portfolios.length,
      isPension: orig.isPension,
    };
    savePortfolio(copy);
    setSelectedId(copy.id);
  };

  // Handler: Rename portfolio
  const handleRenamePortfolio = (id: string, name: string) => {
    const p = portfolios.find((p) => p.id === id);
    if (!p) return;
    savePortfolio({ ...p, name });
  };

  // Handler: Reorder portfolios
  const handleReorder = (newList: typeof portfolios) => {
    // Re‐assign the `order` field based on the new array index
    const ordered = newList.map((p, idx) => ({ ...p, order: idx }));
    reorderPortfolios(ordered);
  };

  // Handler: Import portfolio from CSV
  const handleImportPortfolio = (importedData) => {
    console.log('🔄 Creating imported portfolio with data:', importedData);
    const id = 'portfolio-' + Date.now();
    
    // Fix allocations to handle NaN values
    const fixedAllocations = importedData.allocations.map(allocation => ({
      ...allocation,
      allocation: isNaN(allocation.allocation) ? 0 : allocation.allocation
    }));
    
    const newPortfolio = {
      id,
      name: 'Imported Portfolio',
      allocations: fixedAllocations,
      // Remove assets field since Supabase doesn't support it
      oneTimeDeposits: [],
      monthlyChanges: [],
      simulationResult: null,
      order: portfolios.length,
      isPension: false,
    };
    console.log('📦 New portfolio object:', newPortfolio);
    savePortfolio(newPortfolio);
    console.log('💾 Portfolio saved, setting selected ID to:', id);
    setSelectedId(id);
  };

  // While portfolios or user info are loading, show a spinner
  if (loading || (USE_GOOGLE_AUTH && userLoading)) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading portfolios...
      </div>
    );
  }

  // If using Google Auth but no user is signed in yet, show Sign In button
  if (USE_GOOGLE_AUTH && !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Button
          onClick={() => 
            supabase.auth.signInWithOAuth({
              provider: 'google',
              options: {
                redirectTo: API_BASE_URL,
                queryParams: {
                  redirect_to: API_BASE_URL
                }
              }
            })
          }
          variant="primary"
        >
          Sign In with Google
        </Button>
      </div>
    );
  }

  // Find the currently active portfolio (or null if "summary")
  const active = portfolios.find((p) => p.id === selectedId);

  return (
    <div className="flex flex-col h-screen md:flex-row">
      {/* Mobile hamburger button */}
      <div className="md:hidden flex items-center p-2 bg-gray-800 text-white">
        <button
          className="mr-2 p-2 focus:outline-none"
          onClick={() => setSidebarOpen((open) => !open)}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <span className="font-bold">Portfolio Dashboard</span>
      </div>

      {/* Sidebar: hidden on mobile unless toggled */}
      <div className={`z-20 md:static fixed inset-y-0 left-0 transition-transform duration-200 md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:block w-64 bg-gray-800`}>
        <Sidebar
          portfolios={portfolios}
          activeId={selectedId}
          onSelect={(id) => {
            setSelectedId(id);
            setSidebarOpen(false); // close sidebar on mobile after selection
          }}
          onRenamePortfolio={handleRenamePortfolio}
          onAddPortfolio={handleAddPortfolio}
          onDeletePortfolio={handleDeletePortfolio}
          onDuplicatePortfolio={handleDuplicatePortfolio}
          onReorder={handleReorder}
          onLogout={() => supabase.auth.signOut()}
          showLogout={USE_GOOGLE_AUTH && user}
          user={user}
        />
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-10 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="flex-1 overflow-auto p-2 md:p-6 bg-gray-100">
                   {selectedId === 'real-portfolio' ? (
             user?.email === 'srigi001@gmail.com' ? (
               <RealPortfolioPage
                 portfolio={active || { id: 'real-portfolio', name: 'Real Portfolio' }}
                 updatePortfolio={(updated) => {
                   if (active) {
                     savePortfolio({
                       ...updated,
                       order: active.order,
                       isPension: updated.isPension,
                     });
                   }
                 }}
                 user={user}
               />
             ) : (
               <AccessDeniedPage onRedirect={() => setSelectedId('summary')} />
             )
        ) : selectedId === 'summary' || !active ? (
          <SummaryPage 
            portfolios={portfolios} 
            onImportPortfolio={handleImportPortfolio}
          />
        ) : (
          <PortfolioPage
            portfolio={active}
            updatePortfolio={(updated) =>
              savePortfolio({
                ...updated,
                order: active.order,
                isPension: updated.isPension,
              })
            }
          />
        )}
      </main>
    </div>
  );
}