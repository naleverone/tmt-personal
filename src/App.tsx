// src/App.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import supabase from './config/supabaseClient';

// Import components
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import LoginPage from './pages/LoginPage';
import RegisterPage from './RegisterPage';
import TaskList from './pages/TaskList';
import CreateTask from './pages/CreateTask';
import TaskDetail from './pages/TaskDetail';
import StoreOverviewPage from './pages/StoreOverviewPage';
import AdminPanel from './pages/AdminPanel';
import UsersPanel from './pages/admin/UsersPanel';
import StoresPanel from './pages/admin/StoresPanel';
import ProtectedRoute from './routes/ProtectedRoute';
import AnnouncementsList from './pages/AnnouncementsList';

function App() {
  const { currentUser, isLoading } = useAuth();
  const [sessionExpired, setSessionExpired] = React.useState(false);

  React.useEffect(() => {
    console.log('[App] isLoading:', isLoading, '| currentUser:', currentUser);
    if (!isLoading && !currentUser) {
      setSessionExpired(true);
    } else {
      setSessionExpired(false);
    }
  }, [isLoading, currentUser]);

  // Refrescar la sesión cuando la ventana gana foco o la pestaña se vuelve visible
  React.useEffect(() => {
    const refreshSession = async () => {
      console.log('[App] Refrescando sesión de Supabase...');
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('[App] getSession() result:', session);
        if (!session) {
          setSessionExpired(true);
        }
      } catch (e) {
        console.error('[App] Error al refrescar sesión:', e);
        setSessionExpired(true);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshSession();
      }
    };

    window.addEventListener('focus', refreshSession);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('focus', refreshSession);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Show loading spinner while checking auth state
  if (isLoading) {
    return (
      <>
        <div className="flex justify-center items-center min-h-screen"></div>
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
      </>
    );
  }

  // Ocultar mensaje de sesión expirada en login y register
  const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/register';

  // Si no hay usuario y estamos en login o register, mostrar solo la página correspondiente
  if (!currentUser && isAuthPage) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        {window.location.pathname === '/login' ? <LoginPage /> : <RegisterPage />}
      </div>
    );
  }

  // Si no hay usuario y no es login/register, mostrar login por defecto
  if (!currentUser && !isAuthPage) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <LoginPage />
      </div>
    );
  }

  // Detectar si estamos en login o register
  const isLoginPage = window.location.pathname === '/login';
  const isRegisterPage = window.location.pathname === '/register';
  if (isLoginPage) {
    return <LoginPage />;
  }
  if (isRegisterPage) {
    return <RegisterPage />;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {currentUser && <Sidebar />}
      <div className={`flex-1 ${currentUser ? 'ml-0' : ''}`}>
        {sessionExpired && !isAuthPage && (
          <div className="fixed top-0 left-0 w-full z-50 bg-red-100 text-red-700 text-center py-3 font-semibold shadow flex flex-col items-center">
            <span>Sesión expirada. Por favor, vuelve a iniciar sesión.</span>
            <a
              href="/login"
              className="mt-2 inline-block px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition font-normal text-base shadow"
            >
              Ir al Login
            </a>
          </div>
        )}
        <Routes>
          {/* Public routes */}
          <Route 
            path="/login" 
            element={currentUser ? <Navigate to="/" replace /> : <LoginPage />} 
          />
          <Route 
            path="/register" 
            element={currentUser ? <Navigate to="/" replace /> : <RegisterPage />} 
          />
          
          {/* Protected routes */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/tasks" 
            element={
              <ProtectedRoute>
                <TaskList />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/tasks/new" 
            element={
              <ProtectedRoute>
                <CreateTask />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/tasks/:id" 
            element={
              <ProtectedRoute>
                <TaskDetail />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/store" 
            element={
              <ProtectedRoute>
                <StoreOverviewPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/announcements" 
            element={
              <ProtectedRoute>
                <AnnouncementsList />
              </ProtectedRoute>
            } 
          />
          
          {/* Admin routes */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute>
                <AdminPanel />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/users" 
            element={
              <ProtectedRoute>
                <UsersPanel />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/stores" 
            element={
              <ProtectedRoute>
                <StoresPanel />
              </ProtectedRoute>
            } 
          />
          
          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;