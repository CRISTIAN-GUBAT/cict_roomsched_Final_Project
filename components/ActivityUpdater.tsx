
'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

export function StatusUpdater() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const updateOnlineStatus = async (isOnline: boolean) => {
      try {
        await api.patch(`/api/users/${user.id}/update-status`, {
          is_online: isOnline
        });
      } catch (error) {
        console.log('Could not update online status:', error);
      }
    };

    // Mark as online when component mounts (user is active)
    updateOnlineStatus(true);

    // Update activity periodically while user is active
    const activityInterval = setInterval(() => {
      updateOnlineStatus(true);
    }, 60000); // Update every minute

    // Handle page visibility (tab switch)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User switched tabs or minimized window
        updateOnlineStatus(false);
      } else {
        // User came back to tab
        updateOnlineStatus(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup function - mark as offline when component unmounts
    return () => {
      clearInterval(activityInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      updateOnlineStatus(false);
    };
  }, [user]);

  return null;
}