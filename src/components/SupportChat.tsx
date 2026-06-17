import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { getRealtimeSocket } from '@/lib/realtime';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type SupportMessage = {
  id: string;
  user_id: string;
  message: string;
  from_admin: boolean;
  read_at: string | null;
  created_at: string;
};

const SupportChat = () => {
  const { user, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load messages when opened
  useEffect(() => {
    if (!open || !user) return;

    const load = async () => {
      setLoading(true);
      try {
        const data = await api.get<SupportMessage[]>('/api/support/my-thread');
        setMessages(data ?? []);
        setUnread(0);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [open, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, open]);

  // Poll for unread count when chat is closed
  useEffect(() => {
    if (!user) return;

    const poll = async () => {
      try {
        const data = await api.get<{ unread_count: number }>('/api/support/my-thread/unread-count');
        setUnread(data?.unread_count ?? 0);
      } catch {
        // silent
      }
    };

    void poll();
    const interval = setInterval(() => void poll(), 30_000);
    return () => clearInterval(interval);
  }, [user]);

  // Real-time: listen for admin replies
  useEffect(() => {
    if (!user) return;

    const socket = getRealtimeSocket();
    const handler = (msg: SupportMessage) => {
      setMessages(prev => [...prev, msg]);
      if (!open) setUnread(c => c + 1);
    };

    socket.on(`support:message:${user.id}`, handler);
    return () => { socket.off(`support:message:${user.id}`, handler); };
  }, [user, open]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;

    const optimistic: SupportMessage = {
      id: `temp-${Date.now()}`,
      user_id: user!.id,
      message: text.trim(),
      from_admin: false,
      read_at: null,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, optimistic]);
    setText('');
    setSending(true);

    try {
      const saved = await api.post<SupportMessage>('/api/support/my-thread', {
        message: optimistic.message,
      });
      setMessages(prev => prev.map(m => (m.id === optimistic.id ? saved : m)));
    } catch (error) {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      toast.error(error instanceof Error ? error.message : 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  if (!user || isAdmin) return null;

  return (
    <>
      {/* Floating button */}
      <div className="fixed bottom-5 right-5 z-50">
        <Button
          size="icon"
          className="h-12 w-12 rounded-full shadow-lg relative"
          onClick={() => { setOpen(o => !o); setUnread(0); }}
          aria-label="Support chat"
        >
          <MessageCircle className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </div>

      {/* Chat window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 right-5 z-50 w-[min(360px,calc(100vw-2rem))] flex flex-col rounded-2xl border border-white/10 bg-background shadow-2xl overflow-hidden"
            style={{ maxHeight: 'min(520px, calc(100dvh - 120px))' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 bg-card/80 px-4 py-3 backdrop-blur">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-success" />
                <p className="font-display font-semibold text-sm">Support</p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="py-8 text-center">
                  <MessageCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">
                    Send a message and our team will get back to you.
                  </p>
                </div>
              ) : (
                messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.from_admin ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                        msg.from_admin
                          ? 'bg-muted text-foreground rounded-tl-none'
                          : 'bg-primary text-primary-foreground rounded-tr-none'
                      }`}
                    >
                      {msg.message}
                    </div>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-white/10 bg-card/80 p-3 flex items-end gap-2">
              <Textarea
                ref={textareaRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message… (Enter to send)"
                className="min-h-[40px] max-h-[100px] resize-none text-sm"
                rows={1}
              />
              <Button
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => void handleSend()}
                disabled={!text.trim() || sending}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SupportChat;
