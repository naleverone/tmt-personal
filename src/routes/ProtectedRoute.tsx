// src/routes/ProtectedRoute.tsx
import React from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext'; // Ajusta la ruta si AuthContext está en otro nivel

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { currentUser, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Cargando...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
