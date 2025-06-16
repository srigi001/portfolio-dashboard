import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import SummaryPage from './components/SummaryPage';
import PortfolioPage from './components/PortfolioPage';
import { Button } from './components/ui/Button';
import { useLocalPortfolios } from './hooks/useLocalPortfolios';
import { useSupabaseUser } from './hooks/useSupabaseUser';
import { useSupabasePortfolios } from './hooks/useSupabasePortfolios';
import { supabase } from './utils/supabaseClient';
import { USE_GOOGLE_AUTH, API_BASE_URL } from './utils/config';

export default function App() {
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

  // Persist selectedId to localStorage
  useEffect(() => {
    localStorage.setItem('selectedPortfolioId', selectedId);
  }, [selectedId]);

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
        {USE_GOOGLE_AUTH && user && (
          <div className="absolute top-4 right-4 z-30">
            <Button
              onClick={() => supabase.auth.signOut()}
              variant="secondary"
            >
              Log Out
            </Button>
          </div>
        )}
        {selectedId === 'summary' || !active ? (
          <SummaryPage portfolios={portfolios} />
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