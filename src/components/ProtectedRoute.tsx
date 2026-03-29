import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, profile, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (profile?.account_status && profile.account_status !== 'active') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="glass-card max-w-md p-8 text-center space-y-3">
          <h1 className="font-display text-2xl font-bold">Account Restricted</h1>
          <p className="text-sm text-muted-foreground">
            {profile.account_status === 'banned'
              ? 'Your account has been banned. Contact support if you think this is incorrect.'
              : profile.account_status === 'paused'
                ? 'Your account is paused right now. Please wait for the superadmin to reactivate it.'
                : 'Your account is suspended and cannot access the dashboard right now.'}
          </p>
          <Button onClick={() => { void signOut(); }}>Log Out</Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
