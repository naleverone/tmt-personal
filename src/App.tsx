// src/App.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

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

  // Detectar cuando el usuario vuelve a la pestaña y refrescar sesión de Supabase
  React.useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('[App] Tab visible, refrescando sesión de Supabase...');
        try {
          const { data: { session } } = await import('./config/supabaseClient').then(m => m.default.auth.getSession());
          console.log('[App] getSession() result after tab visible:', session);
          if (!session) {
            setSessionExpired(true);
          }
        } catch (e) {
          console.error('[App] Error al refrescar sesión tras volver a la pestaña:', e);
          setSessionExpired(true);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Show loading spinner while checking auth state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  // Ocultar mensaje de sesión expirada en login y register
  const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/register';

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