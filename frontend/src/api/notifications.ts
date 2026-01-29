import axios from 'axios';
import type { Notification } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const AUTH_TOKEN_KEY = 'ghi_auth_token';

export const notificationsApi = {
  async getNotifications(limit = 50, unreadOnly = false): Promise<Notification[]> {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const response = await axios.get(`${API_URL}/api/v1/notifications`, {
      params: { limit, unread_only: unreadOnly },
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    return response.data;
  },

  async getUnreadCount(): Promise<number> {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const response = await axios.get(`${API_URL}/api/v1/notifications/unread-count`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    return response.data.count;
  },

  async markAsRead(notificationId: string): Promise<Notification> {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const response = await axios.patch(
      `${API_URL}/api/v1/notifications/${notificationId}/read`,
      {},
      {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      }
    );
    return response.data;
  },

  async markAllAsRead(): Promise<number> {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const response = await axios.patch(
      `${API_URL}/api/v1/notifications/mark-all-read`,
      {},
      {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      }
    );
    return response.data.marked_read;
  },
};
