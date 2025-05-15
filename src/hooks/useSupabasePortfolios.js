import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

export function useSupabasePortfolios(user) {
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchPortfolios();
  }, [user]);

  const fetchPortfolios = async () => {
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
    fetchPortfolios();
  };

  const deletePortfolio = async (id) => {
    await supabase.from('portfolios').delete().eq('id', id);
    fetchPortfolios();
  };

  return { portfolios, savePortfolio, deletePortfolio, loading };
}
