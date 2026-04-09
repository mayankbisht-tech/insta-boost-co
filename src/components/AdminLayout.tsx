import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutDashboard, Megaphone, FileCheck, Users, LogOut, ArrowLeft, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';

const adminNav = [
  { path: '/admin', label: 'Overview', icon: LayoutDashboard },
  { path: '/admin/campaigns', label: 'Campaigns', icon: Megaphone },
  { path: '/admin/submissions', label: 'Submissions', icon: FileCheck },
  { path: '/admin/users', label: 'Users', icon: Users },
];

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const { signOut, isSuperadmin } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActivePath = (path: string) => (
    path === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(path)
  );

  return (
    <div className="min-h-screen bg-background md:flex">
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-sidebar-border/60 bg-card/95 px-4 backdrop-blur md:hidden">
        <Link to="/admin" className="font-display text-lg font-bold gradient-text flex items-center gap-2">
          <img src="/3.png" alt="Go Clips logo" className="h-8 w-8 object-contain" />
          Go Clips
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(open => !open)}
          className="rounded-md p-2 text-foreground hover:bg-muted"
          aria-label="Toggle admin navigation"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Sidebar */}
      <motion.aside 
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="hidden w-64 bg-gradient-to-b from-sidebar via-sidebar to-sidebar/80 border-r border-sidebar-border md:flex md:flex-col md:shrink-0"
      >
        <div className="p-3 border-b border-sidebar-border/50">
          <Link to="/admin" className="font-display text-2xl font-bold gradient-text flex items-center gap-2">
            <img src="/3.png" alt="Go Clips logo" className="h-16 w-16 object-contain" />
            Go Clips
          </Link>
          <p className="text-xs text-sidebar-foreground/60 mt-1">Admin Panel</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {adminNav.map((item, i) => {
            const isActive = isActivePath(item.path);
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

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.25 }}
              className="fixed left-0 top-14 bottom-0 z-50 w-[85vw] max-w-xs bg-gradient-to-b from-sidebar via-sidebar to-sidebar/90 border-r border-sidebar-border p-4 md:hidden"
            >
              <nav className="space-y-2">
                {adminNav.map(item => {
                  const isActive = isActivePath(item.path);

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent/40'
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-4 border-t border-sidebar-border/50 pt-4 space-y-2">
                {isSuperadmin && (
                  <Link
                    to="/superadmin"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/40 transition-all duration-300"
                  >
                    <Users className="h-4 w-4" />
                    Superadmin Panel
                  </Link>
                )}
                <Link
                  to="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/40 transition-all duration-300"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Creator Dashboard
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    signOut();
                  }}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-300 w-full"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <main className="flex-1 overflow-x-hidden p-4 sm:p-6 md:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
};

export default AdminLayout;
