// src/components/EditUserModal.tsx
import React, { useState, useEffect } from 'react';
import { Save, Ban } from 'lucide-react';
import { User } from '../types';
import supabase from '../config/supabaseClient';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSave: (updatedUser: User) => void;
  availableRoles: string[];
}

function EditUserModal({ isOpen, onClose, user, onSave, availableRoles }: EditUserModalProps) {
  const [formData, setFormData] = useState<User | null>(null);
  const [stores, setStores] = useState<{ id: number, name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const { data: storesData, error: storesError } = await supabase.from('stores').select('id, name');
        if (storesError) throw new Error('Failed to fetch stores');
        setStores(storesData || []);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching stores:', error);
        setIsLoading(false);
      }
    };

    fetchStores();
  }, []);

  useEffect(() => {
    if (user) {
      setFormData({ ...user });
    } else {
      setFormData(null);
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handleSave = () => {
    if (formData) {
      onSave(formData);
    }
  };

  const handleDelete = async () => {
    if (!formData) return;
    if (!window.confirm('¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.')) return;
    try {
      // 1. Elimina de la tabla users
      const { error: deleteError } = await supabase.from('users').delete().eq('auth_id', formData.auth_id);
      if (deleteError) throw new Error('Error al eliminar el usuario de la base de datos');

      // 2. Elimina de Supabase Auth usando el endpoint backend
      const response = await fetch('http://localhost:3001/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: formData.auth_id }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Error al eliminar el usuario de Auth');

      setSuccessMessage('Usuario eliminado completamente.');
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1500);
    } catch (err) {
      alert('Error al eliminar el usuario.');
      console.error('Error al eliminar el usuario:', err);
    }
  };

  if (!isOpen) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[60] flex justify-center items-center">
        <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
          <p className="text-center">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!formData) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[60] flex justify-center items-center">
      <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
        {successMessage && (
          <div className="mb-4 p-2 bg-green-100 text-green-800 rounded text-center text-sm">
            {successMessage}
          </div>
        )}
        <h3 className="text-lg leading-6 font-medium text-gray-900 text-center mb-4">Editar Usuario</h3>
        <div className="space-y-3 px-2">
          <div>
            <label htmlFor="name-modal" className="block text-sm font-medium text-gray-700">Nombre</label>
            <input type="text" name="name" id="name-modal" value={formData.name} onChange={handleChange} className="mt-1 p-2 w-full border border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"/>
          </div>
          <div>
            <label htmlFor="email-modal" className="block text-sm font-medium text-gray-700">Email</label>
            <input type="email" name="email" id="email-modal" value={formData.email} onChange={handleChange} className="mt-1 p-2 w-full border border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"/>
          </div>
          <div>
            <label htmlFor="store-modal" className="block text-sm font-medium text-gray-700">Tienda</label>
            <select name="store_id" id="store-modal" value={formData?.store_id || ''} onChange={handleChange} className="mt-1 p-2 w-full border border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
              {stores.map(store => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="role-modal" className="block text-sm font-medium text-gray-700">Rol</label>
            <select name="role" id="role-modal" value={formData.role} onChange={handleChange} className="mt-1 p-2 w-full border border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
              {availableRoles.map(r => <option key={r} value={r}>{r === 'admin' ? 'Administrador' : r === 'supervisor' ? 'Supervisor' : r === 'employee' ? 'Vendedor' : r}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-between pt-4 mt-4 border-t">
          <button onClick={onClose} className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm flex items-center"><Ban size={16} className="mr-1"/>Cancelar</button>
          <button onClick={handleSave} className="px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm flex items-center"><Save size={16} className="mr-1"/>Guardar</button>
          <button onClick={handleDelete} className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm flex items-center">Eliminar</button>
        </div>
      </div>
    </div>
  );
}

export default EditUserModal;

