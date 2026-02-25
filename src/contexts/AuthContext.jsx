import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // 🔴 Botão de pânico para limpar tokens corrompidos do navegador
  const forceClearCache = async () => {
    localStorage.clear();
    sessionStorage.clear();
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  useEffect(() => {
    // Timeout de segurança contra loops infinitos
    const timer = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setErrorMsg('Tempo limite excedido ao conectar no banco de dados. Pode ser um erro de cache no seu navegador.');
      }
    }, 8000);

    const checkSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (session?.user) {
          setUser(session.user);
          
          // Busca o perfil
          const { data: userProfile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profileError && profileError.code !== 'PGRST116') throw profileError;
          setProfile(userProfile);
        }
      } catch (err) {
        console.error("Erro no Auth:", err);
      } finally {
        clearTimeout(timer);
        setLoading(false);
      }
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(timer);
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setLoading(false);
    window.location.href = '/';
  };

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-red-50 flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-red-800 mb-2">Ops, algo travou!</h2>
        <p className="text-red-600 mb-8 max-w-sm">{errorMsg}</p>
        
        <button 
          onClick={forceClearCache} 
          className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 shadow-md"
        >
          <RefreshCw className="w-5 h-5" />
          Limpar Cache e Resolver
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-50 flex flex-col items-center justify-center px-4 text-center">
        <Loader2 className="h-12 w-12 text-brand-600 animate-spin mb-4" />
        <p className="text-brand-900 font-medium animate-pulse">Sincronizando FrotaApp...</p>
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