import { useEffect } from 'react';
import { wsService } from '@/services/websocket';
import { useNotificationStore } from '@/stores';
import type { WSMessage } from '@/types';

export function useWebSocketNotifications() {
  const addNotification = useNotificationStore((state) => state.addNotification);

  useEffect(() => {
    // Subscribe to all events
    const unsubscribe = wsService.subscribe('*', (message: WSMessage) => {
      handleMessage(message);
    });

    return () => unsubscribe();
  }, [addNotification]);

  const handleMessage = (message: WSMessage) => {
    switch (message.type) {
      case 'session_connected':
        addNotification({
          type: 'success',
          title: 'New Session',
          message: `Session connected: ${(message.payload as { name?: string }).name || 'Unknown'}`,
          link: '/sessions',
        });
        break;

      case 'session_disconnected':
        addNotification({
          type: 'warning',
          title: 'Session Disconnected',
          message: `Session disconnected: ${(message.payload as { name?: string }).name || 'Unknown'}`,
          link: '/sessions',
        });
        break;

      case 'beacon_registered':
        addNotification({
          type: 'success',
          title: 'New Beacon',
          message: `Beacon registered: ${(message.payload as { name?: string }).name || 'Unknown'}`,
          link: '/beacons',
        });
        break;

      case 'beacon_checkin':
        // Don't notify for regular check-ins (too noisy)
        break;

      case 'job_started':
        addNotification({
          type: 'info',
          title: 'Job Started',
          message: `Listener started: ${(message.payload as { name?: string }).name || 'Unknown'}`,
          link: '/jobs',
        });
        break;

      case 'job_stopped':
        addNotification({
          type: 'warning',
          title: 'Job Stopped',
          message: `Listener stopped: ${(message.payload as { name?: string }).name || 'Unknown'}`,
          link: '/jobs',
        });
        break;

      case 'task_completed':
        addNotification({
          type: 'success',
          title: 'Task Completed',
          message: (message.payload as { description?: string }).description || 'Task completed',
        });
        break;

      case 'canary_triggered':
        addNotification({
          type: 'error',
          title: 'Canary Triggered!',
          message: `DNS canary triggered: ${(message.payload as { domain?: string }).domain || 'Unknown'}`,
          link: '/canaries',
        });
        break;

      case 'implant_built':
        addNotification({
          type: 'success',
          title: 'Implant Built',
          message: `Implant generated: ${(message.payload as { name?: string }).name || 'Unknown'}`,
          link: '/implants',
        });
        break;

      default:
        // Ignore other message types (ping, pong, shell_output, etc.)
        break;
    }
  };
}
