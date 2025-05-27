// src/pages/CreateTask.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { User, Task, RecurrencePattern } from '../types';
import supabase from '../config/supabaseClient';

function CreateTask() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    assignedUserAuthId: string; // Cambiado de assignedUserId
    stores: string[];
    dueDate: string;
    priority: Task['priority'];
    taskType: string;
    isRecurring: boolean;
    recurrenceType: RecurrencePattern['type'];
    interval: number;
    daysOfWeek: number[];
    dayOfMonth: number;
    recurrenceEndDate: string;
  }>({
    name: '',
    description: '',
    assignedUserAuthId: '', // Cambiado de assignedUserId
    stores: currentUser?.role === 'supervisor' ? [currentUser.store] : [],
    dueDate: '',
    priority: 'Medium',
    taskType: '',
    isRecurring: false,
    recurrenceType: 'weekly',
    interval: 1,
    daysOfWeek: [],
    dayOfMonth: 1,
    recurrenceEndDate: '',
  });

  const [users, setUsers] = useState<User[]>([]);
  const [stores, setStores] = useState<string[]>([]); // available store names
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDataForForm = async () => {
      try {
        // Obtener usuarios desde Supabase
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('*');
        if (usersError) throw new Error('Failed to fetch users');
        setUsers(usersData || []);
        const uniqueStores = Array.from(new Set((usersData || []).map(u => u.store))).sort();
        setStores(uniqueStores);
        if (currentUser?.role === 'admin' && uniqueStores.length > 0) {
          // Optional: select first store by default for admin
          // setFormData(prev => ({...prev, store: uniqueStores[0]}));
        }
      } catch {
        setError('Error al cargar usuarios');
      }
    };
    fetchDataForForm();
  }, [currentUser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    // Adaptar para assignedUserAuthId
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleStoresChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const options = Array.from(e.target.selectedOptions).map(o => o.value);
    setFormData(prev => ({ ...prev, stores: options }));
  };

  const handleDayOfWeekChange = (day: number) => {
    setFormData(prev => {
      const newDays = prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day];
      return { ...prev, daysOfWeek: newDays };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!currentUser) {
        setError("No se pudo identificar al usuario actual para asignar la tarea.");
        setIsLoading(false);
        return;
    }
    
    try {
      let recurrencePattern: RecurrencePattern | undefined;
      
      if (formData.isRecurring) {
        recurrencePattern = {
          type: formData.recurrenceType,
          interval: formData.interval,
          endDate: formData.recurrenceEndDate || undefined
        };

        if (formData.recurrenceType === 'weekly') {
          recurrencePattern.daysOfWeek = formData.daysOfWeek;
        } else if (formData.recurrenceType === 'monthly') {
          recurrencePattern.dayOfMonth = formData.dayOfMonth;
        }
      }

      const taskToInsert = {
        name: formData.name,
        description: formData.description,
        stores: formData.stores,
        assigned_user_auth_id: formData.assignedUserAuthId,
        dueDate: formData.dueDate,
        priority: formData.priority,
        status: 'Pending',
        taskType: formData.taskType,
        isRecurring: formData.isRecurring,
        recurrencePattern: recurrencePattern
      };

      const { error: insertError } = await supabase.from('tasks').insert(taskToInsert);
      if (insertError) throw insertError;

      alert('¡Tarea creada exitosamente!');
      navigate(currentUser.role === 'employee' ? '/tasks' : '/store');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error desconocido');
      console.error("Error creating task:", err);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (currentUser?.role !== 'supervisor' && currentUser?.role !== 'admin') {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">No tienes permiso para crear tareas.</p>
        <button onClick={() => navigate('/')} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
          Volver al Inicio
        </button>
      </div>
    );
  }

  const weekDays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-2xl mx-auto bg-white p-6 md:p-8 rounded-xl shadow-2xl">
        <button onClick={() => navigate(-1)} className="mb-6 text-indigo-600 hover:text-indigo-800 flex items-center text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Volver
        </button>
        <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">Crear Nueva Tarea</h1>
        
        {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded" role="alert"><p>{error}</p></div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre de la Tarea *
            </label>
            <input
              type="text"
              name="name"
              id="name"
              required
              className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={formData.name}
              onChange={handleChange}
              placeholder="Ej: Limpieza Bodega Semanal"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              name="description"
              id="description"
              rows={4}
              className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={formData.description}
              onChange={handleChange}
              placeholder="Instrucciones detalladas de la tarea..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="assignedUserAuthId" className="block text-sm font-medium text-gray-700 mb-1">
                Asignar a Usuario *
              </label>
              <select
                name="assignedUserAuthId"
                id="assignedUserAuthId"
                required
                className="mt-1 block w-full p-3 border border-gray-300 bg-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={formData.assignedUserAuthId}
                onChange={handleChange}
              >
                <option value="">Seleccionar usuario...</option>
                {users.map((user) => (
                  (currentUser?.role === 'admin' || user.store === currentUser?.store) &&
                  <option key={user.id} value={user.auth_id}>{user.name} ({user.store})</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="stores" className="block text-sm font-medium text-gray-700 mb-1">
                Tiendas *
              </label>
              <select
                name="stores"
                id="stores"
                multiple={currentUser?.role === 'admin'}
                required
                disabled={currentUser?.role === 'supervisor'}
                className="mt-1 block w-full p-3 border border-gray-300 bg-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100"
                value={formData.stores}
                onChange={currentUser?.role === 'supervisor' ? undefined : handleStoresChange}
              >
                {currentUser?.role === 'supervisor' ? (
                  <option value={currentUser.store}>{currentUser.store}</option>
                ) : (
                  stores.map((storeName) => (
                    <option key={storeName} value={storeName}>{storeName}</option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Límite *
              </label>
              <input
                type="date"
                name="dueDate"
                id="dueDate"
                required
                className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={formData.dueDate}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                Prioridad
              </label>
              <select
                name="priority"
                id="priority"
                className="mt-1 block w-full p-3 border border-gray-300 bg-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={formData.priority}
                onChange={handleChange}
              >
                <option value="Medium">Media</option>
                <option value="High">Alta</option>
                <option value="Low">Baja</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="taskType" className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Tarea
            </label>
            <select
              name="taskType"
              id="taskType"
              className="mt-1 block w-full p-3 border border-gray-300 bg-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={formData.taskType}
              onChange={handleChange}
            >
              <option value="">Seleccionar tipo...</option>
              <option value="Limpieza">Limpieza</option>
              <option value="Visual Merchandising">Visual Merchandising</option>
              <option value="Operaciones">Operaciones</option>
              <option value="Inventario">Inventario</option>
              <option value="Mantenimiento">Mantenimiento</option>
              <option value="Apertura">Apertura</option>
              <option value="Cierre">Cierre</option>
              <option value="Capacitación">Capacitación</option>
              <option value="Compras">Compras</option>
              <option value="Incidencia">Incidencia</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          {currentUser?.role === 'admin' && (
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isRecurring"
                  name="isRecurring"
                  checked={formData.isRecurring}
                  onChange={handleChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="isRecurring" className="ml-2 block text-sm text-gray-900">
                  Tarea Recurrente
                </label>
              </div>

              {formData.isRecurring && (
                <div className="space-y-4 pl-6">
                  <div>
                    <label htmlFor="recurrenceType" className="block text-sm font-medium text-gray-700">
                      Tipo de Recurrencia
                    </label>
                    <select
                      id="recurrenceType"
                      name="recurrenceType"
                      value={formData.recurrenceType}
                      onChange={handleChange}
                      className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                      <option value="daily">Diaria</option>
                      <option value="weekly">Semanal</option>
                      <option value="monthly">Mensual</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="interval" className="block text-sm font-medium text-gray-700">
                      Intervalo
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        id="interval"
                        name="interval"
                        min="1"
                        value={formData.interval}
                        onChange={handleChange}
                        className="mt-1 block w-24 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                      <span className="text-sm text-gray-500">
                        {formData.recurrenceType === 'daily' ? 'días' :
                         formData.recurrenceType === 'weekly' ? 'semanas' : 'meses'}
                      </span>
                    </div>
                  </div>

                  {formData.recurrenceType === 'weekly' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Días de la Semana
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {weekDays.map((day, index) => (
                          <label key={day} className="inline-flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.daysOfWeek.includes(index)}
                              onChange={() => handleDayOfWeekChange(index)}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">{day}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {formData.recurrenceType === 'monthly' && (
                    <div>
                      <label htmlFor="dayOfMonth" className="block text-sm font-medium text-gray-700">
                        Día del Mes
                      </label>
                      <input
                        type="number"
                        id="dayOfMonth"
                        name="dayOfMonth"
                        min="1"
                        max="31"
                        value={formData.dayOfMonth}
                        onChange={handleChange}
                        className="mt-1 block w-24 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>
                  )}

                  <div>
                    <label htmlFor="recurrenceEndDate" className="block text-sm font-medium text-gray-700">
                      Fecha de Fin (opcional)
                    </label>
                    <input
                      type="date"
                      id="recurrenceEndDate"
                      name="recurrenceEndDate"
                      value={formData.recurrenceEndDate}
                      onChange={handleChange}
                      min={new Date().toISOString().split('T')[0]}
                      className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="pt-5">
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-6 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
              >
                {isLoading ? 'Creando...' : 'Crear Tarea'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateTask;
