import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutDashboard, FileVideo, Instagram, Bell, LogOut, Menu, X, Shield, Wallet, Megaphone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/submissions', label: 'Submissions', icon: FileVideo },
  { path: '/instagram', label: 'Instagram', icon: Instagram },
  { path: '/payments', label: 'Payments', icon: Wallet },
];

type Notification = {
  id: string;
  read: boolean;
};

type Broadcast = {
  id: string;
  read: boolean;
};

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, signOut, isAdmin, isSuperadmin } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadBroadcasts, setUnreadBroadcasts] = useState(0);

  const refreshUnreadCount = async () => {
    if (!user) {
      setUnreadCount(0);
      setUnreadBroadcasts(0);
      return;
    }

    try {
      const data = await api.get<Notification[]>('/api/notifications');
      setUnreadCount(data.filter(item => !item.read).length);
    } catch {
      setUnreadCount(0);
    }

    try {
      const data = await api.get<Broadcast[]>('/api/broadcasts');
      setUnreadBroadcasts(data.filter(item => !item.read).length);
    } catch {
      setUnreadBroadcasts(0);
    }
  };

  useEffect(() => {
    void refreshUnreadCount();
  }, [user, location.pathname]);

  useEffect(() => {
    const handleNotificationsRead = () => {
      setUnreadCount(0);
    };

    const handleBroadcastsRead = () => {
      setUnreadBroadcasts(0);
    };

    window.addEventListener('notifications:read-all', handleNotificationsRead);
    window.addEventListener('broadcasts:read-all', handleBroadcastsRead);
    return () => {
      window.removeEventListener('notifications:read-all', handleNotificationsRead);
      window.removeEventListener('broadcasts:read-all', handleBroadcastsRead);
    };
  }, []);

  return (
    <div className="editorial-shell min-h-screen text-foreground">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/[0.06] to-transparent" />
      <header className="sticky top-0 z-50 border-b border-white/10 bg-background/80 backdrop-blur-2xl">
        <div className="container flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-3">
            <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Link to="/dashboard" className="inline-flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] p-2 shadow-[0_10px_30px_rgba(0,0,0,0.24)]">
                <img src="/3.png" alt="Viralkaro" className="h-full w-full object-contain" />
              </div>
              <div className="hidden sm:block">
                <p className="font-display text-lg font-bold tracking-tight bg-gradient-to-r from-[#c5c0ff] to-[#ffb59e] bg-clip-text text-transparent">Viralkaro</p>
                <p className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground font-semibold">Creator Portal</p>
              </div>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            {isAdmin && (
              <Link to={isSuperadmin ? "/superadmin" : "/admin"} className="flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15 sm:px-4">
                <Shield className="h-3.5 w-3.5" /> {isSuperadmin ? 'Superadmin' : 'Admin'}
              </Link>
            )}
            <Link to="/announcements" className="relative rounded-full p-2 transition-colors hover:bg-white/[0.05]" title="Announcements">
              <Megaphone className="h-4 w-4 text-muted-foreground" />
              {unreadBroadcasts > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                  {unreadBroadcasts > 9 ? '9+' : unreadBroadcasts}
                </span>
              )}
            </Link>
            <Link to="/notifications" className="relative rounded-full p-2 transition-colors hover:bg-white/[0.05]">
              <Bell className="h-4 w-4 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
            <span className="hidden sm:block text-sm text-muted-foreground">
              {profile?.username ? `@${profile.username}` : profile?.name || profile?.email}
            </span>
            <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:text-destructive">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden border-b border-white/10 bg-background/95 p-4 space-y-1 backdrop-blur-2xl"
          >
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
            <Link
              to="/announcements"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === '/announcements'
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]'
              }`}
            >
              <span className="flex items-center gap-2">
                <Megaphone className="h-4 w-4" />
                Announcements
              </span>
              {unreadBroadcasts > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {unreadBroadcasts > 9 ? '9+' : unreadBroadcasts}
                </span>
              )}
            </Link>
            <Link
              to="/notifications"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === '/notifications'
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]'
              }`}
            >
              <span className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative z-10 container px-4 py-4 sm:px-6 sm:py-6">{children}</main>
    </div>
  );
};

export default DashboardLayout;
