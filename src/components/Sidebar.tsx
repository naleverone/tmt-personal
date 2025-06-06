// src/components/Sidebar.tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Users, CheckSquare, PlusCircle, ClipboardList, LogOut, Megaphone } from 'lucide-react';
import { useAuth } from '../AuthContext'; // Ajusta la ruta si AuthContext está en otro nivel
import ChangePasswordModal from './ChangePasswordModal'; // Asegúrate de que la ruta sea correcta

function Sidebar() {
  const location = useLocation();
  const { currentUser, logout } = useAuth();
  const [isChangePasswordOpen, setIsChangePasswordOpen] = React.useState(false);

  if (!currentUser) {
    return null;
  }
  const userRole = currentUser.role;

  return (
    <div className="sticky top-0 left-0 h-screen w-64 min-w-64 max-w-64 bg-indigo-800 text-white flex flex-col z-30">
      <div className="flex justify-between items-center p-4 border-b border-indigo-700">
        <span className="text-xl font-semibold">Menú</span>
      </div>
      <nav className="mt-4 flex flex-col h-[calc(100%-65px)]">
        <div className="flex-grow">
          <Link
            to="/"
            className={`flex items-center px-6 py-3 ${
              location.pathname === '/' ? 'bg-indigo-900' : 'hover:bg-indigo-700'
            }`}
          >
            <Home className="h-5 w-5 mr-3" />
            Inicio
          </Link>
          <Link
            to="/tasks"
            className={`flex items-center px-6 py-3 ${
              (location.pathname === '/tasks' || (location.pathname.startsWith('/tasks/') && !location.pathname.includes('new')))
                ? 'bg-indigo-900'
                : 'hover:bg-indigo-700'
            }`}
          >
            <CheckSquare className="h-5 w-5 mr-3" />
            Mis tareas
          </Link>
          {userRole === 'admin' && (
            <Link
              to="/announcements"
              className={`flex items-center px-6 py-3 ${
                location.pathname === '/announcements' ? 'bg-indigo-900' : 'hover:bg-indigo-700'
              }`}
            >
              <Megaphone className="h-5 w-5 mr-3" />
              Comunicados
            </Link>
          )}
          {false && ( // Vista de supervisor oculta temporalmente
            <Link
              to="/store"
              className={`flex items-center px-6 py-3 ${
                location.pathname === '/store' ? 'bg-indigo-900' : 'hover:bg-indigo-700'
              }`}
            >
              <ClipboardList className="h-5 w-5 mr-3" />
              Vista de supervisor
            </Link>
          )}
          {(userRole === 'supervisor' || userRole === 'admin') && (
            <Link
              to="/tasks/new"
              className={`flex items-center px-6 py-3 ${
                location.pathname === '/tasks/new' ? 'bg-indigo-900' : 'hover:bg-indigo-700'
              }`}
            >
              <PlusCircle className="h-5 w-5 mr-3" />
              Creación
            </Link>
          )}
          {userRole === 'admin' && (
            <Link
              to="/admin"
              className={`flex items-center px-6 py-3 ${
                location.pathname === '/admin' ? 'bg-indigo-900' : 'hover:bg-indigo-700'
              }`}
            >
              <Users className="h-5 w-5 mr-3" />
              Administración
            </Link>
          )}
        </div>
        <div className="mt-auto p-2">
          <button
            onClick={() => setIsChangePasswordOpen(true)}
            className="w-full flex items-center px-4 py-3 mb-2 bg-indigo-700 hover:bg-indigo-600 rounded-md"
          >
            <span className="h-5 w-5 mr-3">🔒</span>
            Cambiar contraseña
          </button>
          <button
            onClick={async () => {
              try {
                await logout();
              } catch {
                alert('Error al cerrar sesión');
              }
            }}
            className="w-full flex items-center px-4 py-3 hover:bg-indigo-700 rounded-md"
          >
            <LogOut className="h-5 w-5 mr-3" />
            Cerrar sesión
          </button>
        </div>
      </nav>
      {isChangePasswordOpen && (
        <ChangePasswordModal show={isChangePasswordOpen} handleClose={() => setIsChangePasswordOpen(false)} />
      )}
    </div>
  );
}

export default Sidebar;

