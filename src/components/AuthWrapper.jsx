import { useSupabaseUser } from '../hooks/useSupabaseUser';
import { supabase } from '../utils/supabaseClient';
import { USE_GOOGLE_AUTH, API_BASE_URL } from '../utils/config';

export default function AuthWrapper({ children }) {
  if (!USE_GOOGLE_AUTH) {
    // Bypass wrapper entirely if auth is disabled
    return children;
  }

  const { user, loading } = useSupabaseUser();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-lg text-gray-500">
        Checking session...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <button
          onClick={() =>
            supabase.auth.signInWithOAuth({
              provider: 'google',
              options: {
                redirectTo: API_BASE_URL,
                queryParams: {
                  redirect_to: API_BASE_URL
                }
              },
            })
          }
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Sign In with Google
        </button>
      </div>
    );
  }

  return children;
}