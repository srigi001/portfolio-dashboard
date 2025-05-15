import { useState, useEffect } from 'react';

export function useLocalPortfolios() {
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('portfolios');
    if (stored) setPortfolios(JSON.parse(stored));
    setLoading(false);
  }, []);

  const savePortfolio = async (portfolio) => {
    const updated = portfolios.find((p) => p.id === portfolio.id)
      ? portfolios.map((p) => (p.id === portfolio.id ? portfolio : p))
      : [...portfolios, portfolio];
    setPortfolios(updated);
    localStorage.setItem('portfolios', JSON.stringify(updated));
  };

  const deletePortfolio = async (id) => {
    const updated = portfolios.filter((p) => p.id !== id);
    setPortfolios(updated);
    localStorage.setItem('portfolios', JSON.stringify(updated));
  };

  return { portfolios, savePortfolio, deletePortfolio, loading };
}