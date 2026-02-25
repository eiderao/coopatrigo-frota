import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login'; // Importando a tela real

// Mocks Temporários dos Dashboards (Faremos isso a seguir)
const CondutorHome = () => (
  <div className="p-6 flex flex-col items-center justify-center h-full">
    <h1 className="text-2xl font-bold text-gray-800">Área do Condutor</h1>
    <p className="text-gray-500 mt-2 text-center max-w-xs">
      Em breve o leitor de QR Code de notas fiscais aparecerá aqui.
    </p>
  </div>
);

const GestorHome = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold text-gray-800">Painel do Gestor</h1>
    <p className="text-gray-500 mt-2">Gráficos e controles administrativos.</p>
  </div>
);

// Layout base e Proteção de Rota
const PrivateRoute = ({ children }) => {
  const { user, profile, signOut } = useAuth();

  if (!user) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center sticky top-0 z-10 border-b border-gray-100">
        <div className="font-bold text-brand-600 text-xl">FrotaApp</div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600 font-medium hidden sm:block">
            {profile?.name || user.email}
          </span>
          <button 
            onClick={signOut}
            className="text-sm text-red-600 hover:text-red-800 font-medium transition"
          >
            Sair
          </button>
        </div>
      </header>
      <main className="flex-1 w-full max-w-md md:max-w-4xl lg:max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  );
};

// Seletor de Dashboard Baseado na Role do banco de dados
const DashboardRouter = () => {
  const { profile } = useAuth();
  
  // Como usamos "gestor" e "condutor" no novo banco de dados:
  if (profile?.role === 'gestor') return <GestorHome />;
  if (profile?.role === 'condutor') return <CondutorHome />;
  
  // Regra de Ouro (Bypass de Segurança para seu e-mail) e Fallback do banco antigo
  if (profile?.is_admin_system || profile?.role === 'Administrador') return <GestorHome />;
  if (profile?.role === 'Avaliador') return <CondutorHome />;
  
  return (
    <div className="p-6 text-center text-amber-600 font-medium bg-amber-50 rounded-lg m-6">
      Aguardando configuração de perfil... Seu cargo atual é: {profile?.role || 'Não definido'}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route 
            path="/dashboard/*" 
            element={
              <PrivateRoute>
                <DashboardRouter />
              </PrivateRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
