// src/pages/CreateTask.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { User, Task, RecurrencePattern } from '../types';
import supabase from '../config/supabaseClient';
import { ClipboardList, Megaphone } from 'lucide-react';

function CreateTask() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    assignedUserAuthId: string; // Cambiado de assignedUserId
    stores: string[];
    due_date: string;
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
    due_date: '',
    priority: 'Rutinaria',
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
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'tasks' | 'announcements'>('tasks');
  const [overlayMessage, setOverlayMessage] = useState<string | null>(null);
  const [overlayType, setOverlayType] = useState<'success' | 'error' | null>(null);

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

  // Checkbox handler para tiendas
  const handleStoreCheckboxChange = (storeName: string) => {
    setFormData(prev => {
      if (prev.stores.includes(storeName)) {
        return { ...prev, stores: prev.stores.filter(s => s !== storeName) };
      } else {
        return { ...prev, stores: [...prev.stores, storeName] };
      }
    });
  };

  // Handler para seleccionar/deseleccionar todas
  const handleSelectAllStores = (checked: boolean) => {
    setFormData(prev => ({ ...prev, stores: checked ? stores : [] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    setShowModal(false); // Cierra el modal inmediatamente

    if (!currentUser) {
      setOverlayType('error');
      setOverlayMessage('No se pudo identificar al usuario actual para asignar la tarea.');
      setIsLoading(false);
      setTimeout(() => {
        setOverlayMessage(null);
        setOverlayType(null);
        setIsLoading(false);
      }, 2200);
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
        store: formData.stores.join(','),
        assigned_user_id: formData.assignedUserAuthId || null,
        due_date: formData.due_date,
        priority: formData.priority,
        status: 'Pendiente',
        task_type: formData.taskType,
        evidence_image_url: '',
        is_recurring: formData.isRecurring,
        recurrence_pattern: formData.isRecurring ? recurrencePattern : null,
        assigned_user_auth_id: formData.assignedUserAuthId || null,
      };
      const { error: insertError } = await supabase.from('tasks').insert(taskToInsert);
      if (insertError) throw insertError;
      setOverlayType('success');
      setOverlayMessage('¡Tarea creada exitosamente!');
      setTimeout(() => {
        setOverlayMessage(null);
        setOverlayType(null);
        setIsLoading(false);
      }, 1800);
    } catch (err) {
      setOverlayType('error');
      setOverlayMessage(err instanceof Error ? err.message : 'Ocurrió un error desconocido');
      setTimeout(() => {
        setOverlayMessage(null);
        setOverlayType(null);
        setIsLoading(false);
      }, 2200);
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

  // Filtrar usuarios según tiendas seleccionadas
  const filteredUsers = formData.stores.length === 0
    ? users
    : users.filter(u => formData.stores.includes(u.store));

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Panel de Tareas</h1>
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors duration-150 ${activeTab === 'tasks' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              onClick={() => setActiveTab('tasks')}
            >
              <ClipboardList className="w-5 h-5 mr-2" />
              Tareas
            </button>
            <button
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors duration-150 ${activeTab === 'announcements' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              onClick={() => setActiveTab('announcements')}
            >
              <Megaphone className="w-5 h-5 mr-2" />
              Comunicados
            </button>
          </nav>
        </div>
      </div>
      {activeTab === 'tasks' && (
        <div>
          <button
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded"
            onClick={() => setShowModal(true)}
          >
            Crear Tarea
          </button>
          {/* Aquí podrías agregar una lista de tareas creadas, si lo deseas */}
        </div>
      )}
      {activeTab === 'announcements' && (
        <div>
          <div className="flex flex-col items-center min-h-[200px] justify-center w-full text-center text-gray-500 text-lg">
            <Megaphone className="w-10 h-10 mb-4 text-indigo-400" />
            <span>Próximamente: sección de comunicados.</span>
          </div>
        </div>
      )}
      {showModal && !overlayMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white p-6 md:p-8 rounded-xl shadow-2xl max-w-2xl w-full relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl font-bold"
              aria-label="Cerrar"
            >
              ×
            </button>
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Crear Tarea</h2>
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
                {/* Tiendas primero */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tiendas *</label>
                  <div className="border rounded-md p-2 bg-gray-50 max-h-40 overflow-y-auto">
                    <label className="flex items-center mb-2 font-medium">
                      <input
                        type="checkbox"
                        checked={formData.stores.length === stores.length && stores.length > 0}
                        onChange={e => handleSelectAllStores(e.target.checked)}
                        className="mr-2"
                      />
                      Seleccionar todas
                    </label>
                    {stores.map(storeName => (
                      <label key={storeName} className="flex items-center mb-1">
                        <input
                          type="checkbox"
                          checked={formData.stores.includes(storeName)}
                          onChange={() => handleStoreCheckboxChange(storeName)}
                          className="mr-2"
                        />
                        {storeName}
                      </label>
                    ))}
                  </div>
                </div>
                {/* Usuarios después, filtrados por tiendas seleccionadas */}
                <div>
                  <label htmlFor="assignedUserAuthId" className="block text-sm font-medium text-gray-700 mb-1">
                    Asignar a Usuario
                  </label>
                  <select
                    name="assignedUserAuthId"
                    id="assignedUserAuthId"
                    className="mt-1 block w-full p-3 border border-gray-300 bg-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={formData.assignedUserAuthId}
                    onChange={handleChange}
                  >
                    <option value="">Sin asignar</option>
                    {filteredUsers.map((user) => (
                      (currentUser?.role === 'admin' || user.store === currentUser?.store) &&
                      <option key={user.id} value={user.auth_id}>{user.name} ({user.store})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha Límite *
                  </label>
                  <input
                    type="date"
                    name="due_date"
                    id="due_date"
                    required
                    className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={formData.due_date}
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
                    <option value="Rutinaria">Rutinaria</option>
                    <option value="Urgente">Urgente</option>
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
              <div className="pt-5">
                <div className="flex justify-center space-x-3">
                  <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-32 px-6 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                  Cancelar
                  </button>
                  <button
                  type="submit"
                  disabled={isLoading}
                  className="w-32 px-6 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
                  >
                  {isLoading ? 'Creando...' : 'Crear'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {overlayMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className={`bg-white rounded-xl shadow-2xl px-10 py-8 flex flex-col items-center justify-center max-w-md w-full`} role="alert">
            {overlayType === 'success' && (
              <svg className="w-12 h-12 mb-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="white" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2l4-4" />
              </svg>
            )}
            {overlayType === 'error' && (
              <svg className="w-12 h-12 mb-4 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <p className="text-lg font-semibold mb-2">{overlayType === 'success' ? 'Éxito' : 'Error'}</p>
            <p className="text-center text-gray-600">{overlayMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default CreateTask;
