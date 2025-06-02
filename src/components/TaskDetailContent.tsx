import React, { useState, useEffect } from 'react';
import { Task, User, TaskEvidence } from '../types';
import { UploadCloud, CheckCircle, Circle } from 'lucide-react';
import { useAuth } from '../AuthContext';
import supabase from '../config/supabaseClient';

// Agrego la prop onStatusChange al tipo TaskDetailContentProps
interface TaskDetailContentProps {
  taskId: number | string;
  onClose?: () => void;
  onStatusChange?: (updatedStatus: string) => void;
}

const TaskDetailContent: React.FC<TaskDetailContentProps> = ({ taskId, onClose, onStatusChange }) => {
  const { currentUser } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignedUser, setAssignedUser] = useState<User | null>(null);
  const [newEvidenceFile, setNewEvidenceFile] = useState<File | null>(null);
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
  const [evidenceList, setEvidenceList] = useState<TaskEvidence[]>([]);

  useEffect(() => {
    const fetchTaskAndUser = async () => {
      if (!taskId) {
        setError('ID de tarea no proporcionado.');
        setIsLoading(false);
        return;
      }
      setIsLoading(true); setError(null);
      try {
        const { data: taskData, error: taskError } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', taskId)
          .single();
        if (taskError || !taskData) throw new Error('Tarea no encontrada.');
        const normalizedTask = {
          ...taskData,
          stores: Array.isArray(taskData.stores)
            ? taskData.stores
            : (typeof taskData.stores === 'string' && taskData.stores.length > 0)
              ? taskData.stores.split(',').map((s: string) => s.trim())
              : (typeof taskData.store === 'string' && taskData.store.length > 0)
                ? taskData.store.split(',').map((s: string) => s.trim())
                : [],
          due_date: taskData.due_date || '',
          priority: taskData.priority,
          status: taskData.status,
          taskType: taskData.task_type || taskData.taskType || '',
          assigned_user_auth_id: taskData.assigned_user_auth_id || taskData.assignedUserAuthId || '',
          evidenceImageUrl: taskData.evidence_image_url || taskData.evidenceImageUrl || '',
          isRecurring: taskData.is_recurring ?? taskData.isRecurring,
          recurrencePattern: taskData.recurrence_pattern ?? taskData.recurrencePattern,
        };
        setTask(normalizedTask as Task);
        const { data: evidenceData } = await supabase
          .from('task_evidence')
          .select('*')
          .eq('task_id', taskData.id)
          .order('created_at', { ascending: true });
        let combinedEvidence = Array.isArray(evidenceData) ? evidenceData as TaskEvidence[] : [];
        if (normalizedTask.evidenceImageUrl) {
          combinedEvidence = [
            ...combinedEvidence,
            {
              id: `legacy-${taskData.id}`,
              task_id: taskData.id,
              url: normalizedTask.evidenceImageUrl,
              uploaded_by_auth_id: normalizedTask.assigned_user_auth_id || '',
              created_at: normalizedTask.due_date || ''
            } as TaskEvidence,
          ];
        }
        setEvidenceList(combinedEvidence);
        if (normalizedTask.assigned_user_auth_id) {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('auth_id', normalizedTask.assigned_user_auth_id)
            .single();
          if (userError || !userData) {
            setAssignedUser({ id: -1, auth_id: normalizedTask.assigned_user_auth_id, name: `Auth ID: ${normalizedTask.assigned_user_auth_id}`, email: '', store: '', role: '' });
          } else {
            setAssignedUser(userData);
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error desconocido al cargar la tarea');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTaskAndUser();
  }, [taskId]);

  const handleEvidenceFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setNewEvidenceFile(event.target.files[0]);
    }
  };

  const handleEvidenceUpload = async () => {
    if (!task || !newEvidenceFile) return;
    setIsUploadingEvidence(true);
    try {
      const fileExt = newEvidenceFile.name.split('.').pop();
      const filePath = `task-${task.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('evidence')
        .upload(filePath, newEvidenceFile);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('evidence').getPublicUrl(filePath);
      const publicUrl = data.publicUrl;
      const { data: insertData, error: insertError } = await supabase
        .from('task_evidence')
        .insert({
          task_id: task.id,
          url: publicUrl,
          uploaded_by_auth_id: currentUser?.id ?? null,
        })
        .select()
        .single();
      if (insertError) throw insertError;
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ status: 'OK' })
        .eq('id', task.id);
      if (updateError) throw updateError;
      setTask({ ...task, status: 'OK' });
      setEvidenceList([...evidenceList, insertData as TaskEvidence]);
      setNewEvidenceFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir la evidencia');
    } finally {
      setIsUploadingEvidence(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-gray-700">Cargando detalle de tarea...</div>;
  if (error) return <div className="p-8 text-center text-red-600 bg-red-50 p-4 rounded-md">Error: {error}</div>;
  if (!task) return <div className="p-8 text-center text-gray-700">Tarea no encontrada.</div>;

  const canEditTask = currentUser?.role === 'admin' ||
    currentUser?.role === 'supervisor' ||
    currentUser?.role === 'employee' ||
    currentUser?.id === task.assigned_user_auth_id;

  return (
    <div className="rounded-xl p-6 md:p-8 max-w-2xl mx-auto relative">
      {onClose && (
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl font-bold z-10" aria-label="Cerrar">×</button>
      )}
      <div className="flex flex-col md:flex-row justify-between items-start mb-6 pb-6 border-b border-gray-200">
        <div className="flex items-center w-full">
          {/* Botón de estado a la izquierda del título */}
          <button
            data-status
            onClick={async e => {
              e.stopPropagation();
              if (!task) return;
              const newStatus = (task.status?.toLowerCase().replace(' ','') === 'ok') ? 'Pendiente' : 'OK';
              try {
                const { error: updateError } = await supabase
                  .from('tasks')
                  .update({ status: newStatus })
                  .eq('id', task.id);
                if (updateError) throw new Error('Error al actualizar estado de la tarea');
                setTask({ ...task, status: newStatus });
                if (onStatusChange) onStatusChange(newStatus);
              } catch (err) {
                setError(err instanceof Error ? err.message : 'No se pudo actualizar el estado');
              }
            }}
            className={`transition-colors rounded-full p-1 focus:outline-none mr-3 ${task.status?.toLowerCase().replace(' ','') === 'ok' ? 'text-teal-600' : 'text-gray-400 hover:text-indigo-500'}`}
            title={task.status?.toLowerCase().replace(' ','') === 'ok' ? 'Marcar como Pendiente' : 'Marcar como OK'}
            aria-label={task.status?.toLowerCase().replace(' ','') === 'ok' ? 'Marcar como Pendiente' : 'Marcar como OK'}
          >
            {task.status?.toLowerCase().replace(' ','') === 'ok'
              ? <CheckCircle size={28} fill="none" strokeWidth={2} />
              : <Circle size={28} strokeWidth={2} />}
          </button>
          <h1 className="text-3xl font-bold text-gray-800 mb-2 md:mb-0">{task.name}</h1>
        </div>
        <div className="flex space-x-2 mt-2 md:mt-0">
          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${task.priority?.toLowerCase() === 'urgente' || task.priority?.toLowerCase() === 'high' ? 'bg-red-100 text-red-700' : task.priority?.toLowerCase() === 'rutinaria' || task.priority?.toLowerCase() === 'medium' ? 'bg-yellow-100 text-yellow-700' : task.priority?.toLowerCase() === 'low' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{task.priority || 'N/A'}</span>
          <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${task.status?.toLowerCase().replace(' ','') === 'pendiente' ? 'bg-orange-50 text-orange-700 border-orange-200' : task.status?.toLowerCase().replace(' ','') === 'ok' ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>{task.status || 'N/A'}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-6 text-sm">
        <div><strong className="text-gray-500">Tipo de Tarea:</strong> <span className="text-gray-800">{task.task_type || 'No especificado'}</span></div>
        <div><strong className="text-gray-500">Tiendas:</strong> <span className="text-gray-800">{Array.isArray(task.stores) && task.stores.length > 0 ? task.stores.join(', ') : 'N/A'}</span></div>
        <div><strong className="text-gray-500">Asignada a:</strong> <span className="text-gray-800">{assignedUser?.name || (task.assigned_user_auth_id ? `Auth ID: ${task.assigned_user_auth_id}` : 'Nadie')}</span></div>
        <div><strong className="text-gray-500">Fecha Límite:</strong> <span className="text-gray-800">{task.due_date || 'No definida'}</span></div>
      </div>
      {task.description && (
        <div className="mb-6">
          <h3 className="text-md font-semibold text-gray-700 mb-1">Descripción:</h3>
          <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{task.description}</p>
        </div>
      )}
      {evidenceList.length > 0 && (
        <div className="mb-6">
          <h3 className="text-md font-semibold text-gray-700 mb-2">Evidencias:</h3>
          <EvidenceCarousel images={evidenceList.map(ev => ({ url: ev.url, id: String(ev.id) }))} />
        </div>
      )}
      {canEditTask && (
        <div className="mt-8 pt-6 border-t border-gray-200 space-y-6">
          {/* Solo mostrar la sección de evidencia, NO el select de estado */}
          <div>
            <label htmlFor="evidence-upload" className="block text-sm font-medium text-gray-700 mb-1">Subir/Actualizar Evidencia:</label>
            <div className="flex flex-col md:flex-row md:items-center md:space-x-3 space-y-2 md:space-y-0">
              <input
                id="evidence-upload"
                name="evidence-upload"
                type="file"
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                onChange={handleEvidenceFileChange}
                accept="image/*"
              />
              <button
                type="button"
                onClick={handleEvidenceUpload}
                disabled={!newEvidenceFile || isUploadingEvidence}
                className="px-5 py-3 bg-teal-600 text-white rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:bg-gray-300 flex items-center text-sm"
              >
                <UploadCloud size={18} className="mr-2" />
                {isUploadingEvidence ? 'Subiendo...' : 'Subir Evidencia'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const EvidenceCarousel: React.FC<{ images: { url: string; id: string }[] }> = ({ images }) => {
  const [current, setCurrent] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  if (images.length === 0) return null;
  const prev = () => setCurrent((c) => (c === 0 ? images.length - 1 : c - 1));
  const next = () => setCurrent((c) => (c === images.length - 1 ? 0 : c + 1));
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full flex justify-center items-center">
        <button onClick={prev} className="absolute left-0 z-10 bg-white bg-opacity-70 rounded-full p-2 shadow hover:bg-opacity-100 transition" aria-label="Anterior">
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <img
          src={images[current].url}
          alt={`Evidencia ${current + 1}`}
          className="max-w-xs md:max-w-md rounded-lg shadow-md border mx-8 cursor-pointer"
          onClick={() => setModalOpen(true)}
        />
        <button onClick={next} className="absolute right-0 z-10 bg-white bg-opacity-70 rounded-full p-2 shadow hover:bg-opacity-100 transition" aria-label="Siguiente">
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
      <div className="mt-2 flex space-x-2">
        {images.map((img, idx) => (
          <button
            key={img.id}
            onClick={() => setCurrent(idx)}
            className={`w-3 h-3 rounded-full ${idx === current ? 'bg-indigo-600' : 'bg-gray-300'}`}
            aria-label={`Ir a la imagen ${idx + 1}`}
          />
        ))}
      </div>
      <div className="text-xs text-gray-500 mt-1">{current + 1} / {images.length}</div>
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70" onClick={() => setModalOpen(false)}>
          <div
            className="relative bg-white rounded-lg shadow-lg flex items-center justify-center"
            style={{ maxWidth: '60vw', maxHeight: '60vh', width: 'auto', height: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-2xl font-bold z-10"
              onClick={() => setModalOpen(false)}
              aria-label="Cerrar"
            >
              ×
            </button>
            <img
              src={images[current].url}
              alt={`Evidencia ampliada ${current + 1}`}
              className="object-contain rounded max-w-full max-h-[60vh]"
              style={{ display: 'block', margin: '0 auto' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskDetailContent;
