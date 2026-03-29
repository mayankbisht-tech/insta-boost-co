import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

const SuperadminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isSuperadmin, profile, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth/admin" replace />;
  if (profile?.account_status && profile.account_status !== 'active') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="glass-card max-w-md p-8 text-center space-y-3">
          <h1 className="font-display text-2xl font-bold">Account Restricted</h1>
          <p className="text-sm text-muted-foreground">
            Your superadmin account is not allowed to access this dashboard.
          </p>
          <Button onClick={() => { void signOut(); }}>Log Out</Button>
        </div>
      </div>
    );
  }
  if (!isSuperadmin) return <Navigate to="/admin" replace />;

  return <>{children}</>;
};

export default SuperadminRoute;
