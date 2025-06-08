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
import AnnouncementsList from './pages/AnnouncementsList';

function App() {
  const { currentUser, isLoading, connectionError } = useAuth();

  // Show loading spinner while checking auth state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  // Detect if we're on auth pages
  const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/register';

  // If no user and on auth pages, show the auth page
  if (!currentUser && isAuthPage) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        {window.location.pathname === '/login' ? <LoginPage /> : <RegisterPage />}
      </div>
    );
  }

  // If no user and not on auth pages, redirect to login
  if (!currentUser && !isAuthPage) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <LoginPage />
      </div>
    );
  }

  // Handle auth page redirects when user is logged in
  const isLoginPage = window.location.pathname === '/login';
  const isRegisterPage = window.location.pathname === '/register';
  if (isLoginPage || isRegisterPage) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Connection Error Banner */}
      {connectionError && (
        <div className="fixed top-0 left-0 w-full z-40 bg-yellow-100 text-yellow-800 text-center py-2 px-4 border-b border-yellow-200">
          <span className="text-sm font-medium">{connectionError}</span>
        </div>
      )}
      
      {currentUser && <Sidebar />}
      <div className={`flex-1 ${currentUser ? 'ml-0' : ''} ${connectionError ? 'pt-12' : ''}`}>
        <Routes>
          {/* Public routes */}
          <Route 
            path="/login" 
            element={currentUser ? <Navigate to="/\" replace /> : <LoginPage />} 
          />
          <Route 
            path="/register" 
            element={currentUser ? <Navigate to="/\" replace /> : <RegisterPage />} 
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
          <Route path="*" element={<Navigate to="/\" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;