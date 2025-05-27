import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import UsersPanel from './admin/UsersPanel';
import StoresPanel from './admin/StoresPanel';
import { Users, Store } from 'lucide-react';

function AdminPanel() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'stores'>('users');

  if (currentUser?.role !== 'admin') {
    return <div className="p-8 text-center">No tienes permiso para ver esta página.</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Panel de Administración</h1>
      
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('users')}
              className={`${
                activeTab === 'users'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <Users className="w-5 h-5 mr-2" />
              Usuarios
            </button>
            <button
              onClick={() => setActiveTab('stores')}
              className={`${
                activeTab === 'stores'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <Store className="w-5 h-5 mr-2" />
              Tiendas
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'users' ? <UsersPanel /> : <StoresPanel />}
    </div>
  );
}

export default AdminPanel;