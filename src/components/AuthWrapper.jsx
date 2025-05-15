import { useSupabaseUser } from '../hooks/useSupabaseUser';
import { supabase } from '../utils/supabaseClient';

export default function AuthWrapper({ children }) {
  const { user } = useSupabaseUser();

  if (user === undefined) {
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
                redirectTo: window.location.origin
              },
            })
          }
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Sign In with Google
        </button>
      </div>
    );
  }

  return children;
}