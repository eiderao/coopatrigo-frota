import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Mocks Temporários das Telas
const Login = () => {
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" replace />;
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="p-8 bg-white rounded-xl shadow-lg w-full max-w-md text-center border border-gray-100">
        <h1 className="text-3xl font-bold text-brand-600 mb-2">FrotaApp</h1>
        <p className="text-gray-500 mb-8">Gestão inteligente de frotas</p>
        <button className="w-full bg-brand-600 text-white py-3 rounded-lg font-medium hover:bg-brand-700 transition duration-200 shadow-md">
          Acessar Sistema
        </button>
      </div>
    </div>
  );
};

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

const DashboardRouter = () => {
  const { profile } = useAuth();
  
  if (profile?.role === 'gestor' || profile?.role === 'Administrador') return <GestorHome />;
  if (profile?.role === 'condutor' || profile?.role === 'Avaliador') return <CondutorHome />;
  
  return (
    <div className="p-6 text-center text-amber-600 font-medium bg-amber-50 rounded-lg m-6">
      Aguardando configuração de perfil...
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