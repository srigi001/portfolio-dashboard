// src/hooks/useSupabaseUser.js

import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { USE_GOOGLE_AUTH } from '../utils/config';

export function useSupabaseUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!USE_GOOGLE_AUTH) {
      setUser({ id: 'mock-user', email: 'mock@example.com' });
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
