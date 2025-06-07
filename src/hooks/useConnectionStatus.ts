import { useState, useEffect } from 'react';
import supabase from '../config/supabaseClient';

export interface ConnectionStatus {
  isOnline: boolean;
  isConnected: boolean;
  lastConnected: Date | null;
  retryCount: number;
}

export const useConnectionStatus = () => {
  const [status, setStatus] = useState<ConnectionStatus>({
    isOnline: navigator.onLine,
    isConnected: true,
    lastConnected: new Date(),
    retryCount: 0,
  });

  useEffect(() => {
    const handleOnline = () => {
      setStatus(prev => ({ ...prev, isOnline: true }));
      testConnection();
    };

    const handleOffline = () => {
      setStatus(prev => ({ ...prev, isOnline: false, isConnected: false }));
    };

    const testConnection = async () => {
      try {
        const { error } = await supabase.from('users').select('id').limit(1);
        if (error) throw error;
        
        setStatus(prev => ({
          ...prev,
          isConnected: true,
          lastConnected: new Date(),
          retryCount: 0,
        }));
      } catch (error) {
        console.warn('Connection test failed:', error);
        setStatus(prev => ({
          ...prev,
          isConnected: false,
          retryCount: prev.retryCount + 1,
        }));
      }
    };

    // Test connection every 30 seconds
    const connectionInterval = setInterval(testConnection, 30000);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial connection test
    testConnection();

    return () => {
      clearInterval(connectionInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return status;
};