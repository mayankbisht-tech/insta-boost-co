import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutDashboard, Megaphone, FileCheck, Users, LogOut, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const adminNav = [
  { path: '/admin', label: 'Overview', icon: LayoutDashboard },
  { path: '/admin/campaigns', label: 'Campaigns', icon: Megaphone },
  { path: '/admin/submissions', label: 'Submissions', icon: FileCheck },
  { path: '/admin/users', label: 'Users', icon: Users },
];

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const { signOut, isSuperadmin } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background lg:flex">
      {/* Sidebar */}
      <motion.aside 
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="hidden shrink-0 flex-col border-r border-sidebar-border bg-gradient-to-b from-sidebar via-sidebar to-sidebar/80 lg:flex lg:w-64"
      >
        <div className="p-6 border-b border-sidebar-border/50">
          <Link to="/admin" className="font-display text-2xl font-bold gradient-text flex items-center gap-2">
            <img src="/3.png" alt="Go Clips logo" className="h-6 w-6 object-contain" />
            Go Clips
          </Link>
          <p className="text-xs text-sidebar-foreground/60 mt-1">Admin Panel</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {adminNav.map((item, i) => {
            const isActive = (item.path === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(item.path));
            return (
              <motion.div
                key={item.path}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.1 }}
              >
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 relative group ${
                    isActive
                      ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/40'
                  }`}
                >
                  <item.icon className={`h-5 w-5 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                  {item.label}
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-indicator"
                      className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary-foreground to-transparent rounded-r"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </Link>
              </motion.div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border/50 space-y-2">
          {isSuperadmin && (
            <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
              <Link
                to="/superadmin"
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/40 transition-all duration-300"
              >
                <Users className="h-4 w-4" />
                Superadmin Panel
              </Link>
            </motion.div>
          )}
          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
            <Link
              to="/dashboard"
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/40 transition-all duration-300"
            >
              <ArrowLeft className="h-4 w-4" />
              Creator Dashboard
            </Link>
          </motion.div>
          <motion.button
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            onClick={signOut}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-300 w-full"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </motion.button>
        </div>
      </motion.aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-border bg-card lg:hidden">
          <div className="container space-y-3 py-4">
            <div className="flex items-center justify-between gap-3">
              <Link to="/admin" className="flex items-center gap-2 font-display text-lg font-bold gradient-text">
                <img src="/3.png" alt="Go Clips logo" className="h-6 w-6 object-contain" />
                Go Clips
              </Link>
              <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:text-destructive">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>

            <nav className="flex gap-2 overflow-x-auto pb-1">
              {adminNav.map(item => {
                const isActive = (item.path === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(item.path));

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {isSuperadmin && (
              <Link
                to="/superadmin"
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Users className="h-4 w-4" />
                Superadmin Panel
              </Link>
            )}
          </div>
        </header>

      {/* Main */}
      <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:overflow-auto lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {children}
        </motion.div>
      </main>
      </div>
    </div>
  );
};

export default AdminLayout;
