import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';

type ResolvedSession = {
  session: Session | null;
  user: User | null;
};

/**
 * Fast, resilient session check.
 * 
 * getSession() reads from the LOCAL cache (localStorage) — it's instant and
 * never hits the network.  The session already contains the user object,
 * so there is NO need to call getUser() (which does a network roundtrip to
 * Supabase's /auth/v1/user endpoint and can hang on zombie TCP connections
 * or get rate-limited).
 *
 * Token refresh is handled automatically by the SDK when autoRefreshToken
 * is enabled; we don't need to verify the token ourselves here.
 */
export async function getValidatedSession(): Promise<ResolvedSession> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { session: null, user: null };
  }

  // The session object from getSession() already contains the user.
  // Trust it — the SDK refreshes the token automatically in the background.
  return { session, user: session.user };
}
