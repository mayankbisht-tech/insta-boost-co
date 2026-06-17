import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { motion } from 'framer-motion';
import { MessageCircle, Send, Loader2, ArrowLeft, Search, PenSquare } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { getRealtimeSocket } from '@/lib/realtime';

type SupportMessage = {
  id: string;
  user_id: string;
  message: string;
  from_admin: boolean;
  read_at: string | null;
  created_at: string;
};

type ThreadSummary = {
  user: {
    id: string;
    name: string;
    username: string | null;
    email: string;
  };
  latest_message: SupportMessage;
  unread_from_user: number;
};

type ThreadDetail = {
  user: ThreadSummary['user'];
  messages: SupportMessage[];
};

type UserOption = {
  id: string;
  name: string;
  username: string | null;
  email: string;
};

const AdminSupport = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [selected, setSelected] = useState<ThreadDetail | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // New conversation state
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  const loadThreads = async () => {
    try {
      const data = await api.get<ThreadSummary[]>('/api/support/threads');
      setThreads(data ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load threads.');
    } finally {
      setLoadingThreads(false);
    }
  };

  // Support opening a thread directly via navigation state (from AdminUsers "Message" button)
  useEffect(() => {
    const state = location.state as { openUserId?: string; user?: UserOption } | null;
    if (state?.openUserId) {
      void openThread(state.openUserId, state.user);
      // Clear the state so refreshing doesn't re-open
      navigate('/admin/support', { replace: true, state: {} });
    }
  }, []);

  useEffect(() => {
    void loadThreads();

    const socket = getRealtimeSocket();
    const handler = () => void loadThreads();
    socket.on('support:new-message', handler);
    return () => { socket.off('support:new-message', handler); };
  }, []);

  const openThread = async (userId: string, knownUser?: UserOption) => {
    setLoadingThread(true);
    setSelected(null);
    setShowNewDialog(false);
    try {
      const data = await api.get<ThreadDetail>(`/api/support/threads/${userId}`);
      setSelected(data);
      void loadThreads();
    } catch (error) {
      // If no messages exist yet (404 or empty), create a skeleton thread with user info
      if (knownUser) {
        setSelected({ user: knownUser, messages: [] });
      } else {
        toast.error(error instanceof Error ? error.message : 'Failed to load thread.');
      }
    } finally {
      setLoadingThread(false);
    }
  };

  const loadAllUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await api.get<UserOption[]>('/api/admin/users');
      setAllUsers(data ?? []);
    } catch {
      toast.error('Failed to load users.');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleNewConversation = () => {
    setShowNewDialog(true);
    if (allUsers.length === 0) void loadAllUsers();
  };

  useEffect(() => {
    if (!selected) return;

    const socket = getRealtimeSocket();
    const handler = (msg: SupportMessage) => {
      if (msg.user_id === selected.user.id) {
        setSelected(prev =>
          prev ? { ...prev, messages: [...prev.messages, msg] } : prev,
        );
      }
    };

    socket.on(`support:message:${selected.user.id}`, handler);
    return () => { socket.off(`support:message:${selected.user.id}`, handler); };
  }, [selected?.user.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selected?.messages.length]);

  const handleSend = async () => {
    if (!reply.trim() || !selected || sending) return;

    const userId = selected.user.id;
    setSending(true);
    try {
      const msg = await api.post<SupportMessage>(`/api/support/threads/${userId}`, {
        message: reply.trim(),
      });
      setSelected(prev =>
        prev ? { ...prev, messages: [...prev.messages, msg] } : prev,
      );
      setReply('');
      // Make sure this thread appears in the list now
      void loadThreads();
    } catch (error) {
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

  const filteredUsers = allUsers.filter(u => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return true;
    return [u.name, u.username, u.email].filter(Boolean).some(v => v!.toLowerCase().includes(q));
  });

  return (
    <AdminLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="admin-header">Support</h1>
            <p className="text-muted-foreground mt-2">One-on-one conversations with creators.</p>
          </div>
          <Button onClick={handleNewConversation} className="flex items-center gap-2">
            <PenSquare className="h-4 w-4" />
            New Conversation
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[320px_1fr]" style={{ minHeight: 500 }}>
          {/* Thread list */}
          <div className={`glass-card overflow-hidden ${selected || showNewDialog ? 'hidden lg:flex' : 'flex'} flex-col`}>
            <div className="border-b border-white/10 px-4 py-3">
              <p className="font-semibold text-sm">Conversations</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loadingThreads ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : threads.length === 0 ? (
                <div className="py-10 text-center px-4 space-y-3">
                  <MessageCircle className="h-8 w-8 text-muted-foreground mx-auto" />
                  <p className="text-xs text-muted-foreground">No conversations yet.</p>
                  <Button size="sm" variant="outline" onClick={handleNewConversation}>
                    Start one
                  </Button>
                </div>
              ) : (
                threads.map(t => (
                  <button
                    key={t.user.id}
                    onClick={() => void openThread(t.user.id)}
                    className={`w-full text-left px-4 py-3 border-b border-white/5 transition-colors hover:bg-white/[0.04] ${
                      selected?.user.id === t.user.id ? 'bg-white/[0.06]' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm truncate">
                        {t.user.username ? `@${t.user.username}` : t.user.name}
                      </p>
                      {t.unread_from_user > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shrink-0">
                          {t.unread_from_user > 9 ? '9+' : t.unread_from_user}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {t.latest_message.from_admin ? 'You: ' : ''}
                      {t.latest_message.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(t.latest_message.created_at).toLocaleString()}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right panel: new conversation picker OR thread detail */}
          <div className={`glass-card flex flex-col overflow-hidden ${!selected && !showNewDialog && !loadingThread ? 'hidden lg:flex' : 'flex'}`}>

            {/* ── New conversation: user picker ── */}
            {showNewDialog && !selected && (
              <>
                <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
                  <Button size="icon" variant="ghost" className="h-7 w-7 lg:hidden" onClick={() => setShowNewDialog(false)}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <p className="font-semibold text-sm">Choose a user to message</p>
                </div>

                <div className="p-3 border-b border-white/10">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      placeholder="Search by name, username or email…"
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {loadingUsers ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-8">No users found.</p>
                  ) : (
                    filteredUsers.map(u => (
                      <button
                        key={u.id}
                        onClick={() => void openThread(u.id, u)}
                        className="w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/[0.04] transition-colors"
                      >
                        <p className="font-medium text-sm">
                          {u.username ? `@${u.username}` : u.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}

            {/* ── Loading thread ── */}
            {loadingThread && (
              <div className="flex flex-1 items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* ── Empty state ── */}
            {!loadingThread && !selected && !showNewDialog && (
              <div className="flex flex-1 items-center justify-center py-16 text-center px-8">
                <div className="space-y-3">
                  <MessageCircle className="h-10 w-10 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">Select a conversation or start a new one.</p>
                  <Button size="sm" variant="outline" onClick={handleNewConversation}>
                    <PenSquare className="mr-2 h-4 w-4" />
                    New Conversation
                  </Button>
                </div>
              </div>
            )}

            {/* ── Thread detail ── */}
            {!loadingThread && selected && (
              <>
                <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 lg:hidden"
                    onClick={() => { setSelected(null); setShowNewDialog(false); }}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {selected.user.username ? `@${selected.user.username}` : selected.user.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{selected.user.email}</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {selected.messages.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-sm text-muted-foreground">No messages yet. Send the first one!</p>
                    </div>
                  ) : (
                    selected.messages.map(msg => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.from_admin ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                            msg.from_admin
                              ? 'bg-primary text-primary-foreground rounded-tr-none'
                              : 'bg-muted text-foreground rounded-tl-none'
                          }`}
                        >
                          {msg.message}
                          <p className={`text-[10px] mt-1 ${msg.from_admin ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={bottomRef} />
                </div>

                <div className="border-t border-white/10 p-3 flex items-end gap-2">
                  <Textarea
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message… (Enter to send)"
                    className="min-h-[40px] max-h-[120px] resize-none text-sm"
                    rows={1}
                  />
                  <Button
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => void handleSend()}
                    disabled={!reply.trim() || sending}
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </AdminLayout>
  );
};

export default AdminSupport;
