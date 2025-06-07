// src/pages/StoreOverviewPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Task, User } from '../types';
import supabase from '../config/supabaseClient';
import { withRetry, isRetryableError } from '../utils/retryUtils';

function StoreOverviewPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stores, setStores] = useState<{id: string, name: string}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assignedUserFilter, setAssignedUserFilter] = useState('all');
  const [storeFilter, setStoreFilter] = useState(currentUser?.role === 'supervisor' ? currentUser.store_id : 'all');

  useEffect(() => {
    if (!currentUser || (currentUser.role !== 'supervisor' && currentUser.role !== 'admin')) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch stores, users, and tasks with retry
        const [storesResult, usersResult] = await Promise.all([
          withRetry(() => supabase.from('stores').select('id, name'), { maxRetries: 3 }),
          withRetry(() => supabase.from('users').select('*'), { maxRetries: 3 })
        ]);

        if (storesResult.error) throw storesResult.error;
        if (usersResult.error) throw usersResult.error;

        setStores(storesResult.data || []);
        setUsers(usersResult.data || []);

        // Fetch tasks based on user role and store filter
        let tasksQuery = supabase.from('tasks').select('*');
        
        if (currentUser.role === 'supervisor') {
          tasksQuery = tasksQuery.eq('store_id', currentUser.store_id);
        } else if (currentUser.role === 'admin' && storeFilter !== 'all') {
          tasksQuery = tasksQuery.eq('store_id', storeFilter);
        }

        const tasksResult = await withRetry(() => tasksQuery, { maxRetries: 3 });
        if (tasksResult.error) throw tasksResult.error;

        // Enrich tasks with user and store names
        const tasksWithUserNames = (tasksResult.data || []).map(task => {
          const user = usersResult.data?.find(u => u.auth_id === task.assigned_user_auth_id);
          const store = storesResult.data?.find(s => s.id === task.store_id);
          return {
            ...task,
            assigned_user_name: user?.name || 'Desconocido',
            store_name: store?.name || `Store ${task.store_id}`
          };
        });

        setTasks(tasksWithUserNames);
      } catch (e) {
        console.error('Error fetching data:', e);
        if (isRetryableError(e)) {
          setError('Error de conexión al cargar datos. Reintentando...');
          // Retry after delay
          setTimeout(() => {
            setError(null);
            fetchData();
          }, 3000);
        } else {
          setError(e instanceof Error ? e.message : "Error desconocido al cargar datos");
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [currentUser, storeFilter]);

  const filteredTasks = tasks.filter(task => {
    const statusMatch = statusFilter === 'all' || task.status?.toLowerCase().replace(' ', '') === statusFilter.toLowerCase().replace(' ', '');
    const priorityMatch = priorityFilter === 'all' || task.priority?.toLowerCase() === priorityFilter.toLowerCase();
    const userMatch = assignedUserFilter === 'all' || task.assigned_user_auth_id === assignedUserFilter;
    return statusMatch && priorityMatch && userMatch;
  });

  if (!currentUser || (currentUser.role !== 'supervisor' && currentUser.role !== 'admin')) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) return <div className="p-8 text-center">Cargando vista general de tienda...</div>;
  if (error) return <div className="p-8 text-center text-red-500 bg-red-50 p-4 rounded-md">Error: {error}</div>;

  const getPriorityClass = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgente':
      case 'high':
        return 'bg-red-100 text-red-700';
      case 'rutinaria':
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'low':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusClass = (status?: string) => {
    switch (status?.toLowerCase().replace(' ', '')) {
      case 'pendiente':
        return 'bg-orange-100 text-orange-700';
      case 'ok':
        return 'bg-teal-100 text-teal-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const availableStoresForFilter = stores.filter(store => 
    currentUser.role === 'admin' || store.id === currentUser.store_id
  );

  const usersForFilterDropdown = users.filter(user =>
    currentUser.role === 'admin' || user.store_id === currentUser.store_id
  );

  return (
    <div className="p-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 sm:mb-0">
          Vista de Tienda
        </h1>
      </div>
      <p className="text-gray-600 mb-6 text-sm">
        {currentUser.role === 'admin' ? 'Visualizando tareas (Administración)' : `Tienda: ${stores.find(s => s.id === currentUser.store_id)?.name || currentUser.store_id} (Supervisor)`}
      </p>

      <div className="mb-6 p-4 bg-white rounded-xl shadow-lg grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        {currentUser.role === 'admin' && (
          <div>
            <label htmlFor="store-filter-overview" className="block text-xs font-medium text-gray-500 mb-1">Tienda</label>
            <select
              id="store-filter-overview"
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value)}
              className="block w-full p-3 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-700 bg-gray-50 hover:bg-gray-100"
            >
              <option value="all">Todas las Tiendas</option>
              {availableStoresForFilter.map(store => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label htmlFor="status-filter-overview" className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
          <select
            id="status-filter-overview"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="block w-full p-3 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-700 bg-gray-50 hover:bg-gray-100"
          >
            <option value="all">Todos</option>
            <option value="Pendiente">Pendiente</option>
            <option value="OK">OK</option>
          </select>
        </div>
        <div>
          <label htmlFor="priority-filter-overview" className="block text-xs font-medium text-gray-500 mb-1">Prioridad</label>
          <select
            id="priority-filter-overview"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="block w-full p-3 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-700 bg-gray-50 hover:bg-gray-100"
          >
            <option value="all">Todas</option>
            <option value="Urgente">Urgente</option>
            <option value="Rutinaria">Rutinaria</option>
          </select>
        </div>
        <div>
          <label htmlFor="user-filter-overview" className="block text-xs font-medium text-gray-500 mb-1">Asignado A</label>
          <select
            id="user-filter-overview"
            value={assignedUserFilter}
            onChange={(e) => setAssignedUserFilter(e.target.value)}
            className="block w-full p-3 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-700 bg-gray-50 hover:bg-gray-100"
          >
            <option value="all">Todos los Usuarios</option>
            {usersForFilterDropdown.map(user => (
              <option key={user.auth_id} value={user.auth_id}>{user.name}</option>
            ))}
          </select>
        </div>
      </div>

      {filteredTasks.length === 0 && !isLoading && <p className="text-gray-600 text-center py-6">No hay tareas que coincidan con los filtros.</p>}

      <div className="bg-white rounded-xl shadow-2xl overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tarea</th>
              {currentUser.role === 'admin' && <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tienda</th>}
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Asignado A</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Vence</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Prioridad</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Estado</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTasks.map(task => (
              <tr key={task.id} className="hover:bg-gray-50 transition-colors duration-150">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{task.name}</div>
                  <div className="text-xs text-gray-500 line-clamp-1">{task.description || "Sin descripción"}</div>
                </td>
                {currentUser.role === 'admin' && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {task.store_name || task.store_id}
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{task.assigned_user_name || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{task.due_date || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-3 py-1 text-xs leading-5 font-semibold rounded-full ${getPriorityClass(task.priority)}`}>
                    {task.priority || 'N/A'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-3 py-1 text-xs leading-5 font-semibold rounded-full ${getStatusClass(task.status)}`}>
                    {task.status || 'N/A'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button onClick={() => navigate(`/tasks/${task.id}`)} className="text-indigo-600 hover:text-indigo-800 hover:underline">
                    Ver Detalles
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default StoreOverviewPage;