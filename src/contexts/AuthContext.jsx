import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = loading
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) { setProfile(null); setProfileLoading(false); return; }
    setProfileLoading(true);
    supabase.from('profiles').select('*').eq('id', session.user.id).single()
      .then(({ data }) => { setProfile(data); setProfileLoading(false); });

    const channel = supabase
      .channel(`profile-${session.user.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${session.user.id}` },
        (payload) => setProfile(payload.new))
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [session?.user?.id]);

  // Google OAuth — replaces the old phone/OTP flow entirely.
  const signInWithGoogle = () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    });

  const signOut = () => supabase.auth.signOut();

  // Onboarding now only needs full name + GPAY number — email comes from Google,
  // phone is optional and no longer part of the signup flow.
  const needsOnboarding = !!profile && (!profile.full_name || !profile.gpay_number);

  return (
    <AuthContext.Provider value={{
      session, user: session?.user ?? null, profile,
      loading: session === undefined || profileLoading,
      signInWithGoogle, signOut, needsOnboarding
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
