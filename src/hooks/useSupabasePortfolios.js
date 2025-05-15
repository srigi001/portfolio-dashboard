import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';

export function useSupabasePortfolios(user) {
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id === 'local') {
      const stored = localStorage.getItem('portfolios');
      if (stored) setPortfolios(JSON.parse(stored));
      setLoading(false);
    } else if (user) {
      fetchSupabasePortfolios();
    }
  }, [user]);

  const fetchSupabasePortfolios = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', user.id);

    if (error) console.error(error);
    else setPortfolios(data || []);
    setLoading(false);
  };

  const savePortfolio = async (portfolio) => {
    if (user?.id === 'local') {
      const updated = portfolios.find((p) => p.id === portfolio.id)
        ? portfolios.map((p) => (p.id === portfolio.id ? portfolio : p))
        : [...portfolios, portfolio];
      setPortfolios(updated);
      localStorage.setItem('portfolios', JSON.stringify(updated));
    } else {
      const existing = portfolios.find((p) => p.id === portfolio.id);
      if (existing) {
        await supabase
          .from('portfolios')
          .update(portfolio)
          .eq('id', portfolio.id);
      } else {
        await supabase
          .from('portfolios')
          .insert({ ...portfolio, user_id: user.id });
      }
      fetchSupabasePortfolios();
    }
  };

  const deletePortfolio = async (id) => {
    if (user?.id === 'local') {
      const updated = portfolios.filter((p) => p.id !== id);
      setPortfolios(updated);
      localStorage.setItem('portfolios', JSON.stringify(updated));
    } else {
      await supabase.from('portfolios').delete().eq('id', id);
      fetchSupabasePortfolios();
    }
  };

  return { portfolios, savePortfolio, deletePortfolio, loading };
}
