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

    // 🔴 TRAVA INQUEBRÁVEL: Após 4 segundos, a tela de loading é destruída à força.
    const safetyTimer = setTimeout(() => {
      if (isMounted && loading) {
        console.warn("Forçando destravamento da tela de Autenticação...");
        setLoading(false);
      }
    }, 4000);

    const initialize = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session?.user) {
          if (isMounted) setUser(session.user);
          
          const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (isMounted && userProfile) setProfile(userProfile);
        }
      } catch (err) {
        console.error("Erro na sessão recuperada:", err);
        // Limpa silenciosamente para não travar
        await supabase.auth.signOut();
      } finally {
        if (isMounted) setLoading(false);
        clearTimeout(safetyTimer);
      }
    };

    initialize();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setUser(session?.user || null);
        if (session?.user) {
          const { data: userProfile } = await supabase.from('user_profiles').select('*').eq('id', session.user.id).single();
          setProfile(userProfile);
        }
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      if (authListener?.subscription) authListener.subscription.unsubscribe();
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
      <div className="min-h-screen bg-brand-50 flex flex-col items-center justify-center px-4 text-center">
        <Loader2 className="h-12 w-12 text-brand-600 animate-spin mb-4" />
        <p className="text-brand-900 font-medium animate-pulse">Autenticando...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);