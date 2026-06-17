import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Megaphone, Send, Trash2, Tag, Users } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

type Broadcast = {
  id: string;
  title: string | null;
  message: string;
  category: string | null;
  sent_by_id: string;
  created_at: string;
  read_count: number;
};

const AdminBroadcasts = () => {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('');

  const loadBroadcasts = async () => {
    try {
      const data = await api.get<Broadcast[]>('/api/broadcasts/admin');
      setBroadcasts(data ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load broadcasts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBroadcasts();
  }, []);

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Message is required.');
      return;
    }

    setSending(true);
    try {
      await api.post('/api/broadcasts', {
        title: title.trim() || undefined,
        message: message.trim(),
        category: category.trim() || undefined,
      });
      toast.success('Broadcast sent to all users.');
      setTitle('');
      setMessage('');
      setCategory('');
      await loadBroadcasts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send broadcast.');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await api.delete(`/api/broadcasts/${id}`);
      toast.success('Broadcast deleted.');
      setBroadcasts(prev => prev.filter(b => b.id !== id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete broadcast.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AdminLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <div className="mb-8">
          <h1 className="admin-header">Broadcasts</h1>
          <p className="text-muted-foreground mt-2">Send announcements to all creators on the platform.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Compose form */}
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Megaphone className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-semibold">New Broadcast</h2>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bc-title">Title (optional)</Label>
              <Input
                id="bc-title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Platform Update"
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bc-category">Category (optional)</Label>
              <Input
                id="bc-category"
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="e.g. Maintenance, Policy, Feature"
                maxLength={80}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bc-message">
                Message <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="bc-message"
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Write your announcement here..."
                rows={5}
                maxLength={5000}
              />
              <p className="text-xs text-muted-foreground text-right">{message.length}/5000</p>
            </div>

            <Button onClick={() => void handleSend()} disabled={sending || !message.trim()} className="w-full sm:w-auto">
              <Send className="mr-2 h-4 w-4" />
              {sending ? 'Sending...' : 'Send to All Users'}
            </Button>
          </div>

          {/* Broadcast history */}
          <div className="space-y-4">
            <h2 className="font-display text-lg font-semibold">Sent Broadcasts</h2>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
              </div>
            ) : broadcasts.length === 0 ? (
              <div className="glass-card p-10 text-center">
                <Megaphone className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No broadcasts sent yet.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {broadcasts.map((b, i) => (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="glass-card p-4 space-y-2"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        {b.title && (
                          <p className="font-semibold text-sm truncate">{b.title}</p>
                        )}
                        {b.category && (
                          <Badge variant="outline" className="text-xs flex items-center gap-1 shrink-0">
                            <Tag className="h-3 w-3" />
                            {b.category}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3.5 w-3.5" />
                          {b.read_count} read
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void handleDelete(b.id)}
                          disabled={deletingId === b.id}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                      {b.message}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(b.created_at).toLocaleString()}
                    </p>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AdminLayout>
  );
};

export default AdminBroadcasts;
