import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true; // Previne atualizações de estado se o componente desmontar

    const fetchProfile = async (userId) => {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (error) {
          console.error("Erro DB Perfil:", error.message);
          return null;
        }
        return data;
      } catch (err) {
        console.error("Exceção ao buscar perfil:", err);
        return null;
      }
    };

    const initializeAuth = async () => {
      try {
        // 1. Busca a sessão atual do navegador
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        // 2. Se tiver sessão, salva o usuário e busca o perfil
        if (session?.user) {
          if (isMounted) setUser(session.user);
          const userProfile = await fetchProfile(session.user.id);
          if (isMounted) setProfile(userProfile);
        }
      } catch (err) {
        console.error("Erro crítico na inicialização da sessão:", err);
      } finally {
        // 3. Independentemente de sucesso ou falha, remove a tela de loading
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();

    // 4. Escuta mudanças em tempo real (Ex: usuário logou ou deslogou agora)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          if (isMounted) setUser(session.user);
          const p = await fetchProfile(session.user.id);
          if (isMounted) {
            setProfile(p);
            setLoading(false);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        if (isMounted) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    // O loading será revertido para false pelo listener SIGNED_OUT logo acima
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-50 flex flex-col items-center justify-center px-4 text-center">
        <Loader2 className="h-12 w-12 text-brand-600 animate-spin mb-4" />
        <p className="text-brand-900 font-medium animate-pulse mb-2">Carregando FrotaApp...</p>
        <p className="text-sm text-brand-600/70">Sincronizando com o banco de dados</p>
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