import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { motion } from 'framer-motion';
import { Bell } from 'lucide-react';
import { api } from '@/lib/api';

type Notification = {
  id: string;
  user_id: string;
  message: string;
  read: boolean;
  created_at: string;
};

const Notifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadNotifications = async () => {
      try {
        const data = await api.get<Notification[]>('/api/notifications');
        if (data) {
          setNotifications(data);
        }

        await api.patch('/api/notifications/read-all');
        setNotifications(current => current.map(notification => ({ ...notification, read: true })));
        window.dispatchEvent(new Event('notifications:read-all'));
      } catch {
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };

    void loadNotifications();
  }, [user]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-4xl font-extrabold bg-gradient-to-r from-white to-[#c8c6c8] bg-clip-text text-transparent">Notifications</h1>
          <p className="mt-2 text-body-md text-muted-foreground">
            View status alerts, campaign submissions approvals, and verification checks.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#1a1a1c]/60 p-12 text-center">
            <Bell className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No notifications yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n, i) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`rounded-2xl border border-white/10 bg-[#1a1a1c]/60 backdrop-blur-xl p-5 transition-all hover:bg-[#1a1a1c]/80 shadow-[0_10px_20px_-10px_rgba(0,0,0,0.5)] ${!n.read ? 'border-l-2 border-l-[#ffb59e]' : ''}`}
              >
                <p className="text-sm text-foreground font-medium">{n.message}</p>
                <p className="text-xs text-muted-foreground mt-2 font-medium">
                  {n.created_at ? new Date(n.created_at).toLocaleString() : 'N/A'}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Notifications;
