// src/hooks/useSupabasePortfolios.js

import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { USE_GOOGLE_AUTH } from '../utils/config';

export function useSupabasePortfolios(user) {
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    if (user.id === 'local-user') {
      try {
        const stored = localStorage.getItem('portfolios');
        if (stored) {
          setPortfolios(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Error loading local portfolios:', error);
      }
      setLoading(false);
    } else {
      fetchSupabasePortfolios();
    }
  }, [user]);

  const fetchSupabasePortfolios = async () => {
    try {
      setIsFetching(true);
      const { data, error } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching portfolios:', error);
        setPortfolios([]);
      } else {
        setPortfolios(data || []);
      }
    } catch (error) {
      console.error('Error in fetchSupabasePortfolios:', error);
      setPortfolios([]);
    } finally {
      setIsFetching(false);
      setLoading(false);
    }
  };

  const savePortfolio = async (portfolio) => {
    if (user?.id === 'local-user') {
      try {
        const updated = portfolios.find((p) => p.id === portfolio.id)
          ? portfolios.map((p) => (p.id === portfolio.id ? portfolio : p))
          : [...portfolios, portfolio];
        setPortfolios(updated);
        localStorage.setItem('portfolios', JSON.stringify(updated));
      } catch (error) {
        console.error('Error saving local portfolio:', error);
      }
    } else {
      try {
        // Optimistically update the UI
        const updated = portfolios.find((p) => p.id === portfolio.id)
          ? portfolios.map((p) => (p.id === portfolio.id ? portfolio : p))
          : [...portfolios, portfolio];
        setPortfolios(updated);

        // Then update the backend
        const { error } = await supabase
          .from('portfolios')
          .upsert({ ...portfolio, user_id: user.id });

        if (error) {
          console.error('Error saving portfolio:', error);
          // Revert the optimistic update
          setPortfolios(portfolios);
          // Refresh from server
          fetchSupabasePortfolios();
        }
      } catch (error) {
        console.error('Error in savePortfolio:', error);
        // Revert the optimistic update
        setPortfolios(portfolios);
        // Refresh from server
        fetchSupabasePortfolios();
      }
    }
  };

  const deletePortfolio = async (id) => {
    if (user?.id === 'local-user') {
      try {
        const updated = portfolios.filter((p) => p.id !== id);
        setPortfolios(updated);
        localStorage.setItem('portfolios', JSON.stringify(updated));
      } catch (error) {
        console.error('Error deleting local portfolio:', error);
      }
    } else {
      try {
        // Optimistically update the UI
        setPortfolios(portfolios.filter((p) => p.id !== id));
        
        // Then update the backend
        const { error } = await supabase.from('portfolios').delete().eq('id', id);
        
        if (error) {
          console.error('Error deleting portfolio:', error);
          // Revert the optimistic update
          setPortfolios(portfolios);
          // Refresh from server
          fetchSupabasePortfolios();
        }
      } catch (error) {
        console.error('Error in deletePortfolio:', error);
        // Revert the optimistic update
        setPortfolios(portfolios);
        // Refresh from server
        fetchSupabasePortfolios();
      }
    }
  };

  const reorderPortfolios = async (newList) => {
    if (!USE_GOOGLE_AUTH || !user) return;
    
    try {
      setLoading(true);

      const toUpsert = newList.map((p, idx) => ({
        ...p,
        user_id: user.id,
        order: idx,
      }));

      // Upsert all rows in parallel
      const { error } = await supabase
        .from('portfolios')
        .upsert(toUpsert, { returning: 'minimal' });

      if (error) {
        console.error('Error reordering portfolios:', error);
        // Refresh from server
        fetchSupabasePortfolios();
      } else {
        // Immediately reflect the new order locally
        setPortfolios(
          toUpsert
            .map((p, idx) => ({ ...p, order: idx }))
            .sort((a, b) => (a.order || 0) - (b.order || 0))
        );
      }
    } catch (error) {
      console.error('Error in reorderPortfolios:', error);
      // Refresh from server
      fetchSupabasePortfolios();
    } finally {
      setLoading(false);
    }
  };

  return { portfolios, savePortfolio, deletePortfolio, reorderPortfolios, loading, isFetching };
}