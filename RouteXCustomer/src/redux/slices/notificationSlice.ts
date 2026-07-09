import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface PushNotification {
  id: string;
  title: string;
  body: string;
  date: string;
  read: boolean;
  data?: Record<string, string>;
}

interface NotificationState {
  notifications: PushNotification[];
  unreadCount: number;
}

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
};

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    addNotification(
      state,
      action: PayloadAction<Omit<PushNotification, 'read' | 'date'>>,
    ) {
      const newNotification: PushNotification = {
        ...action.payload,
        date: new Date().toISOString(),
        read: false,
      };
      state.notifications.unshift(newNotification);
      state.unreadCount += 1;
    },
    markAllAsRead(state) {
      state.notifications.forEach(n => {
        n.read = true;
      });
      state.unreadCount = 0;
    },
    markAsRead(state, action: PayloadAction<string>) {
      const notification = state.notifications.find(
        n => n.id === action.payload,
      );
      if (notification && !notification.read) {
        notification.read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    clearNotifications(state) {
      state.notifications = [];
      state.unreadCount = 0;
    },
  },
});

export const {
  addNotification,
  markAllAsRead,
  markAsRead,
  clearNotifications,
} = notificationSlice.actions;

export default notificationSlice.reducer;
