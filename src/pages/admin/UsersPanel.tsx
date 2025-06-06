import { useState, useEffect } from 'react';
import { useAuth } from '../../AuthContext';
import EditUserModal from '../../components/EditUserModal';
import AddUserModal from '../../components/AddUserModal';
import { User } from '../../types';
import supabase from '../../config/supabaseClient';

function UsersPanel() {
  const [usersData, setUsersData] = useState<User[]>([]);
  const [stores, setStores] = useState<{ id: number, name: string }[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const availableRoles = ['admin', 'supervisor', 'employee'];
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser?.role !== 'admin') {
      setError("Acceso denegado. Solo administradores pueden ver esta página.");
      setIsLoading(false);
      setUsersData([]);
      return;
    }
    const fetchUsersAndStores = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data: usersData, error: usersError } = await supabase.from('users').select('*');
        if (usersError) throw new Error(usersError.message);
        setUsersData(usersData || []);
        const { data: storesData, error: storesError } = await supabase.from('stores').select('id, name');
        if (storesError) throw new Error(storesError.message);
        setStores(storesData || []);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Error desconocido";
        setError(`Error cargando usuarios o tiendas: ${msg}.`);
        console.error("Error fetching users or stores:", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsersAndStores();
  }, [currentUser]);

  const handleEditUser = (userToEdit: User) => {
    setEditingUser(userToEdit);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleSaveUser = async (updatedUser: User) => {
    if (!updatedUser) return;
    setError(null);
    try {
      const { error: updateError } = await supabase.from('users').update(updatedUser).eq('id', updatedUser.id);
      if (updateError) throw new Error(updateError.message);
      setUsersData(prev => prev.map(u => (u.id === updatedUser.id ? updatedUser : u)));
      handleCloseModal();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      setError(`Error guardando usuario: ${msg}`);
      console.error("Error saving user:", e);
    }
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: usersError } = await supabase.from('users').select('*');
      if (usersError) throw new Error(usersError.message);
      setUsersData(data || []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      setError(`Error cargando usuarios: ${msg}.`);
      console.error("Error fetching users:", e);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center">Cargando...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;

  return (
    <div>
      <div className="mb-4">
        <button
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded"
          onClick={() => setIsAddUserOpen(true)}
        >
          Agregar Usuario
        </button>
      </div>
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tienda</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {usersData.length > 0 ? usersData.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{stores.find(s => String(s.id) === String(user.store_id))?.name || 'Sin tienda'}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    user.role === 'admin' ? 'bg-red-100 text-red-800' :
                    user.role === 'supervisor' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {user.role === 'admin' ? 'Administrador' : user.role === 'supervisor' ? 'Supervisor' : 'Vendedor'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button onClick={() => handleEditUser(user)} className="text-indigo-600 hover:text-indigo-900">
                    Editar
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  No hay usuarios para mostrar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <EditUserModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        user={editingUser}
        onSave={handleSaveUser}
        availableRoles={availableRoles}
      />
      <AddUserModal
        isOpen={isAddUserOpen}
        onClose={() => setIsAddUserOpen(false)}
        onUserAdded={fetchUsers}
      />
    </div>
  );
}

export default UsersPanel;