import { useState } from 'react';
import { useSupabaseUser } from './hooks/useSupabaseUser';
import { useSupabasePortfolios } from './hooks/useSupabasePortfolios';
import { USE_GOOGLE_AUTH } from './utils/config';
import PortfolioPage from './components/PortfolioPage';
import SummaryPage from './components/SummaryPage';
import { Button } from './components/ui/Button';
import AuthWrapper from './components/AuthWrapper';

export default function App() {
  const { user } = useSupabaseUser();
  const {
    portfolios,
    savePortfolio,
    deletePortfolio,
    loading: portfoliosLoading,
  } = useSupabasePortfolios(USE_GOOGLE_AUTH ? user : { id: 'local-user' });

  const [selectedId, setSelectedId] = useState('summary');

  if (portfoliosLoading)
    return (
      <div className="flex items-center justify-center h-screen">
        Loading portfolios...
      </div>
    );

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