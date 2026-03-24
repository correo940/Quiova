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

  if (error || !user) {
    await supabase.auth.signOut();
    return { session: null, user: null };
  }

  return { session, user };
}
