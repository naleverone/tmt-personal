// src/pages/StoreOverviewPage.tsx
import { useState, useEffect } from 'react'; // No es necesario 'React' aquí si no se usa explícitamente
import { useNavigate, Navigate } from 'react-router-dom'; // Importar Navigate
import { useAuth } from '../AuthContext'; // Ajusta la ruta
import { Task, User } from '../types'; // Importar interfaces
import supabase from '../config/supabaseClient';

function StoreOverviewPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]); 
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
      setIsLoading(true); setError(null);
      try {
        // Obtener usuarios desde Supabase
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('*');
        if (usersError) throw new Error('Error al cargar usuarios');
        setUsers(users || []);

        // Obtener tareas desde Supabase
        let tasksQuery = supabase.from('tasks').select('*');
        if (currentUser.role === 'supervisor') {
          tasksQuery = tasksQuery.contains('stores', [currentUser.store_id]);
        } else if (currentUser.role === 'admin' && storeFilter !== 'all') {
          tasksQuery = tasksQuery.contains('stores', [storeFilter]);
        }
        const { data: tasksData, error: tasksError } = await tasksQuery;
        if (tasksError) throw new Error('Error al cargar tareas');
        const tasksWithUserNames = (tasksData || []).map(task => ({
          ...task,
          assigned_user_name: (users || []).find(u => u.auth_id === task.assigned_user_auth_id)?.name || 'Desconocido'
        }));
        setTasks(tasksWithUserNames);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error desconocido al cargar datos");
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
    // Usar el componente Navigate para redirigir
    return <Navigate to="/" replace />; 
  }

  if (isLoading) return <div className="p-8 text-center">Cargando vista general de tienda...</div>;
  if (error) return <div className="p-8 text-center text-red-500 bg-red-50 p-4 rounded-md">Error: {error}</div>;

  const getPriorityClass = (priority?: string) => { 
    switch (priority?.toLowerCase()) {
        case 'urgente':
        case 'high': // compatibilidad
            return 'bg-red-100 text-red-700';
        case 'rutinaria':
        case 'medium': // compatibilidad
            return 'bg-yellow-100 text-yellow-700';
        case 'low':
            return 'bg-green-100 text-green-700';
        default:
            return 'bg-gray-100 text-gray-700';
    }
  };
  const getStatusClass = (status?: string) => { 
    switch (status?.toLowerCase().replace(' ','')) {
        case 'pendiente':
            return 'bg-orange-100 text-orange-700';
        case 'ok':
            return 'bg-teal-100 text-teal-700';
        default:
            return 'bg-gray-100 text-gray-700';
    }
  };
  
  const availableStoresForFilter = Array.from(new Set(users.map(u => u.store_id))).sort();
  // Para el filtro de usuarios, es mejor mostrar todos los usuarios disponibles en las tareas actualmente cargadas (antes de filtrar por usuario)
  // o todos los usuarios de la tienda/s seleccionadas.
  // Esta versión es más simple y toma los usuarios de las tareas *antes* de aplicar el filtro de `assignedUserFilter`.
  const usersForFilterDropdown = Array.from(new Set(tasks.map(t => t.assigned_user_auth_id)))
                               .map(authId => users.find(u => u.auth_id === authId))
                               .filter(u => u !== undefined) as User[];


  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 sm:mb-0">
            Vista de Tienda
        </h1>
      </div>
      <p className="text-gray-600 mb-6 text-sm">
        {currentUser.role === 'admin' ? 'Visualizando tareas (Administración)' : `Tienda: ${currentUser.store_id} (Supervisor)`}
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
                    {availableStoresForFilter.map(storeName => (
                        <option key={storeName} value={storeName}>{storeName}</option>
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
                    {task.stores?.join(', ') || 'N/A'}
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
