import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, AlertTriangle } from 'lucide-react';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(''); // Estado para capturar erros críticos

  useEffect(() => {
    let isMounted = true;

    // 🔴 Trava de Segurança: Se demorar mais de 10s, quebra o loading infinito
    const safetyTimeout = setTimeout(() => {
      if (isMounted && loading) {
        setLoading(false);
        setErrorMsg('O servidor demorou muito para responder. Verifique sua conexão com a internet ou as variáveis do Supabase no Vercel.');
      }
    }, 10000);

    const fetchProfile = async (userId) => {
      try {
        const { data, error } = await supabase.from('user_profiles').select('*').eq('id', userId).single();
        if (error) throw error;
        return data;
      } catch (err) {
        console.error("Exceção ao buscar perfil:", err);
        return null;
      }
    };

    const initializeAuth = async () => {
      try {
        // Validação estrita das chaves no Vercel
        if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
          throw new Error("Variáveis de ambiente do Supabase (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY) não foram encontradas no Vercel.");
        }

        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session?.user) {
          if (isMounted) setUser(session.user);
          const userProfile = await fetchProfile(session.user.id);
          if (isMounted) setProfile(userProfile);
        }
      } catch (err) {
        console.error("Erro Inicialização Auth:", err);
        if (isMounted) setErrorMsg(err.message);
      } finally {
        clearTimeout(safetyTimeout);
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();

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
      clearTimeout(safetyTimeout);
      if (authListener?.subscription) authListener.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
  };

  // 🔴 ESTADO DE ERRO CRÍTICO (Substitui o loading infinito)
  if (errorMsg) {
    return (
      <div className="min-h-screen bg-red-50 flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-red-800 mb-2">Erro de Conexão</h2>
        <p className="text-red-600 mb-6 max-w-md">{errorMsg}</p>
        <button onClick={() => window.location.reload(true)} className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700">
          Recarregar App
        </button>
      </div>
    );
  }

  // ESTADO DE LOADING NORMAL
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