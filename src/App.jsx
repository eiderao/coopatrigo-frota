import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import CondutorHome from './pages/CondutorHome';

const GestorHome = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold text-gray-800">Painel do Gestor</h1>
    <p className="text-gray-500 mt-2">Gráficos e controles administrativos.</p>
  </div>
);

const PrivateRoute = ({ children }) => {
  const { user, profile, signOut } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center sticky top-0 z-10 border-b border-gray-100">
        <div className="font-bold text-brand-600 text-xl tracking-tight">FrotaApp</div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-sm text-gray-800 font-semibold hidden sm:block leading-tight">
              {profile?.name || user.email}
            </span>
            <span className="text-xs text-gray-500 capitalize hidden sm:block">
              {profile?.role}
            </span>
          </div>
          <button onClick={signOut} className="text-sm bg-red-50 text-red-600 px-3 py-1.5 rounded-md hover:bg-red-100 font-medium transition">
            Sair
          </button>
        </div>
      </header>
      <main className="flex-1 w-full mx-auto relative">
        {children}
      </main>
    </div>
  );
};

const DashboardRouter = () => {
  const { profile } = useAuth();
  if (profile?.role === 'gestor' || profile?.role === 'Administrador') return <GestorHome />;
  if (profile?.role === 'condutor' || profile?.role === 'Avaliador' || profile?.role === 'recruiter') return <CondutorHome />;
  return (
    <div className="p-6 text-center text-amber-600 font-medium bg-amber-50 rounded-lg m-6 border border-amber-200">
      Aguardando configuração de perfil... Seu cargo é: {profile?.role || 'Indefinido'}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard/*" element={<PrivateRoute><DashboardRouter /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}