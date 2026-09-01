import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { motion } from 'framer-motion';
import { Megaphone, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

type Broadcast = {
  id: string;
  title: string | null;
  message: string;
  category: string | null;
  sent_by_id: string;
  created_at: string;
  read: boolean;
};

const Announcements = () => {
  const { user } = useAuth();
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      try {
        const data = await api.get<Broadcast[]>('/api/broadcasts');
        setBroadcasts(data ?? []);

        // Mark all as read
        await api.post('/api/broadcasts/read-all');
        setBroadcasts(prev => prev.map(b => ({ ...b, read: true })));
        window.dispatchEvent(new Event('broadcasts:read-all'));
      } catch {
        setBroadcasts([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [user]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-4xl font-extrabold bg-gradient-to-r from-white to-[#c8c6c8] bg-clip-text text-transparent">Announcements</h1>
          <p className="mt-2 text-body-md text-muted-foreground">
            Platform-wide updates, events, and notifications from the Viralkaro admin team.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : broadcasts.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#1a1a1c]/60 p-12 text-center">
            <Megaphone className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No announcements yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {broadcasts.map((b, i) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`rounded-2xl border border-white/10 bg-[#1a1a1c]/60 backdrop-blur-xl p-6 transition-all hover:bg-[#1a1a1c]/80 shadow-[0_15px_30px_-15px_rgba(0,0,0,0.5)] ${!b.read ? 'border-l-2 border-l-[#ffb59e]' : ''}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div className="flex flex-wrap items-center gap-3">
                    {!b.read && (
                      <span className="h-2.5 w-2.5 rounded-full bg-[#ffb59e] shrink-0" />
                    )}
                    {b.title && (
                      <p className="font-display text-lg font-bold text-foreground">{b.title}</p>
                    )}
                    {b.category && (
                      <Badge variant="outline" className="text-xs flex items-center gap-1.5 border-[#c5c0ff]/30 text-[#c5c0ff] bg-[#c5c0ff]/5 px-2.5 py-0.5 font-semibold">
                        <Tag className="h-3 w-3" />
                        {b.category}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground shrink-0 font-medium">
                    {new Date(b.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {b.message}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Announcements;
