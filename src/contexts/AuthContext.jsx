import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = loading
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) { setProfile(null); return; }
    supabase.from('profiles').select('*').eq('id', session.user.id).single()
      .then(({ data }) => setProfile(data));

    const channel = supabase
      .channel(`profile-${session.user.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${session.user.id}` },
        (payload) => setProfile(payload.new))
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [session?.user?.id]);

  const sendOtp = (phone) => supabase.auth.signInWithOtp({ phone });
  const verifyOtp = (phone, token) => supabase.auth.verifyOtp({ phone, token, type: 'sms' });
  const signOut = () => supabase.auth.signOut();

  const needsOnboarding = !!profile && (!profile.full_name || !profile.gpay_number);

  return (
    <AuthContext.Provider value={{
      session, user: session?.user ?? null, profile, loading: session === undefined,
      sendOtp, verifyOtp, signOut, needsOnboarding
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
