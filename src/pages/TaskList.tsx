// src/pages/TaskList.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Task } from '../types';
import { CalendarDays, LayoutGrid } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import supabase from '../config/supabaseClient';

function TaskList() {
  const { currentUser } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [errorTasks, setErrorTasks] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'calendar'>('grid');
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
          tasksQuery = tasksQuery.contains('stores', [currentUser.store]);
        }
        const { data: tasksData, error: tasksError } = await tasksQuery;
        if (tasksError) throw new Error('Error al cargar tareas');

        // Obtener usuarios para mapear nombres
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('auth_id, name');
        if (usersError) throw new Error('Error al cargar usuarios');

        const tasksWithUserNames = (tasksData || []).map(task => ({
          ...task,
          assignedUserName: (users || []).find(u => u.auth_id === task.assigned_user_auth_id)?.name || 'Usuario no encontrado'
        }));
        setTasks(tasksWithUserNames);
      } catch (e) {
        setErrorTasks(e instanceof Error ? e.message : "Error desconocido al cargar tareas");
      } finally {
        setIsLoadingTasks(false);
      }
    };
    fetchData();
  }, [currentUser]);

  if (isLoadingTasks) return <div className="p-8 text-center">Cargando tareas...</div>;
  if (errorTasks) return <div className="p-8 text-center text-red-500">Error: {errorTasks}</div>;

  const getPriorityClass = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusClass = (status?: string) => {
    switch (status?.toLowerCase().replace(' ', '')) {
      case 'pending': return 'bg-orange-100 text-orange-700';
      case 'inprogress': return 'bg-blue-100 text-blue-700';
      case 'completed': return 'bg-teal-100 text-teal-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  let title = 'Mis Tareas Asignadas';
  if (currentUser?.role === 'admin') {
    title = 'Todas las Tareas (Admin)';
  } else if (currentUser?.role === 'supervisor') {
    title = `Tareas de Tienda: ${currentUser.store}`;
  }

  const getTasksForDate = (date: Date) => {
    return tasks.filter(task => task.dueDate && isSameDay(new Date(task.dueDate), date));
  };

  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {tasks.map(task => (
        <div key={task.id}
          className="bg-white shadow-lg rounded-lg p-5 hover:shadow-xl transition-shadow cursor-pointer"
          onClick={() => navigate(`/tasks/${task.id}`)}
        >
          <div className="flex justify-between items-start mb-2">
            <h2 className="text-lg font-semibold text-gray-800">{task.name}</h2>
            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getPriorityClass(task.priority)}`}>
              {task.priority || 'N/A'}
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-1 line-clamp-2 h-10">{task.description || 'Sin descripción.'}</p>
          <div className="text-xs text-gray-500 my-3">
            {task.stores && task.stores.length > 0 && (
              <span className="block">Tiendas: {task.stores.join(', ')}</span>
            )}
            <span className="block">Vence: {task.dueDate || 'N/A'}</span>
            <span className="block font-medium">Asignada a: {task.assignedUserName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusClass(task.status)}`}>
              {task.status || 'N/A'}
            </span>
          </div>
        </div>
      ))}
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
          const dayTasks = getTasksForDate(date);
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
                    title={`${task.name} - ${task.assignedUserName}`}
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

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{title}</h1>
        <div className="flex items-center space-x-2">
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
      
      {tasks.length === 0 && <p className="text-gray-600">No hay tareas para mostrar.</p>}
      {viewMode === 'grid' ? renderGridView() : renderCalendarView()}
    </div>
  );
}

export default TaskList;