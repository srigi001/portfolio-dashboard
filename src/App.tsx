import { useState } from 'react';
import { supabase } from './utils/supabaseClient';
import PortfolioPage from './components/PortfolioPage';
import SummaryPage from './components/SummaryPage';
import { Button } from './components/ui/Button';
import AuthWrapper from './components/AuthWrapper';
import { useLocalPortfolios } from './hooks/useLocalPortfolios'; // Separate clean hook

const USE_GOOGLE_AUTH = false; // Toggle this true/false ONLY

export default function App() {
  const [selectedId, setSelectedId] = useState('summary');

  // --- Google Sign-In Mode (DISABLED in your case) ---
  if (USE_GOOGLE_AUTH) {
    // Place the entire Google logic inside this block.
    // If false, NONE of this is even mounted.
    // Do not run the user hook outside this.
    return (
      <div className="flex items-center justify-center h-screen">
        <button
          onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Sign In with Google
        </button>
      </div>
    );
  }

  // --- Local Mode ---
  const { portfolios, savePortfolio, deletePortfolio, loading } =
    useLocalPortfolios();

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen">
        Loading portfolios...
      </div>
    );

  // Same as before...
  const handleAddPortfolio = async () => {
    const id = 'portfolio-' + Date.now();
    await savePortfolio({
      id,
      name: 'New Portfolio',
      allocations: [],
      oneTimeDeposits: [],
      monthlyChanges: [],
      simulationResult: null,
    });
    setSelectedId(id);
  };

  const handleDeletePortfolio = async (id) => {
    await deletePortfolio(id);
    if (selectedId === id) setSelectedId('summary');
  };

  const handleUpdatePortfolio = async (id, updatedData) => {
    const existing = portfolios.find((p) => p.id === id);
    if (existing) {
      await savePortfolio({ ...existing, ...updatedData });
    }
  };

  const selectedPortfolio = portfolios.find((p) => p.id === selectedId);

  return (
    <AuthWrapper>
      <div className="flex h-screen bg-gray-100">
        {/* Sidebar */}
        <div className="bg-slate-800 text-white flex flex-col w-64 p-2">
          <div
            onClick={() => setSelectedId('summary')}
            className={`p-3 rounded cursor-pointer ${
              selectedId === 'summary'
                ? 'bg-slate-700'
                : 'hover:bg-slate-700/50'
            }`}
          >
            Summary
          </div>
          <div className="flex-1 overflow-y-auto">
            {portfolios.map((p) => (
              <div key={p.id} className="flex items-center">
                <div
                  onClick={() => setSelectedId(p.id)}
                  className={`flex-1 p-3 rounded cursor-pointer ${
                    selectedId === p.id
                      ? 'bg-slate-700'
                      : 'hover:bg-slate-700/50'
                  }`}
                >
                  <input
                    className="bg-transparent border-none text-white w-full focus:outline-none placeholder-gray-400"
                    value={p.name}
                    onChange={(e) =>
                      handleUpdatePortfolio(p.id, { name: e.target.value })
                    }
                  />
                </div>
                <Button
                  onClick={() => handleDeletePortfolio(p.id)}
                  variant="danger"
                  className="ml-1"
                >
                  x
                </Button>
              </div>
            ))}
          </div>
          <Button onClick={handleAddPortfolio} className="w-full mt-2">
            + Add
          </Button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          <div className="flex-1 overflow-y-auto">
            {selectedId === 'summary' ? (
              <SummaryPage portfolios={portfolios} />
            ) : selectedPortfolio ? (
              <PortfolioPage
                portfolio={selectedPortfolio}
                updatePortfolio={(data) =>
                  handleUpdatePortfolio(selectedPortfolio.id, data)
                }
              />
            ) : (
              <div className="text-gray-500 p-8">
                Select a portfolio or add a new one.
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}
