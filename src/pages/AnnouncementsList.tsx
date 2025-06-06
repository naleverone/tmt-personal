import React, { useEffect, useState } from 'react';
import { Trash2, Edit } from 'lucide-react';
import supabase from '../config/supabaseClient';

interface Announcement {
  id: string;
  title: string;
  message: string;
  created_at: string;
  is_active: boolean;
  target_store_ids: string[] | null;
}

const AnnouncementsList: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [editForm, setEditForm] = useState({ title: '', message: '', target_store_ids: [] as string[] | null });
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) setError('Error al cargar comunicados');
      else setAnnouncements(data || []);
      setLoading(false);
    };
    fetchAnnouncements();
  }, []);

  const handleToggle = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from('announcements')
      .update({ is_active: !current })
      .eq('id', id);
    if (!error) {
      setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, is_active: !current } : a));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este comunicado?')) return;
    setDeletingId(id);
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (!error) {
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    }
    setDeletingId(null);
  };

  const openEditModal = (a: Announcement) => {
    setEditing(a);
    setEditForm({
      title: a.title,
      message: a.message,
      target_store_ids: a.target_store_ids ? [...a.target_store_ids] : null,
    });
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleEditStoreToggle = (storeId: string) => {
    setEditForm(prev => {
      if (!prev.target_store_ids) return { ...prev, target_store_ids: [storeId] };
      if (prev.target_store_ids.includes(storeId)) {
        const arr = prev.target_store_ids.filter(id => id !== storeId);
        return { ...prev, target_store_ids: arr.length ? arr : null };
      } else {
        return { ...prev, target_store_ids: [...prev.target_store_ids, storeId] };
      }
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSavingEdit(true);
    const { error } = await supabase.from('announcements').update({
      title: editForm.title,
      message: editForm.message,
      target_store_ids: editForm.target_store_ids,
    }).eq('id', editing.id);
    setSavingEdit(false);
    if (!error) {
      setAnnouncements(prev => prev.map(a => a.id === editing.id ? { ...a, ...editForm } : a));
      setEditing(null);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Comunicados</h1>
      {loading ? (
        <div>Cargando...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Título</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mensaje</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tiendas</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Activo</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {announcements.map(a => (
                <tr key={a.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{a.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 max-w-xs truncate">{a.message}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(a.created_at).toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{!a.target_store_ids ? 'Todas' : a.target_store_ids.join(', ')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <label className="inline-flex items-center cursor-pointer mr-3">
                      <input
                        type="checkbox"
                        checked={a.is_active}
                        onChange={() => handleToggle(a.id, a.is_active)}
                        className="form-checkbox h-5 w-5 text-indigo-600"
                      />
                    </label>
                    <button
                      className="text-indigo-600 hover:text-indigo-800 ml-2"
                      title="Editar"
                      onClick={() => openEditModal(a)}
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      className="text-red-600 hover:text-red-800 ml-2"
                      title="Eliminar"
                      onClick={() => handleDelete(a.id)}
                      disabled={deletingId === a.id}
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white p-6 md:p-8 rounded-xl shadow-2xl max-w-2xl w-full relative">
            <button
              onClick={() => setEditing(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl font-bold"
              aria-label="Cerrar"
            >×</button>
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Editar Comunicado</h2>
            <form onSubmit={handleEditSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                <input
                  type="text"
                  name="title"
                  required
                  className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={editForm.title}
                  onChange={handleEditChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje *</label>
                <textarea
                  name="message"
                  rows={4}
                  required
                  className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={editForm.message}
                  onChange={handleEditChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tiendas destinatarias</label>
                <div className="border rounded-md p-2 bg-gray-50 max-h-40 overflow-y-auto">
                  {/* Aquí deberías mapear los IDs de tiendas reales si los tienes en contexto */}
                  {Array.isArray(editForm.target_store_ids) && editForm.target_store_ids.length === 0 && (
                    <span className="text-gray-400">Ninguna tienda seleccionada</span>
                  )}
                  {/* Ejemplo: ['store1', 'store2'] */}
                  {editForm.target_store_ids && editForm.target_store_ids.map(storeId => (
                    <label key={storeId} className="flex items-center mb-1">
                      <input
                        type="checkbox"
                        checked={editForm.target_store_ids?.includes(storeId)}
                        onChange={() => handleEditStoreToggle(storeId)}
                        className="mr-2"
                      />
                      {storeId}
                    </label>
                  ))}
                </div>
              </div>
              <div className="pt-5 flex justify-center space-x-3">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="w-32 px-6 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >Cancelar</button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="w-32 px-6 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
                >{savingEdit ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnouncementsList;
