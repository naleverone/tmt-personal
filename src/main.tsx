// main.tsx (o index.tsx) - Punto de entrada de tu aplicación
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App'; // Asegúrate que la ruta a App.tsx sea correcta
import { AuthProvider } from './AuthContext'; // Crearemos este archivo
import './index.css'; // O tu archivo principal de estilos

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider> {/* Envolvemos App con AuthProvider */}
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);