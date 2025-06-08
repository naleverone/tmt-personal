// src/pages/TaskList.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Task, GroupedTask } from '../types';
import { CalendarDays, LayoutGrid, Table, Eraser, Trash2, CheckCircle, Circle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import supabase from '../config/supabaseClient';
import TaskDetailContent from '../components/TaskDetailContent';
import { withRetry, isRetryableError } from '../utils/retryUtils';

function TaskList() {
  const { currentUser } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [groupedTasks, setGroupedTasks] = useState<GroupedTask[]>([]);
  const [stores, setStores] = useState<{id: string, name: string}[]>([]);
  const [users, setUsers] = useState<{auth_id: string, name: string, store_id: string}[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [errorTasks, setErrorTasks] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'calendar'>('table');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assignedUserFilter, setAssignedUserFilter] = useState('all');
  const [storeFilter, setStoreFilter] = useState(currentUser?.role === 'supervisor' ? currentUser.store_id : 'all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | GroupedTask | null>(null);
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
        // Fetch stores and users for mapping with retry
        const [storesResult, usersResult] = await Promise.all([
          withRetry(() => supabase.from('stores').select('id, name'), { maxRetries: 3 }),
          withRetry(() => supabase.from('users').select('auth_id, name, store_id'), { maxRetries: 3 })
        ]);

        if (storesResult.error) throw storesResult.error;
        if (usersResult.error) throw usersResult.error;

        setStores(storesResult.data || []);
        setUsers(usersResult.data || []);

        // Fetch tasks based on user role with retry
        let tasksQuery = supabase.from('tasks').select('*');
        
        if (currentUser.role === 'employee') {
          tasksQuery = tasksQuery.eq('assigned_user_auth_id', currentUser.id);
        } else if (currentUser.role === 'supervisor') {
          tasksQuery = tasksQuery.eq('store_id', currentUser.store_id);
        } else if (currentUser.role === 'admin' && storeFilter !== 'all') {
          tasksQuery = tasksQuery.eq('store_id', storeFilter);
        }

        const tasksResult = await withRetry(() => tasksQuery, { maxRetries: 3 });
        if (tasksResult.error) throw tasksResult.error;

        // Enrich tasks with user and store names
        const enrichedTasks = (tasksResult.data || []).map(task => {
          const user = usersResult.data?.find(u => u.auth_id === task.assigned_user_auth_id);
          const store = storesResult.data?.find(s => s.id === task.store_id);
          return {
            ...task,
            assigned_user_name: user?.name || null,
            store_name: store?.name || `Store ${task.store_id}`
          };
        });

        setTasks(enrichedTasks);

        // Group tasks for admin view
        if (currentUser.role === 'admin') {
          const grouped = groupTasksForAdmin(enrichedTasks, storesResult.data || []);
          setGroupedTasks(grouped);
        }

      } catch (e) {
        console.error('Error fetching tasks:', e);
        if (isRetryableError(e)) {
          setErrorTasks('Error de conexión al cargar tareas. Reintentando...');
          // Retry after delay
          setTimeout(() => {
            setErrorTasks(null);
            fetchData();
          }, 3000);
        } else {
          setErrorTasks(e instanceof Error ? e.message : "Error desconocido al cargar tareas");
        }
      } finally {
        setIsLoadingTasks(false);
      }
    };
    fetchData();
  }, [currentUser, storeFilter]);

  // Group tasks by task_group_uuid for admin view
  const groupTasksForAdmin = (tasks: Task[], stores: {id: string, name: string}[]): GroupedTask[] => {
    const grouped = new Map<string, GroupedTask>();
    
    tasks.forEach(task => {
      const groupKey = task.task_group_uuid || `individual_${task.id}`;
      
      if (grouped.has(groupKey)) {
        const existing = grouped.get(groupKey)!;
        existing.individual_tasks.push(task);
        existing.store_ids.push(task.store_id);
        existing.store_names.push(task.store_name || `Store ${task.store_id}`);
        
        // Update consolidated status (if any task is OK, group is OK)
        if (task.status === 'OK') {
          existing.status = 'OK';
        }
      } else {
        const store = stores.find(s => s.id === task.store_id);
        grouped.set(groupKey, {
          id: groupKey,
          name: task.name,
          description: task.description,
          store_ids: [task.store_id],
          store_names: [store?.name || `Store ${task.store_id}`],
          assigned_user_auth_id: task.assigned_user_auth_id,
          assigned_user_name: task.assigned_user_name,
          due_date: task.due_date,
          priority: task.priority,
          status: task.status,
          task_type: task.task_type,
          evidence_image_url: task.evidence_image_url,
          is_recurring: task.is_recurring,
          recurrence_pattern: task.recurrence_pattern,
          task_group_uuid: task.task_group_uuid,
          individual_tasks: [task],
          is_grouped: !!task.task_group_uuid
        });
      }
    });

    return Array.from(grouped.values());
  };

  if (isLoadingTasks) return <div className="p-8 text-center">Cargando tareas...</div>;
  if (errorTasks) return <div className="p-8 text-center text-red-500">{errorTasks}</div>;

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
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
      case 'ok':
        return 'bg-green-50 text-green-700 border border-green-200';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  let title = 'Mis tareas';
  if (currentUser?.role === 'admin') {
    title = 'Todas las tareas (Vista Administrador)';
  } else if (currentUser?.role === 'supervisor') {
    title = `Tareas de tienda`;
  }

  // Use grouped tasks for admin, regular tasks for others
  const displayTasks = currentUser?.role === 'admin' ? groupedTasks : tasks;

  const filteredTasks = displayTasks.filter(task => {
    const statusMatch = statusFilter === 'all' || (task.status?.toLowerCase().replace(' ', '') === statusFilter.toLowerCase().replace(' ', ''));
    const priorityMatch = priorityFilter === 'all' || (task.priority?.toLowerCase() === priorityFilter.toLowerCase());
    const userMatch = assignedUserFilter === 'all' || task.assigned_user_auth_id === assignedUserFilter;
    return statusMatch && priorityMatch && userMatch;
  });

  const normalizeStatus = (status?: string) =>
    (status ?? '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z]/g, '');

  const pendingTasks = filteredTasks.filter(
    task => ['pendiente', 'pending'].includes(normalizeStatus(task.status))
  );
  const okTasks = filteredTasks.filter(
    task => ['ok'].includes(normalizeStatus(task.status))
  );

  const handleToggleTaskStatus = async (task: Task | GroupedTask) => {
    const newStatus = normalizeStatus(task.status) === 'ok' ? 'Pendiente' : 'OK';
    
    try {
      if ('is_grouped' in task && task.is_grouped) {
        // Update all individual tasks in the group with retry
        const updatePromises = task.individual_tasks.map(individualTask =>
          withRetry(
            () => supabase.from('tasks').update({ status: newStatus }).eq('id', individualTask.id),
            { maxRetries: 2 }
          )
        );
        await Promise.all(updatePromises);
        
        // Update grouped task
        setGroupedTasks(prev => prev.map(t => 
          t.id === task.id ? { ...t, status: newStatus, individual_tasks: t.individual_tasks.map(it => ({ ...it, status: newStatus })) } : t
        ));
      } else {
        // Update single task with retry
        await withRetry(
          () => supabase.from('tasks').update({ status: newStatus }).eq('id', task.id),
          { maxRetries: 2 }
        );
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
      }
    } catch (e) {
      console.error('Error updating task status:', e);
      if (isRetryableError(e)) {
        // Show temporary error message
        setErrorTasks('Error de conexión al actualizar estado');
        setTimeout(() => setErrorTasks(null), 3000);
      }
    }
  };

  const handleDeleteClick = (task: Task | GroupedTask) => {
    setTaskToDelete(task);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    setIsLoadingTasks(true);
    setErrorTasks(null);
    
    try {
      if ('is_grouped' in taskToDelete && taskToDelete.is_grouped) {
        // Delete all individual tasks in the group with retry
        const deletePromises = taskToDelete.individual_tasks.map(task =>
          withRetry(
            () => supabase.from('tasks').delete().eq('id', task.id),
            { maxRetries: 2 }
          )
        );
        await Promise.all(deletePromises);
        setGroupedTasks(prev => prev.filter(t => t.id !== taskToDelete.id));
      } else {
        // Delete single task with retry
        await withRetry(
          () => supabase.from('tasks').delete().eq('id', taskToDelete.id),
          { maxRetries: 2 }
        );
        setTasks(prev => prev.filter(t => t.id !== taskToDelete.id));
      }
      
      setShowDeleteModal(false);
      setTaskToDelete(null);
    } catch (e) {
      console.error('Error deleting task:', e);
      if (isRetryableError(e)) {
        setErrorTasks('Error de conexión al eliminar tarea');
      } else {
        setErrorTasks(e instanceof Error ? e.message : 'Error desconocido al eliminar la tarea');
      }
    } finally {
      setIsLoadingTasks(false);
    }
  };

  const handleOpenDetailModal = (taskId: number | string) => {
    // For grouped tasks, open the first individual task
    if (currentUser?.role === 'admin') {
      const groupedTask = groupedTasks.find(t => t.id === taskId);
      if (groupedTask && groupedTask.individual_tasks.length > 0) {
        setSelectedTaskId(groupedTask.individual_tasks[0].id);
      } else {
        setSelectedTaskId(taskId);
      }
    } else {
      setSelectedTaskId(taskId);
    }
    setShowDetailModal(true);
  };

  const renderTaskCard = (task: Task | GroupedTask, isOk: boolean) => (
    <div
      key={task.id}
      className="bg-white shadow-lg rounded-lg p-5 hover:shadow-xl transition-shadow cursor-pointer flex flex-col"
      onClick={e => {
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
        >
          {isOk ? <CheckCircle size={22} fill="none" strokeWidth={2} /> : <Circle size={22} strokeWidth={2} />}
        </button>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <h2 className="text-lg font-semibold text-gray-800">{task.name}</h2>
            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getPriorityClass(task.priority)}`}>
              {task.priority || 'N/A'}
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-1 line-clamp-2 h-10">{task.description || 'Sin descripción.'}</p>
        </div>
      </div>
      <div className="text-xs text-gray-500 my-3">
        {'store_names' in task ? (
          <span className="block">Tiendas: {task.store_names.join(', ')}</span>
        ) : (
          <span className="block">Tienda: {(task as Task).store_name || task.store_id}</span>
        )}
        <span className="block">Vence: {task.due_date || 'N/A'}</span>
        <span className="block font-medium">Asignada a: {task.assigned_user_name ?? 'N/A'}</span>
        {'is_grouped' in task && task.is_grouped && (
          <span className="block text-indigo-600 font-medium">Tarea agrupada ({task.individual_tasks.length} tiendas)</span>
        )}
      </div>
      <div className="flex justify-start items-center mt-auto">
        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusClass(task.status)}`}>
          {task.status || 'N/A'}
        </span>
      </div>
    </div>
  );

  const renderGridView = () => (
    <div>
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
            {pendingTasks.length > 0 ? pendingTasks.map(task => renderTaskCard(task, false)) : 
              <div className="p-4 text-gray-500 col-span-full">No hay tareas pendientes.</div>}
          </div>
        )}
      </div>
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
            {okTasks.length > 0 ? okTasks.map(task => renderTaskCard(task, true)) : 
              <div className="p-4 text-gray-500 col-span-full">No hay tareas OK.</div>}
          </div>
        )}
      </div>
    </div>
  );

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
                    onClick={() => handleOpenDetailModal(task.id)}
                    className={`text-xs p-1 mb-1 rounded cursor-pointer ${getStatusClass(task.status)} truncate`}
                    title={`${task.name} - ${task.assigned_user_name ?? ''}`}
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

  const renderTasksTable = (tasksToShow: (Task | GroupedTask)[]) => (
    <table className="w-full table-auto divide-y divide-gray-200 text-sm sm:text-base">
      <thead className="bg-gray-100">
        <tr>
          <th className="px-2 py-3 sm:px-6 sm:py-4"></th>
          <th className="px-2 py-3 sm:px-6 sm:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tarea</th>
          <th className="px-2 py-3 sm:px-6 sm:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tienda(s)</th>
          <th className="px-2 py-3 sm:px-6 sm:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Asignado A</th>
          <th className="px-2 py-3 sm:px-6 sm:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Vence</th>
          <th className="px-2 py-3 sm:px-6 sm:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Prioridad</th>
          <th className="px-2 py-3 sm:px-6 sm:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Estado</th>
          <th className="px-2 py-3 sm:px-6 sm:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Acciones</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {tasksToShow.map(task => {
          const isOk = normalizeStatus(task.status) === 'ok';
          return (
            <tr key={task.id} className="hover:bg-indigo-50 transition-colors duration-150 cursor-pointer"
              onClick={e => {
                if ((e.target as HTMLElement).closest('button[data-delete],button[data-status]')) return;
                handleOpenDetailModal(task.id);
              }}
            >
              <td className="px-2 py-3 sm:px-3 sm:py-4 whitespace-nowrap align-middle text-center">
                <button
                  data-status
                  onClick={e => { e.stopPropagation(); handleToggleTaskStatus(task); }}
                  className={`transition-colors rounded-full p-1 focus:outline-none ${isOk ? 'text-teal-600' : 'text-gray-400 hover:text-indigo-500'}`}
                  title={isOk ? 'Marcar como Pendiente' : 'Marcar como OK'}
                >
                  {isOk ? <CheckCircle size={22} fill="none" strokeWidth={2} /> : <Circle size={22} strokeWidth={2} />}
                </button>
              </td>
              <td className="px-2 py-3 sm:px-6 sm:py-4 whitespace-nowrap align-middle">
                <div className="text-sm font-medium text-gray-900">{task.name}</div>
                <div className="text-xs text-gray-500 line-clamp-1">{task.description || "Sin descripción"}</div>
                {'is_grouped' in task && task.is_grouped && (
                  <div className="text-xs text-indigo-600 font-medium">Agrupada ({task.individual_tasks.length} tiendas)</div>
                )}
              </td>
              <td className="px-2 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-700 align-middle">
                {'store_names' in task ? task.store_names.join(', ') : (task as Task).store_name || task.store_id}
              </td>
              <td className="px-2 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-700 align-middle">
                {task.assigned_user_name ?? 'N/A'}
              </td>
              <td className="px-2 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-700 align-middle">
                {task.due_date ?? 'N/A'}
              </td>
              <td className="px-2 py-3 sm:px-6 sm:py-4 whitespace-nowrap align-middle">
                <span className={`px-2 py-1 text-xs leading-5 font-semibold rounded-full ${getPriorityClass(task.priority)}`}>
                  {task.priority || 'N/A'}
                </span>
              </td>
              <td className="px-2 py-3 sm:px-6 sm:py-4 whitespace-nowrap align-middle">
                <span className={`px-2 py-1 text-xs leading-5 font-semibold rounded-full ${getStatusClass(task.status)}`}>
                  {task.status || 'N/A'}
                </span>
              </td>
              <td className="px-2 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm font-medium align-middle">
                {currentUser?.role === 'admin' && (
                  <button 
                    data-delete 
                    onClick={e => { e.stopPropagation(); handleDeleteClick(task); }} 
                    className="text-red-600 hover:text-red-800 focus:outline-none" 
                    title="Eliminar Tarea"
                  >
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
      {showDeleteModal && taskToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full relative">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Eliminar tarea</h2>
            <p className="mb-6 text-gray-700">
              ¿Estás seguro de que deseas eliminar la tarea <span className='font-semibold'>{taskToDelete.name}</span>? 
              {'is_grouped' in taskToDelete && taskToDelete.is_grouped && (
                <span className="block mt-2 text-red-600 font-medium">
                  Esto eliminará la tarea de {taskToDelete.individual_tasks.length} tiendas.
                </span>
              )}
              Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200">
                Cancelar
              </button>
              <button onClick={handleConfirmDelete} className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="mb-4 border rounded-lg bg-white shadow">
        <button
          className="w-full flex items-center justify-between px-4 py-3 text-lg font-semibold text-gray-800 hover:bg-gray-50 focus:outline-none"
          onClick={() => setIsPendingOpen(open => !open)}
        >
          <span>🕒 Pendiente ({pendingTasks.length})</span>
          <span className={`transform transition-transform ${isPendingOpen ? '' : '-rotate-90'}`}>▼</span>
        </button>
        {isPendingOpen && (
          <div className="p-2 pt-0">
            {pendingTasks.length > 0 ? renderTasksTable(pendingTasks) : 
              <div className="p-4 text-gray-500">No hay tareas pendientes.</div>}
          </div>
        )}
      </div>
      
      <div className="mb-4 border rounded-lg bg-white shadow">
        <button
          className="w-full flex items-center justify-between px-4 py-3 text-lg font-semibold text-gray-800 hover:bg-gray-50 focus:outline-none"
          onClick={() => setIsOkOpen(open => !open)}
        >
          <span>✔️ OK ({okTasks.length})</span>
          <span className={`transform transition-transform ${isOkOpen ? '' : '-rotate-90'}`}>▼</span>
        </button>
        {isOkOpen && (
          <div className="p-2 pt-0">
            {okTasks.length > 0 ? renderTasksTable(okTasks) : 
              <div className="p-4 text-gray-500">No hay tareas OK.</div>}
          </div>
        )}
      </div>
    </div>
  );

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

  const availableStoresForFilter = Array.from(new Set(stores.map(s => s.id)));
  const usersForFilterDropdown = Array.from(new Set(users.map(u => u.auth_id)));

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

      {/* Filters */}
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
              {stores.map(store => (
                <option key={store.id} value={store.id}>{store.name}</option>
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
            {users.map(user => (
              <option key={user.auth_id} value={user.auth_id}>{user.name}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end items-end h-full">
          <button
            type="button"
            onClick={handleResetFilters}
            className="p-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg shadow-sm border border-gray-300 transition flex items-center"
            title="Resetear Filtros"
          >
            <Eraser size={20} />
          </button>
        </div>
      </div>

      {filteredTasks.length === 0 && <p className="text-gray-600">No hay tareas para mostrar.</p>}
      
      {viewMode === 'table' ? renderTableView() : viewMode === 'grid' ? renderGridView() : renderCalendarView()}

      {/* Task Detail Modal */}
      {showDetailModal && selectedTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="relative bg-white rounded-2xl shadow-2xl p-0 max-w-3xl w-full mx-4" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <TaskDetailContent 
              taskId={selectedTaskId} 
              onClose={() => setShowDetailModal(false)}
              onStatusChange={(updatedStatus) => {
                setTasks(prev => prev.map(t => t.id === selectedTaskId ? { ...t, status: updatedStatus } : t));
                if (currentUser?.role === 'admin') {
                  setGroupedTasks(prev => prev.map(gt => ({
                    ...gt,
                    individual_tasks: gt.individual_tasks.map(it => 
                      it.id === selectedTaskId ? { ...it, status: updatedStatus } : it
                    ),
                    status: gt.individual_tasks.some(it => it.id === selectedTaskId) ? 
                      (gt.individual_tasks.every(it => it.id === selectedTaskId || it.status === updatedStatus) ? updatedStatus : gt.status) : 
                      gt.status
                  })));
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default TaskList;