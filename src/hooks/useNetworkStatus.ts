import { useState, useEffect } from 'react';
import { onNetworkChange } from '../services/offlineQueue';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const off = onNetworkChange((online) => setIsOnline(online));
    return () => {
      off();
    };
  }, []);

  return isOnline;
}
