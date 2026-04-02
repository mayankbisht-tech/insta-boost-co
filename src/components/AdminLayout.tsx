import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutDashboard, Megaphone, FileCheck, Users, LogOut, ArrowLeft, Zap } from 'lucide-react';
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
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <motion.aside 
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="w-64 bg-gradient-to-b from-sidebar via-sidebar to-sidebar/80 border-r border-sidebar-border flex flex-col shrink-0"
      >
        <div className="p-6 border-b border-sidebar-border/50">
          <Link to="/admin" className="font-display text-2xl font-bold gradient-text flex items-center gap-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            >
              <Zap className="h-6 w-6" />
            </motion.div>
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

      {/* Main */}
      <main className="flex-1 p-8 overflow-auto">
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
