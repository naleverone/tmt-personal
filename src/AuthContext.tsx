import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from './config/supabaseClient';
import { User } from '@supabase/supabase-js';
import { withRetry, isRetryableError } from './utils/retryUtils';

interface AppUser {
  id: string;
  name: string;
  email: string;
  store_id: string; // Changed to string (UUID)
  role: 'supervisor' | 'employee' | 'admin' | string;
}

interface AuthContextType {
  currentUser: AppUser | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, store_id: string) => Promise<boolean>; // Changed parameter type
  logout: () => Promise<void>;
  isLoading: boolean;
  connectionError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleInvalidSession = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      localStorage.clear();
      setCurrentUser(null);
      setConnectionError(null);
      navigate('/login');
    }
  }, [navigate]);

  const loadUserProfile = useCallback(async (user: User) => {
    try {
      const profileData = await withRetry(
        async () => {
          const { data, error } = await supabase
            .from('users')
            .select('name, store_id, role')
            .eq('auth_id', user.id)
            .single();

          if (error) throw error;
          return data;
        },
        { maxRetries: 3 }
      );

      setCurrentUser({
        id: user.id,
        email: user.email || '',
        name: profileData.name,
        store_id: profileData.store_id, // Now a UUID string
        role: profileData.role,
      });
      setConnectionError(null);
    } catch (error) {
      console.error('Error loading user profile:', error);
      if (isRetryableError(error)) {
        setConnectionError('Error de conexión al cargar perfil de usuario');
      } else {
        await handleInvalidSession();
      }
    }
  }, [handleInvalidSession]);

  // Debounced session refresh to prevent excessive calls
  const refreshSession = useCallback(async () => {
    try {
      const { data: { session }, error } = await withRetry(
        () => supabase.auth.getSession(),
        { maxRetries: 2 }
      );
      
      if (error) throw error;
      
      if (!session) {
        setCurrentUser(null);
        setConnectionError(null);
      } else if (session.user && !currentUser) {
        await loadUserProfile(session.user);
      }
    } catch (error) {
      console.error('Error refreshing session:', error);
      if (isRetryableError(error)) {
        setConnectionError('Error de conexión');
      }
    }
  }, [currentUser, loadUserProfile]);

  // Load stored user on mount and setup auth listener
  useEffect(() => {
    let mounted = true;
    
    const initializeAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (error || !data.session?.user) {
          await handleInvalidSession();
        } else {
          await loadUserProfile(data.session.user);
        }
      } catch (error) {
        if (mounted) {
          console.error('Auth initialization error:', error);
          if (isRetryableError(error)) {
            setConnectionError('Error de conexión inicial');
          }
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes with error handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('Auth state changed:', { event, session: !!session });
        
        try {
          if (session?.user) {
            await loadUserProfile(session.user);
          } else {
            setCurrentUser(null);
            setConnectionError(null);
          }
        } catch (error) {
          console.error('Auth state change error:', error);
          if (isRetryableError(error)) {
            setConnectionError('Error de conexión en cambio de estado');
          }
        } finally {
          setIsLoading(false);
        }
      }
    );

    // Reduced frequency session refresh - only on focus, not visibility change
    let refreshTimeout: NodeJS.Timeout;
    const handleFocus = () => {
      if (!mounted) return;
      
      // Debounce refresh calls
      clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => {
        if (mounted && document.hasFocus()) {
          refreshSession();
        }
      }, 1000);
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      mounted = false;
      clearTimeout(refreshTimeout);
      subscription.unsubscribe();
      window.removeEventListener('focus', handleFocus);
    };
  }, [handleInvalidSession, loadUserProfile, refreshSession]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setConnectionError(null);
      
      const { data, error } = await withRetry(
        () => supabase.auth.signInWithPassword({ email, password }),
        { maxRetries: 2 }
      );

      if (error) throw error;

      if (data.user) {
        await loadUserProfile(data.user);
        navigate('/');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error logging in:', error);
      if (isRetryableError(error)) {
        setConnectionError('Error de conexión al iniciar sesión');
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    store_id: string // Changed from number to string (UUID)
  ): Promise<boolean> => {
    try {
      setIsLoading(true);
      setConnectionError(null);
      
      const { data: signUpData, error: signUpError } = await withRetry(
        () => supabase.auth.signUp({ email, password }),
        { maxRetries: 2 }
      );
      
      if (signUpError) throw signUpError;

      const userId = signUpData.user?.id;
      if (!userId) throw new Error('No se pudo obtener el ID del usuario');

      await withRetry(
        () => supabase.from('users').insert([{
          auth_id: userId,
          name,
          email,
          store_id: store_id, // Now a UUID string
          role: 'employee',
        }]),
        { maxRetries: 2 }
      );

      return true;
    } catch (error) {
      console.error('Error registering user:', error);
      if (isRetryableError(error)) {
        setConnectionError('Error de conexión al registrar usuario');
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setConnectionError(null);
      await supabase.auth.signOut();
      setCurrentUser(null);
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      if (isRetryableError(error)) {
        setConnectionError('Error de conexión al cerrar sesión');
      }
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      currentUser, 
      login, 
      register, 
      logout, 
      isLoading, 
      connectionError 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};