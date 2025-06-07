import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import supabase from './config/supabaseClient';

function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [stores, setStores] = useState<{ id: number, name: string }[]>([]);
  const [storeId, setStoreId] = useState<number | ''>('');
  const navigate = useNavigate();
  const { register } = useAuth();

  useEffect(() => {
    const fetchStores = async () => {
      const { data, error } = await supabase.from('stores').select('id, name');
      if (!error) setStores(data || []);
    };
    fetchStores();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      if (!storeId) throw new Error('Debes seleccionar una tienda');
      const success = await register(name, email, password, storeId as number);
      if (success) {
        navigate('/login');
      } else {
        setError('No se pudo registrar el usuario.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al registrar.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white shadow-xl rounded-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">Registro</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nombre</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Contraseña</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="store" className="block text-sm font-medium text-gray-700">Tienda</label>
            <select
              id="store"
              value={storeId}
              onChange={e => setStoreId(e.target.value ? parseInt(e.target.value, 10) : '')}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">Seleccionar tienda...</option>
              {stores.map(store => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button type="submit" disabled={isLoading} className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 disabled:bg-indigo-300">
            {isLoading ? 'Registrando...' : 'Registrarse'}
          </button>
        </form>
        <div className="mt-4 text-center">
          <button onClick={() => navigate('/login')} className="text-indigo-600 hover:underline text-sm">¿Ya tienes cuenta? Inicia sesión</button>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;