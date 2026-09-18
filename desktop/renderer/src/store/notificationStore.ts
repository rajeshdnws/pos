import { create } from 'zustand';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface AppNotification {
  id: string;
  type: NotificationType;
  message: string;
  durationMs?: number;
}

interface NotificationState {
  notifications: AppNotification[];
  notify: (type: NotificationType, message: string, durationMs?: number) => void;
  dismiss: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],

  notify: (type: NotificationType, message: string, durationMs: number = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newNotification: AppNotification = { id, type, message, durationMs };

    set((state) => ({
      notifications: [...state.notifications, newNotification],
    }));

    if (durationMs > 0) {
      setTimeout(() => {
        get().dismiss(id);
      }, durationMs);
    }
  },

  dismiss: (id: string) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },
}));
