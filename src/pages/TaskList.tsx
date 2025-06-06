// src/pages/TaskList.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Task } from '../types';
import { CalendarDays, LayoutGrid, Table, Eraser, Trash2, CheckCircle, Circle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import supabase from '../config/supabaseClient';
import TaskDetailContent from '../components/TaskDetailContent';

function TaskList() {
  const { currentUser } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [errorTasks, setErrorTasks] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'calendar'>('table');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assignedUserFilter, setAssignedUserFilter] = useState('all');
  const [storeFilter, setStoreFilter] = useState(currentUser?.role === 'supervisor' ? currentUser.store_id : 'all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isPendingOpen, setIsPendingOpen] = useState(true);
  const [isOkOpen, setIsOkOpen] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | string | null>(null);
  const navigate = useNavigate();

  const currentDate = new Date();
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;
      setIsLoadingTasks(true);
      setErrorTasks(null);
      try {
        // Obtener tareas desde Supabase
        let tasksQuery = supabase.from('tasks').select('*');
        if (currentUser.role === 'employee') {
          tasksQuery = tasksQuery.eq('assigned_user_auth_id', currentUser.id);
        } else if (currentUser.role === 'supervisor') {
          tasksQuery = tasksQuery.contains('stores', [currentUser.store_id]);
        } else if (currentUser.role === 'admin' && storeFilter !== 'all') {
          tasksQuery = tasksQuery.contains('stores', [storeFilter]);
        }
        const { data: tasksData, error: tasksError } = await tasksQuery;
        if (tasksError) throw new Error('Error al cargar tareas');

        const tasksWithUserNames = (tasksData || []).map(task => ({
          ...task,
          assigned_user_name: task.assigned_user_name || null,
          stores: Array.isArray(task.stores)
            ? task.stores
            : (typeof task.stores === 'string' && task.stores.length > 0)
              ? (task.stores as string).split(',').map((s: string) => s.trim())
              : (typeof task.store === 'string' && task.store.length > 0)
                ? (task.store as string).split(',').map((s: string) => s.trim())
                : []
        }));
        setTasks(tasksWithUserNames);
      } catch (e) {
        setErrorTasks(e instanceof Error ? e.message : "Error desconocido al cargar tareas");
      } finally {
        setIsLoadingTasks(false);
      }
    };
    fetchData();
  }, [currentUser, storeFilter]);

  if (isLoadingTasks) return <div className="p-8 text-center">Cargando tareas...</div>;
  if (errorTasks) return <div className="p-8 text-center text-red-500">Error: {errorTasks}</div>;

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

  // Cambiar el estilo del tag de estado en TaskList (tabla y tarjetas)
  const getStatusClass = (status?: string) => {
    switch (status?.toLowerCase().replace(' ', '')) {
      case 'pendiente':
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
      case 'ok':
        return 'bg-green-50 text-green-700 border border-green-200';
      case 'inprogress':
        return 'bg-blue-100 text-blue-700';
      case 'completed':
        return 'bg-teal-100 text-teal-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  let title = 'Mis tareas';
  if (currentUser?.role === 'admin') {
    title = 'Todas las tareas (Vista Administrador)';
  } else if (currentUser?.role === 'supervisor') {
    title = `Tareas tienda`;
  } else if (currentUser?.role === 'employee') {
    title = `Tareas tienda`;
  }

  const filteredTasks = tasks.filter(task => {
    const statusMatch = statusFilter === 'all' || (task.status?.toLowerCase().replace(' ', '') === statusFilter.toLowerCase().replace(' ', ''));
    const priorityMatch = priorityFilter === 'all' || (task.priority?.toLowerCase() === priorityFilter.toLowerCase());
    const userMatch = assignedUserFilter === 'all' || task.assigned_user_auth_id === assignedUserFilter;
    return statusMatch && priorityMatch && userMatch;
  });

  const renderGridView = () => {
    // Agrupar tareas por estado
    const pendingTasks = filteredTasks.filter(task => ['pendiente', 'pending'].includes(normalizeStatus(task.status)));
    const okTasks = filteredTasks.filter(task => ['ok'].includes(normalizeStatus(task.status)));

    // Card component reutilizable
    const TaskCard = (task: Task, isOk: boolean) => (
      <div
        key={task.id}
        className="bg-white shadow-lg rounded-lg p-5 hover:shadow-xl transition-shadow cursor-pointer flex flex-col"
        onClick={e => {
          // Evitar que el click en el botón de estado abra el modal
          if ((e.target as HTMLElement).closest('button[data-status]')) return;
          handleOpenDetailModal(task.id);
        }}
      >
        <div className="flex items-start mb-2">
          <button
            data-status
            onClick={e => { e.stopPropagation(); handleToggleTaskStatus(task); }}
            className={`transition-colors rounded-full p-1 focus:outline-none mt-1 mr-3 ${isOk ? 'text-teal-600' : 'text-gray-400 hover:text-indigo-500'}`}
            title={isOk ? 'Marcar como Pendiente' : 'Marcar como OK'}
            aria-label={isOk ? 'Marcar como Pendiente' : 'Marcar como OK'}
          >
            {isOk ? <CheckCircle size={22} fill="none" strokeWidth={2} /> : <Circle size={22} strokeWidth={2} />}
          </button>
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <h2 className="text-lg font-semibold text-gray-800">{task.name}</h2>
              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getPriorityClass(task.priority)}`}>{task.priority || 'N/A'}</span>
            </div>
            <p className="text-sm text-gray-600 mb-1 line-clamp-2 h-10">{task.description || 'Sin descripción.'}</p>
          </div>
        </div>
        <div className="text-xs text-gray-500 my-3">
          {task.stores && task.stores.length > 0 && (
            <span className="block">Tiendas: {task.stores.join(', ')}</span>
          )}
          <span className="block">Vence: {task.due_date || 'N/A'}</span>
          <span className="block font-medium">Asignada a: {task.assigned_user_name ?? 'N/A'}</span>
        </div>
        <div className="flex justify-start items-center mt-auto">
          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusClass(task.status)}`}>{task.status || 'N/A'}</span>
        </div>
      </div>
    );

    return (
      <div>
        {/* Bloque de tareas pendientes */}
        <div className="mb-4 border rounded-lg bg-white shadow">
          <button
            className="w-full flex items-center justify-between px-4 py-3 text-lg font-semibold text-gray-800 hover:bg-gray-50 focus:outline-none"
            onClick={() => setIsPendingOpen(open => !open)}
          >
            <span>🕒 Pendiente ({pendingTasks.length})</span>
            <span className={`transform transition-transform ${isPendingOpen ? '' : '-rotate-90'}`}>▼</span>
          </button>
          {isPendingOpen && (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingTasks.length > 0 ? pendingTasks.map(task => TaskCard(task, false)) : <div className="p-4 text-gray-500 col-span-full">No hay tareas pendientes.</div>}
            </div>
          )}
        </div>
        {/* Bloque de tareas OK */}
        <div className="mb-4 border rounded-lg bg-white shadow">
          <button
            className="w-full flex items-center justify-between px-4 py-3 text-lg font-semibold text-gray-800 hover:bg-gray-50 focus:outline-none"
            onClick={() => setIsOkOpen(open => !open)}
          >
            <span>✔️ OK ({okTasks.length})</span>
            <span className={`transform transition-transform ${isOkOpen ? '' : '-rotate-90'}`}>▼</span>
          </button>
          {isOkOpen && (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {okTasks.length > 0 ? okTasks.map(task => TaskCard(task, true)) : <div className="p-4 text-gray-500 col-span-full">No hay tareas OK.</div>}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCalendarView = () => (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="text-xl font-semibold text-center mb-6">
        {format(currentDate, 'MMMM yyyy')}
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
          <div key={day} className="text-center font-medium text-gray-500 text-sm">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: monthStart.getDay() }).map((_, index) => (
          <div key={`empty-${index}`} className="h-32 bg-gray-50 rounded-lg"></div>
        ))}
        {daysInMonth.map((date, index) => {
          const dayTasks = filteredTasks.filter(task => task.due_date && isSameDay(new Date(task.due_date), date));
          return (
            <div
              key={index}
              className={`h-32 p-1 border rounded-lg ${
                isToday(date) ? 'border-indigo-500' : 'border-gray-200'
              }`}
            >
              <div className="text-right text-sm font-medium mb-1">
                {format(date, 'd')}
              </div>
              <div className="overflow-y-auto max-h-24">
                {dayTasks.map(task => (
                  <div
                    key={task.id}
                    onClick={() => navigate(`/tasks/${task.id}`)}
                    className={`text-xs p-1 mb-1 rounded cursor-pointer ${getStatusClass(task.status)} truncate`}
                    title={`${task.name} - ${(task.assigned_user_name ?? '')}`}
                  >
                    {task.name}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const handleDeleteClick = (task: Task) => {
    setTaskToDelete(task);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    setIsLoadingTasks(true);
    setErrorTasks(null);
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskToDelete.id);
      if (error) throw new Error('Error al eliminar la tarea');
      setTasks(prev => prev.filter(t => t.id !== taskToDelete.id));
      setShowDeleteModal(false);
      setTaskToDelete(null);
    } catch (e) {
      setErrorTasks(e instanceof Error ? e.message : 'Error desconocido al eliminar la tarea');
    } finally {
      setIsLoadingTasks(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setTaskToDelete(null);
  };

  // Separa tareas en pendientes y OK
  // Normalizador robusto para el estado
  const normalizeStatus = (status?: string) =>
    (status ?? '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z]/g, '');

  const pendingTasks = filteredTasks.filter(
    task => ['pendiente', 'pending'].includes(normalizeStatus(task.status))
  );
  const okTasks = filteredTasks.filter(
    task => ['ok'].includes(normalizeStatus(task.status))
  );

  // Ajuste: Definir anchos fijos y consistentes para las columnas de la tabla
  const TABLE_COL_WIDTHS = {
    info: '',
    tarea: 'w-1/4', // ancho proporcional
    tienda: 'w-1/6',
    asignado: 'w-1/6',
    vence: 'w-1/12',
    prioridad: 'w-1/12',
    estado: 'w-1/12',
    acciones: 'w-12',
  };

  const showStoreColumn = currentUser?.role === 'admin';

  // Renderiza tabla para un set de tareas
  const renderTasksTable = (tasksToShow: Task[]) => (
    <table className="w-full table-auto divide-y divide-gray-200 text-sm sm:text-base">
      <thead className="bg-gray-100">
        <tr>
          <th className={TABLE_COL_WIDTHS.info}></th>
          <th className={TABLE_COL_WIDTHS.tarea + " px-2 py-3 sm:px-6 sm:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap"}>Tarea</th>
          {showStoreColumn && (
            <th className={TABLE_COL_WIDTHS.tienda + " px-2 py-3 sm:px-6 sm:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap"}>Tienda</th>
          )}
          <th className={TABLE_COL_WIDTHS.asignado + " px-2 py-3 sm:px-6 sm:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap"}>Asignado A</th>
          <th className={TABLE_COL_WIDTHS.vence + " px-2 py-3 sm:px-6 sm:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap"}>Vence</th>
          <th className={TABLE_COL_WIDTHS.prioridad + " px-2 py-3 sm:px-6 sm:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap"}>Prioridad</th>
          <th className={TABLE_COL_WIDTHS.estado + " px-2 py-3 sm:px-6 sm:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap"}>Estado</th>
          <th className={TABLE_COL_WIDTHS.acciones + " px-2 py-3 sm:px-6 sm:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap"}>Acciones</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {tasksToShow.map(task => {
          const isOk = normalizeStatus(task.status) === 'ok';
          return (
            <tr key={task.id} className="hover:bg-indigo-50 transition-colors duration-150 cursor-pointer active:bg-indigo-100" style={{ WebkitTapHighlightColor: 'transparent' }}
              onClick={e => {
                if ((e.target as HTMLElement).closest('button[data-delete],button[data-status]')) return;
                handleOpenDetailModal(task.id);
              }}
            >
              <td className={TABLE_COL_WIDTHS.info + " px-2 py-3 sm:px-3 sm:py-4 whitespace-nowrap align-middle text-center"}>
                <button
                  data-status
                  onClick={e => { e.stopPropagation(); handleToggleTaskStatus(task); }}
                  className={`transition-colors rounded-full p-1 focus:outline-none ${isOk ? 'text-teal-600' : 'text-gray-400 hover:text-indigo-500'}`}
                  title={isOk ? 'Marcar como Pendiente' : 'Marcar como OK'}
                  aria-label={isOk ? 'Marcar como Pendiente' : 'Marcar como OK'}
                >
                  {isOk ? <CheckCircle size={22} fill="none" strokeWidth={2} /> : <Circle size={22} strokeWidth={2} />}
                </button>
              </td>
              <td className={TABLE_COL_WIDTHS.tarea + " px-2 py-3 sm:px-6 sm:py-4 whitespace-nowrap align-middle truncate max-w-xs"}>
                <div className="text-sm font-medium text-gray-900 truncate">{task.name}</div>
                <div className="text-xs text-gray-500 line-clamp-1 truncate">{task.description || "Sin descripción"}</div>
              </td>
              {showStoreColumn && (
                <td className={TABLE_COL_WIDTHS.tienda + " px-2 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-700 align-middle truncate max-w-xs"}>
                  <span className="truncate">{task.stores?.join(', ') || <span className="text-gray-300">-</span>}</span>
                </td>
              )}
              <td className={TABLE_COL_WIDTHS.asignado + " px-2 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-700 align-middle"}>{task.assigned_user_name ?? 'N/A'}</td>
              <td className={TABLE_COL_WIDTHS.vence + " px-2 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-700 align-middle"}>{task.due_date ?? 'N/A'}</td>
              <td className={TABLE_COL_WIDTHS.prioridad + " px-2 py-3 sm:px-6 sm:py-4 whitespace-nowrap align-middle"}>
                <span className={`px-2 py-1 text-xs leading-5 font-semibold rounded-full ${getPriorityClass(task.priority)}`}>{task.priority || 'N/A'}</span>
              </td>
              <td className={TABLE_COL_WIDTHS.estado + " px-2 py-3 sm:px-6 sm:py-4 whitespace-nowrap align-middle"}>
                <span className={`px-2 py-1 text-xs leading-5 font-semibold rounded-full ${getStatusClass(task.status)}`}>{task.status || 'N/A'}</span>
              </td>
              <td className={TABLE_COL_WIDTHS.acciones + " px-2 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm font-medium align-middle flex gap-2 items-center"}>
                {currentUser?.role === 'admin' && (
                  <button data-delete onClick={e => { e.stopPropagation(); handleDeleteClick(task); }} className="text-red-600 hover:text-red-800 focus:outline-none" title="Eliminar Tarea">
                    <Trash2 size={20} />
                  </button>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  const renderTableView = () => (
    <div className="w-full overflow-x-auto">
      {/* Modal de confirmación de borrado */}
      {showDeleteModal && taskToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full relative">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Eliminar tarea</h2>
            <p className="mb-6 text-gray-700">¿Estás seguro de que deseas eliminar la tarea <span className='font-semibold'>{taskToDelete.name}</span>? Esta acción no se puede deshacer.</p>
            <div className="flex justify-center gap-3">
              <button onClick={handleCancelDelete} className="px-4 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200">Cancelar</button>
              <button onClick={handleConfirmDelete} className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700">Eliminar</button>
            </div>
          </div>
        </div>
      )}
      {/* Bloque de tareas pendientes */}
      <div className="mb-4 border rounded-lg bg-white shadow">
        <button
          className="w-full flex items-center justify-between px-4 py-3 text-lg font-semibold text-gray-800 hover:bg-gray-50 focus:outline-none"
          onClick={() => setIsPendingOpen(open => !open)}
        >
          <span>🕒 Pendiente ({pendingTasks.length})</span>
          <span className={`transform transition-transform ${isPendingOpen ? '' : '-rotate-90'}`}>▼</span>
        </button>
        {isPendingOpen && (
          <div className="p-2 pt-0">{pendingTasks.length > 0 ? renderTasksTable(pendingTasks) : <div className="p-4 text-gray-500">No hay tareas pendientes.</div>}</div>
        )}
      </div>
      {/* Bloque de tareas OK */}
      <div className="mb-4 border rounded-lg bg-white shadow">
        <button
          className="w-full flex items-center justify-between px-4 py-3 text-lg font-semibold text-gray-800 hover:bg-gray-50 focus:outline-none"
          onClick={() => setIsOkOpen(open => !open)}
        >
          <span>✔️ OK ({okTasks.length})</span>
          <span className={`transform transition-transform ${isOkOpen ? '' : '-rotate-90'}`}>▼</span>
        </button>
        {isOkOpen && (
          <div className="p-2 pt-0">{okTasks.length > 0 ? renderTasksTable(okTasks) : <div className="p-4 text-gray-500">No hay tareas OK.</div>}</div>
        )}
      </div>
    </div>
  );

  // Handler para resetear filtros
  const handleResetFilters = () => {
    setStatusFilter('all');
    setPriorityFilter('all');
    setAssignedUserFilter('all');
    if (currentUser?.role === 'admin') {
      setStoreFilter('all');
    } else if (currentUser?.role === 'supervisor') {
      setStoreFilter(currentUser.store_id);
    }
  };

  // Corregir/definir availableStoresForFilter y usersForFilterDropdown si no existen
  const availableStoresForFilter = Array.from(new Set(filteredTasks.flatMap(t => t.stores || [])));
  // Corregir usersForFilterDropdown para asegurar que no haya undefined:
  const usersForFilterDropdown = Array.from(new Set(filteredTasks.map(t => t.assigned_user_name).filter((u): u is string => Boolean(u))));

  // Handler to open detail modal
  const handleOpenDetailModal = (taskId: number | string) => {
    setSelectedTaskId(taskId);
    setShowDetailModal(true);
  };

  // Handler to close detail modal
  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedTaskId(null);
  };

  // Toggle task status handler
  const handleToggleTaskStatus = async (task: Task) => {
    const newStatus = normalizeStatus(task.status) === 'ok' ? 'Pendiente' : 'OK';
    try {
      await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id);
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    } catch (e) {
      // Optionally show error
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">{title}</h1>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 rounded-lg ${
              viewMode === 'table'
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="Vista de listado"
          >
            <Table size={20} />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg ${
              viewMode === 'grid'
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="Vista de cuadrícula"
          >
            <LayoutGrid size={20} />
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`p-2 rounded-lg ${
              viewMode === 'calendar'
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="Vista de calendario"
          >
            <CalendarDays size={20} />
          </button>
        </div>
      </div>
      {/* Filtros */}
      <div className="mb-6 p-4 bg-white rounded-xl shadow-lg grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end w-full">
        {currentUser?.role === 'admin' && (
          <div>
            <label htmlFor="store-filter-tasks" className="block text-xs font-medium text-gray-500 mb-1">Tienda</label>
            <select
              id="store-filter-tasks"
              value={storeFilter}
              onChange={e => setStoreFilter(e.target.value)}
              className="block w-full p-3 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-700 bg-gray-50 hover:bg-gray-100"
            >
              <option value="all">Todas las Tiendas</option>
              {availableStoresForFilter.map((storeName: string) => (
                <option key={storeName} value={storeName}>{storeName}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label htmlFor="status-filter-tasks" className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
          <select
            id="status-filter-tasks"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="block w-full p-3 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-700 bg-gray-50 hover:bg-gray-100"
          >
            <option value="all">Todos</option>
            <option value="Pendiente">Pendiente</option>
            <option value="OK">OK</option>
          </select>
        </div>
        <div>
          <label htmlFor="priority-filter-tasks" className="block text-xs font-medium text-gray-500 mb-1">Prioridad</label>
          <select
            id="priority-filter-tasks"
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="block w-full p-3 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-700 bg-gray-50 hover:bg-gray-100"
          >
            <option value="all">Todas</option>
            <option value="Urgente">Urgente</option>
            <option value="Rutinaria">Rutinaria</option>
          </select>
        </div>
        <div>
          <label htmlFor="user-filter-tasks" className="block text-xs font-medium text-gray-500 mb-1">Asignado A</label>
          <select
            id="user-filter-tasks"
            value={assignedUserFilter}
            onChange={e => setAssignedUserFilter(e.target.value)}
            className="block w-full p-3 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-700 bg-gray-50 hover:bg-gray-100"
          >
            <option value="all">Todos los Usuarios</option>
            {usersForFilterDropdown.map(user => (
              <option key={user} value={user}>{user}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end items-end h-full">
          <button
            type="button"
            onClick={handleResetFilters}
            className="p-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg shadow-sm border border-gray-300 transition flex items-center"
            title="Resetear Filtros"
            aria-label="Resetear Filtros"
          >
            <Eraser size={20} />
          </button>
        </div>
      </div>
      {/* Fin filtros */}
      {filteredTasks.length === 0 && <p className="text-gray-600">No hay tareas para mostrar.</p>}
      {viewMode === 'table' ? renderTableView() : viewMode === 'grid' ? renderGridView() : renderCalendarView()}
      {/* Task Detail Modal */}
      {showDetailModal && selectedTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="relative bg-white rounded-2xl shadow-2xl p-0 max-w-3xl w-full mx-4" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <TaskDetailContent 
              taskId={selectedTaskId} 
              onClose={handleCloseDetailModal}
              onStatusChange={(updatedStatus) => {
                setTasks(prev => prev.map(t => t.id === selectedTaskId ? { ...t, status: updatedStatus } : t));
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default TaskList;