import { Link } from 'react-router-dom';
import { ShieldCheck, Users, ArrowLeft, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const SuperadminLayout = ({ children }: { children: React.ReactNode }) => {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container flex min-h-16 items-center justify-between gap-4 py-3">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <ShieldCheck className="h-5 w-5" />
              <span className="font-display text-xl font-bold">Go Clips Superadmin</span>
            </div>
            <p className="text-xs text-muted-foreground">Manual verification, admin oversight, and account controls</p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Users className="h-4 w-4" />
              Admin Panel
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Creator View
            </Link>
            <button
              onClick={signOut}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="container py-6">{children}</main>
    </div>
  );
};

export default SuperadminLayout;
