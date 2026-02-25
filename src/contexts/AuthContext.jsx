import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          await supabase.auth.signOut();
          return;
        }

        if (session?.user) {
          if (isMounted) setUser(session.user);
          const { data: p } = await supabase.from('user_profiles').select('*').eq('id', session.user.id).single();
          if (isMounted && p) setProfile(p);
        }
      } catch (err) {
        console.error("Erro auth:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initAuth();

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      if (session?.user) {
        setUser(session.user);
        const { data: p } = await supabase.from('user_profiles').select('*').eq('id', session.user.id).single();
        setProfile(p);
        setLoading(false);
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      if (listener?.subscription) listener.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-50 flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 text-brand-600 animate-spin mb-4" />
        <p className="text-brand-900 font-medium">Carregando...</p>
      </div>
    );
  }

  return <AuthContext.Provider value={{ user, profile, loading, signOut }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);