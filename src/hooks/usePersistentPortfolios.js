import { useState, useEffect } from 'react';

export function usePersistentPortfolios() {
  const [portfolios, setPortfolios] = useState(() => {
    const saved = localStorage.getItem('portfolios');
    return saved
      ? JSON.parse(saved)
      : [{ id: 'summary', name: 'Summary', fixed: true }];
  });

  const [selectedId, setSelectedId] = useState(() => {
    return localStorage.getItem('selectedPortfolio') || 'summary';
  });

  useEffect(() => {
    localStorage.setItem('portfolios', JSON.stringify(portfolios));
  }, [portfolios]);

  useEffect(() => {
    localStorage.setItem('selectedPortfolio', selectedId);
  }, [selectedId]);

  const addPortfolio = () => {
    const newId = `portfolio-${Date.now()}`;
    const newPortfolio = {
      id: newId,
      name: `New Portfolio ${portfolios.length}`,
    };
    setPortfolios([...portfolios, newPortfolio]);
    setSelectedId(newId);
  };

  const removePortfolio = (id) => {
    if (id === 'summary') return;
    const updated = portfolios.filter((p) => p.id !== id);
    setPortfolios(updated);
    setSelectedId('summary');
  };

  return {
    portfolios,
    selectedId,
    setSelectedId,
    addPortfolio,
    removePortfolio,
  };
}
