import { useState, useEffect } from 'react';

export function useLocalPortfolios() {
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(true);

  // On mount: load from localStorage and sort by `order`
  useEffect(() => {
    const stored = localStorage.getItem('portfolios');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const sorted = parsed.sort((a, b) => (a.order || 0) - (b.order || 0));
        setPortfolios(sorted);
      } catch (e) {
        console.error('Failed to parse portfolios from localStorage', e);
      }
    }
    setLoading(false);
  }, []);

  // Add or update a portfolio
  const savePortfolio = async (portfolio) => {
    const exists = portfolios.some((p) => p.id === portfolio.id);
    const updated = exists
      ? portfolios.map((p) => (p.id === portfolio.id ? portfolio : p))
      : [...portfolios, portfolio];
    const sorted = updated.sort((a, b) => (a.order || 0) - (b.order || 0));
    setPortfolios(sorted);
    localStorage.setItem('portfolios', JSON.stringify(sorted));
  };

  // Delete a portfolio
  const deletePortfolio = async (id) => {
    const filtered = portfolios.filter((p) => p.id !== id);
    const reindexed = filtered.map((p, idx) => ({ ...p, order: idx }));
    setPortfolios(reindexed);
    localStorage.setItem('portfolios', JSON.stringify(reindexed));
  };

  // Reorder entire list
  const reorderPortfolios = async (newOrder) => {
    setPortfolios(newOrder);
    localStorage.setItem('portfolios', JSON.stringify(newOrder));
  };

  return {
    portfolios,
    savePortfolio,
    deletePortfolio,
    reorderPortfolios,
    loading,
  };
}