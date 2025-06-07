import React from 'react';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { useConnectionStatus } from '../hooks/useConnectionStatus';

const ConnectionIndicator: React.FC = () => {
  const { isOnline, isConnected, retryCount } = useConnectionStatus();

  if (isOnline && isConnected) {
    return null; // Don't show anything when connection is good
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center space-x-2 px-4 py-2 rounded-lg shadow-lg">
      {!isOnline ? (
        <div className="bg-red-100 text-red-800 border border-red-200 flex items-center space-x-2 px-3 py-2 rounded-lg">
          <WifiOff size={16} />
          <span className="text-sm font-medium">Sin conexión a internet</span>
        </div>
      ) : !isConnected ? (
        <div className="bg-yellow-100 text-yellow-800 border border-yellow-200 flex items-center space-x-2 px-3 py-2 rounded-lg">
          <AlertCircle size={16} />
          <span className="text-sm font-medium">
            Reconectando... {retryCount > 0 && `(${retryCount})`}
          </span>
        </div>
      ) : null}
    </div>
  );
};

export default ConnectionIndicator;