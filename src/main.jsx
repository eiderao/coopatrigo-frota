import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// 🔴 EXTERMINADOR NUCLEAR DE CACHE E SERVICE WORKERS ANTIGOS
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    let hasUnregistered = false;
    for (let registration of registrations) {
      registration.unregister();
      hasUnregistered = true;
    }
    
    // Se encontrou lixo antigo, limpa o Cache Storage e força o recarregamento
    if (hasUnregistered) {
      caches.keys().then((keyList) => {
        return Promise.all(keyList.map((key) => caches.delete(key)));
      }).then(() => {
        console.log("Caches limpos. Forçando recarregamento do Vercel...");
        window.location.reload(true);
      });
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);