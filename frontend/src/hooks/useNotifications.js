import { useCallback, useEffect, useState } from 'react';
import { notificationApi } from '../api/communicationApi';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';

export function useNotifications() {
  const { isAuthenticated } = useAuth();
  const socket = useSocket();
  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await notificationApi.list();
      setNotifications(data.notifications ?? []);
    } catch {
      // silent fail — notifications are non-critical to core flows
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    fetchNotifications();
    // Sockets push new notifications instantly; this is just a safety-net
    // in case a push is missed while the tab was backgrounded.
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchNotifications]);

  useEffect(() => {
    if (!socket) return undefined;
    const onNew = (notification) => {
      setNotifications((prev) => [{ ...notification, _id: notification.id }, ...prev]);
    };
    socket.on('notification:new', onNew);
    return () => socket.off('notification:new', onNew);
  }, [socket]);

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
