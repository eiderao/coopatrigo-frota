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

    const recoverSession = async () => {
      try {
        // 1. Tenta buscar a sessão atual
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        // Se houver erro de token corrompido, joga para o catch imediatamente
        if (sessionError) throw sessionError;

        if (session?.user) {
          if (isMounted) setUser(session.user);
          
          // 2. Busca o perfil do usuário
          const { data: userProfile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profileError && profileError.code !== 'PGRST116') {
            console.error("Erro ao buscar perfil:", profileError);
          }
          
          if (isMounted && userProfile) setProfile(userProfile);
        }
      } catch (err) {
        // SOLUÇÃO ELEGANTE: Tratamento silencioso de cache/sessão inválida
        console.warn("Sessão corrompida ou expirada. Limpando ambiente silenciosamente...", err);
        
        // Força a limpeza do Supabase e do navegador sem assustar o usuário
        await supabase.auth.signOut();
        
        if (isMounted) {
          setUser(null);
          setProfile(null);
        }
      } finally {
        // Independentemente do que aconteça, libera a tela de loading
        if (isMounted) setLoading(false);
      }
    };

    recoverSession();

    // Listener para gerenciar login/logout em tempo real e expiração de abas
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setUser(session?.user || null);
        if (session?.user) {
          const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          setProfile(userProfile);
        }
        setLoading(false);
      } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
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