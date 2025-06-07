import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Store } from '../../types';
import supabase from '../../config/supabaseClient';

interface EditingStore extends Partial<Store> {
  id?: string;
}

function StoresPanel() {
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingStore, setEditingStore] = useState<EditingStore>({});
  
  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: storesError } = await supabase.from('stores').select('*');
      if (storesError) throw new Error(storesError.message);
      setStores(data || []);
    } catch (error) {
      setError('Error loading stores. Please try again.');
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingStore.id) {
        // Update
        const { error: updateError } = await supabase.from('stores').update(editingStore).eq('id', editingStore.id);
        if (updateError) throw new Error(updateError.message);
      } else {
        // Insert
        const { error: insertError } = await supabase.from('stores').insert([editingStore]);
        if (insertError) throw new Error(insertError.message);
      }
      await fetchStores();
      setIsEditing(false);
      setEditingStore({});
    } catch (error) {
      setError('Error saving store. Please try again.');
      console.error('Error:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta tienda?')) return;
    try {
      const { error: deleteError } = await supabase.from('stores').delete().eq('id', id);
      if (deleteError) throw new Error(deleteError.message);
      await fetchStores();
    } catch (error) {
      setError('Error deleting store. Please try again.');
      console.error('Error:', error);
    }
  };

  const handleEdit = (store: Store) => {
    setEditingStore(store);
    setIsEditing(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditingStore(prev => ({ ...prev, [name]: value }));
  };

  if (isLoading) return <div className="text-center py-4">Cargando tiendas...</div>;

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => {
            setEditingStore({});
            setIsEditing(true);
          }}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          Agregar Nueva Tienda
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {isEditing && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
              {editingStore.id ? 'Editar Tienda' : 'Agregar Nueva Tienda'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nombre</label>
                <input
                  type="text"
                  name="name"
                  value={editingStore.name || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Calle</label>
                <input
                  type="text"
                  name="street_name"
                  value={editingStore.street_name || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Número</label>
                <input
                  type="text"
                  name="street_number"
                  value={editingStore.street_number || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Ciudad</label>
                <input
                  type="text"
                  name="city"
                  value={editingStore.city || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Estado/Región</label>
                <input
                  type="text"
                  name="state"
                  value={editingStore.state || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Info Adicional</label>
                <input
                  type="text"
                  name="additional_info"
                  value={editingStore.additional_info || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  {editingStore.id ? 'Guardar Cambios' : 'Crear Tienda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dirección</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ciudad</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Info Adicional</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {stores.length > 0 ? stores.map((store) => (
              <tr key={store.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{store.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{store.street_name} {store.street_number}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{store.city}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{store.state}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{store.additional_info}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button onClick={() => handleEdit(store)} className="text-indigo-600 hover:text-indigo-900 mr-2">Editar</button>
                  <button onClick={() => handleDelete(store.id)} className="text-red-600 hover:text-red-900">Eliminar</button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No hay tiendas para mostrar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default StoresPanel;