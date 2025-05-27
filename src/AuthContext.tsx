import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from './config/supabaseClient';
import { User } from '@supabase/supabase-js';

interface AppUser {
  id: string;
  name: string;
  email: string;
  store: string;
  role: 'supervisor' | 'employee' | 'admin' | string;
}

interface AuthContextType {
  currentUser: AppUser | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const handleInvalidSession = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      localStorage.clear();
      setCurrentUser(null);
      navigate('/login');
    }
  };

  // Load stored user on mount and setup auth listener
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data, error }) => {
      const session = data.session;
      if (error || !session?.user) {
        await handleInvalidSession();
      } else {
        await loadUserProfile(session.user);
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', { event, session });
        if (event === 'TOKEN_REFRESH_FAILED') {
          await handleInvalidSession();
          return;
        }
        try {
          if (session?.user) {
            await loadUserProfile(session.user);
          } else {
            setCurrentUser(null);
          }
        } finally {
          setIsLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (user: User) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('name, store, role')
        .eq('auth_id', user.id)
        .single();

      if (error) throw error;

      setCurrentUser({
        id: user.id,
        email: user.email || '',
        name: data.name,
        store: data.store,
        role: data.role,
      });
  } catch (error) {
    console.error('Error loading user profile:', error);
    try {
      await handleInvalidSession();
    } catch (logoutError) {
      console.error('Error logging out after failed profile load:', logoutError);
    }
  }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        await loadUserProfile(data.user);
        navigate('/');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error logging in:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string
  ): Promise<boolean> => {
    try {
      setIsLoading(true);
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signUpError) throw signUpError;

      const userId = signUpData.user?.id;
      if (!userId) throw new Error('No se pudo obtener el ID del usuario');

      const { error: insertError } = await supabase.from('users').insert([
        {
          auth_id: userId,
          name,
          email,
          store: '',
          role: 'employee',
        },
      ]);
      if (insertError) throw insertError;

      return true;
    } catch (error) {
      console.error('Error registering user:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setCurrentUser(null);
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, register, logout, isLoading }}>
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
