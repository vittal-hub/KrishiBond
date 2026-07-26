import { useCallback, useEffect, useState } from 'react';
import { notificationApi } from '../api/communicationApi';
import { useAuth } from '../context/AuthContext.jsx';

export function useNotifications() {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await notificationApi.list();
      setNotifications(data);
    } catch {
      // silent fail — notifications are non-critical to core flows
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchNotifications]);

  const markRead = async (id) => {
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
    try {
      await notificationApi.markRead(id);
    } catch {
      fetchNotifications();
    }
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await notificationApi.markAllRead();
    } catch {
      fetchNotifications();
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount, markRead, markAllRead, refetch: fetchNotifications };
}
