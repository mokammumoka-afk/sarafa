import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = loading
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState(null);
  const retryTimer = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Fetches the profile row, retrying a few times. This matters because right
  // after a brand-new Google sign-in there's a small race: the `handle_new_user`
  // DB trigger needs a moment to insert the profiles row, and the client can ask
  // for it before it exists. Without a retry, that one missed read used to leave
  // `profile` stuck at null/undefined forever — which looked like "the profile
  // page doesn't load".
  const fetchProfile = useCallback(async (userId, attempt = 0) => {
    if (retryTimer.current) clearTimeout(retryTimer.current);
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();

    if (data) {
      setProfile(data);
      setProfileError(null);
      setProfileLoading(false);
      return;
    }

    if (attempt < 5) {
      retryTimer.current = setTimeout(() => fetchProfile(userId, attempt + 1), 600 * (attempt + 1));
      return;
    }

    setProfile(null);
    setProfileError(error?.message || 'لم يتم العثور على بيانات الحساب');
    setProfileLoading(false);
  }, []);

  useEffect(() => {
    if (!session?.user) { setProfile(null); setProfileLoading(false); setProfileError(null); return; }
    setProfileLoading(true);
    fetchProfile(session.user.id);

    const channel = supabase
      .channel(`profile-${session.user.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${session.user.id}` },
        (payload) => setProfile(payload.new))
      .subscribe();
    return () => { supabase.removeChannel(channel); if (retryTimer.current) clearTimeout(retryTimer.current); };
  }, [session?.user?.id, fetchProfile]);

  // Returns a promise so callers (e.g. Register.jsx) can await the fresh
  // profile before navigating, instead of racing the realtime UPDATE event.
  const refreshProfile = useCallback(() => {
    if (session?.user) { setProfileLoading(true); return fetchProfile(session.user.id); }
    return Promise.resolve();
  }, [session?.user, fetchProfile]);

  // Optimistically merges a patch into the local profile immediately — used
  // right after a successful write so `needsOnboarding` flips synchronously
  // instead of waiting on a network round-trip or the realtime channel. This
  // is what actually fixes "after registering nothing happens": without it,
  // navigate('/dashboard') used to fire while `profile` was still stale, so
  // MainLayout's needsOnboarding check bounced the user straight back to
  // /register.
  const patchProfileLocal = useCallback((patch) => {
    setProfile((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

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
      profileError, refreshProfile, patchProfileLocal,
      signInWithGoogle, signOut, needsOnboarding
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
