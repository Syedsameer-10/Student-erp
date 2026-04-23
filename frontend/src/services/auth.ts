import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  standard?: string;
  class?: string;
  section?: string;
  standards?: string[];
  classes?: string[];
  subject?: string;
  subjects?: string[];
}

interface ProfileRow {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  standard: string | null;
  class_name: string | null;
  section: string | null;
  standards: string[] | null;
  classes: string[] | null;
  subject: string | null;
  subjects: string[] | null;
}

const assertSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.');
  }

  return supabase;
};

const mapProfileToUser = (session: Session, profile: ProfileRow | null): AuthenticatedUser => ({
  id: session.user.id,
  name: profile?.name || session.user.user_metadata?.name || session.user.email || 'User',
  email: profile?.email || session.user.email || '',
  role: profile?.role || session.user.user_metadata?.role || 'Student',
  standard: profile?.standard || undefined,
  class: profile?.class_name || undefined,
  section: profile?.section || undefined,
  standards: profile?.standards || undefined,
  classes: profile?.classes || undefined,
  subject: profile?.subject || profile?.subjects?.[0] || undefined,
  subjects: profile?.subjects || (profile?.subject ? [profile.subject] : undefined),
});

const getSessionProfile = async (session: Session): Promise<AuthenticatedUser> => {
  const client = assertSupabase();
  const { data, error } = await client
    .from('profiles')
    .select('id, name, email, role, standard, class_name, section, standards, classes, subject, subjects')
    .eq('id', session.user.id)
    .maybeSingle<ProfileRow>();

  if (error) {
    throw error;
  }

  return mapProfileToUser(session, data);
};

export const initializeSupabaseAuth = async (): Promise<AuthenticatedUser | null> => {
  if (!supabase) {
    return null;
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  if (!session) {
    return null;
  }

  return getSessionProfile(session);
};

export const loginWithSupabase = async (email: string, password: string): Promise<AuthenticatedUser> => {
  const client = assertSupabase();
  const { data, error } = await client.auth.signInWithPassword({ email, password });

  if (error) {
    throw error;
  }

  if (!data.session) {
    throw new Error('No active Supabase session was returned.');
  }

  return getSessionProfile(data.session);
};

export const logoutFromSupabase = async () => {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
};
