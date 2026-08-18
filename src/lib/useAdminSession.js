import { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';

/**
 * useAdminSession — tracks the current Supabase Auth session and whether it
 * belongs to an admin (appMetadata.role === 'admin').
 *
 * Simpler, purpose-built replacement for the dormant AuthContext/routeAccess
 * pattern in the sibling QuickCheck repo: this repo's auth model has none of
 * that pattern's Base44-era concepts (a separate "public settings" loading
 * phase, a distinct "unregistered user" error type) — it's just "is there a
 * session, and is it an admin," so a smaller purpose-built hook is clearer
 * than force-fitting the old shape.
 *
 * Role lives in appMetadata (service-role-writable only, set via the
 * Supabase dashboard or an admin API call) — never userMetadata, which a
 * user could self-edit via supabase.auth.updateUser().
 */
export function useAdminSession() {
  const [session, setSession] = useState(undefined); // undefined = not checked yet, null = no session
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session || null);
      setIsLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const isAuthenticated = !!session;
  const isAdmin = session?.user?.app_metadata?.role === 'admin';

  return { session, isLoading, isAuthenticated, isAdmin };
}
