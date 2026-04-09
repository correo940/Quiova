import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';

type ResolvedSession = {
  session: Session | null;
  user: User | null;
};

export async function getValidatedSession(): Promise<ResolvedSession> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { session: null, user: null };
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // If there's a network error (like waking up tab on mobile), error won't have a 4xx status.
  // We should NOT sign the user out just because they have no internet right now.
  const isAuthError = error && error.status && error.status >= 400 && error.status < 500;

  if (isAuthError || (!user && !error)) {
    // Only forcefully clear the local session if the server EXPLICITLY rejected the token (4xx)
    console.warn('getValidatedSession: Token explicitly rejected or user missing. Signing out.');
    await supabase.auth.signOut();
    return { session: null, user: null };
  }

  if (error) {
    // It's a network error, or rate limit, etc. DON'T nuke the auth. 
    // Fallback to the cached session user.
    console.warn('getValidatedSession: Network error falling back to cached session user.', error.message);
    return { session, user: session.user };
  }

  return { session, user };
}
