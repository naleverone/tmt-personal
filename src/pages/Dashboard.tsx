import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import supabase from '../config/supabaseClient';
import { Megaphone } from 'lucide-react';

function Dashboard() {
  const { currentUser } = useAuth();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [storeMap, setStoreMap] = useState<Record<number, string>>({});
  const [storeName, setStoreName] = useState('');

  useEffect(() => {
    const fetchAnnouncements = async () => {
      if (!currentUser) return;
      // Fetch stores for mapping IDs to names
      const { data: storesData } = await supabase.from('stores').select('id, name');
      const storeMapObj: Record<number, string> = {};
      (storesData || []).forEach((s: any) => { storeMapObj[s.id] = s.name; });
      setStoreMap(storeMapObj);
      let query = supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (currentUser.role !== 'admin') {
        // Show only global announcements or those for the user's store (by ID)
        query = query.or(`target_store_ids.is.null,target_store_ids.cs.{${currentUser.store_id}}`);
      }
      const { data, error } = await query;
      if (!error) setAnnouncements(data || []);
    };
    fetchAnnouncements();
  }, [currentUser]);

  useEffect(() => {
    const fetchStoreName = async () => {
      if (!currentUser?.store_id) return;
      const { data, error } = await supabase.from('stores').select('name').eq('id', currentUser.store_id).single();
      if (!error && data) setStoreName(data.name);
    };
    fetchStoreName();
  }, [currentUser]);

  if (!currentUser) {
    return <p className="p-8 text-center">Por favor, inicia sesión.</p>;
  }
  return (
    <div className="p-8">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Bienvenido/a, {currentUser.name}</h1>
        <p className="text-gray-600">Tienda: {storeName || currentUser.store_id}</p>
        <p className="text-gray-500 text-sm">Rol: {currentUser.role === 'admin' ? 'Administrador' : currentUser.role === 'supervisor' ? 'Supervisor' : 'Vendedor'}</p>
      </div>

      {/* Active announcements */}
      <div className="max-w-3xl mx-auto">
        {announcements.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-bold mb-4 flex items-center justify-center text-indigo-700">
              <Megaphone className="w-7 h-7 mr-2 text-indigo-500" /> Comunicados Activos
            </h2>
            <div className="space-y-6">
              {announcements.map(a => (
                <div key={a.id} className="bg-gradient-to-r from-indigo-100 to-indigo-50 border-l-4 border-indigo-500 shadow-lg rounded-xl p-6 relative animate-fade-in">
                  <div className="flex items-center mb-2">
                    <Megaphone className="w-6 h-6 text-indigo-400 mr-2" />
                    <span className="font-semibold text-lg text-indigo-800">{a.title}</span>
                  </div>
                  <p className="text-gray-700 mb-2 whitespace-pre-line">{a.message}</p>
                  <div className="text-xs text-gray-500 flex justify-between items-center">
                    <span>Publicado: {new Date(a.created_at).toLocaleString()}</span>
                    <span>{!a.target_store_ids ? 'Todas las tiendas' : `Tiendas: ${a.target_store_ids.map((id: number) => storeMap[id] || id).join(', ')}`}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;