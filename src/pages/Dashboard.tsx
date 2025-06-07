import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import supabase from '../config/supabaseClient';
import { Megaphone } from 'lucide-react';
import { withRetry, isRetryableError } from '../utils/retryUtils';

function Dashboard() {
  const { currentUser } = useAuth();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [storeMap, setStoreMap] = useState<Record<string, string>>({});
  const [storeName, setStoreName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      if (!currentUser) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Fetch stores for mapping IDs to names with retry
        const storesResult = await withRetry(
          () => supabase.from('stores').select('id, name'),
          { maxRetries: 3 }
        );
        
        const storeMapObj: Record<string, string> = {};
        (storesResult.data || []).forEach((s: any) => { 
          storeMapObj[s.id] = s.name; 
        });
        setStoreMap(storeMapObj);
        
        let query = supabase
          .from('announcements')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });
          
        if (currentUser.role !== 'admin') {
          // Show only global announcements or those for the user's store (by UUID)
          query = query.or(`target_store_ids.is.null,target_store_ids.cs.{${currentUser.store_id}}`);
        }
        
        const announcementsResult = await withRetry(
          () => query,
          { maxRetries: 3 }
        );
        
        if (announcementsResult.error) throw announcementsResult.error;
        setAnnouncements(announcementsResult.data || []);
      } catch (err) {
        console.error('Error fetching announcements:', err);
        if (isRetryableError(err)) {
          setError('Error de conexión al cargar comunicados');
        } else {
          setError('Error al cargar comunicados');
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnnouncements();
  }, [currentUser]);

  useEffect(() => {
    const fetchStoreName = async () => {
      if (!currentUser?.store_id) return;
      
      try {
        const storeResult = await withRetry(
          () => supabase.from('stores').select('name').eq('id', currentUser.store_id).single(),
          { maxRetries: 3 }
        );
        
        if (!storeResult.error && storeResult.data) {
          setStoreName(storeResult.data.name);
        }
      } catch (err) {
        console.error('Error fetching store name:', err);
        // Don't show error for store name fetch failure
      }
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
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando comunicados...</p>
          </div>
        ) : error ? (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded mb-6">
            <p>{error}</p>
          </div>
        ) : announcements.length > 0 ? (
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
                    <span>{!a.target_store_ids ? 'Todas las tiendas' : `Tiendas: ${a.target_store_ids.map((id: string) => storeMap[id] || id).join(', ')}`}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default Dashboard;