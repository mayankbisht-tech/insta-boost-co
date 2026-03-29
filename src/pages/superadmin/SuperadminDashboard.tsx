import { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, UserCheck, UserCog, UserMinus, PauseCircle, Ban } from 'lucide-react';
import { toast } from 'sonner';
import SuperadminLayout from '@/components/SuperadminLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { getInstagramProfileUrl } from '@/lib/utils';

interface SuperadminOverview {
  totalUsers: number;
  totalAdmins: number;
  totalCreators: number;
  pausedUsers: number;
  blockedUsers: number;
  pendingVerifications: number;
}

interface VerificationRequest {
  id: string;
  instagram_username: string;
  instagram_user_id: string;
  followers_count: number;
  verification_code: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submitted_at: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
}

interface SuperadminUser {
  id: string;
  name: string;
  email: string;
  account_status: 'active' | 'paused' | 'suspended' | 'banned';
  instagram_connection_status: 'not_connected' | 'code_generated' | 'approval_pending' | 'approved' | 'rejected';
  instagram_username: string | null;
  followers_count: number;
  roles: string[];
  created_at: string;
  is_creator: boolean;
  is_admin_account: boolean;
  instagram_verification_request: VerificationRequest | null;
}

const statusOptions: Array<SuperadminUser['account_status']> = ['active', 'paused', 'suspended', 'banned'];

const SuperadminDashboard = () => {
  const [overview, setOverview] = useState<SuperadminOverview | null>(null);
  const [users, setUsers] = useState<SuperadminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [noteByUserId, setNoteByUserId] = useState<Record<string, string>>({});

  const loadData = async () => {
    try {
      const [overviewData, usersData] = await Promise.all([
        api.get<SuperadminOverview>('/api/admin/superadmin/overview'),
        api.get<SuperadminUser[]>('/api/admin/superadmin/users'),
      ]);
      setOverview(overviewData);
      setUsers(usersData);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load superadmin dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;

    return users.filter(user =>
      [user.name, user.email, user.instagram_username ?? '', user.roles.join(' ')]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [search, users]);

  const pendingVerifications = filteredUsers.filter(
    user => user.instagram_verification_request?.status === 'submitted',
  );

  const updateAccountStatus = async (userId: string, status: SuperadminUser['account_status']) => {
    setBusyUserId(userId);
    try {
      await api.patch(`/api/admin/superadmin/users/${userId}/status`, { status });
      toast.success(`Account status updated to ${status}.`);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update account status.');
    } finally {
      setBusyUserId(null);
    }
  };

  const removeUser = async (userId: string) => {
    setBusyUserId(userId);
    try {
      await api.delete(`/api/admin/superadmin/users/${userId}`);
      toast.success('User removed.');
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove user.');
    } finally {
      setBusyUserId(null);
    }
  };

  const reviewVerification = async (userId: string, action: 'approve' | 'reject') => {
    setBusyUserId(userId);
    try {
      await api.patch(`/api/admin/superadmin/verifications/${userId}`, {
        action,
        notes: noteByUserId[userId]?.trim() || undefined,
      });
      toast.success(`Verification ${action}d.`);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to review verification.');
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <SuperadminLayout>
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Card className="glass-card border-border/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Pending Verifications
                </CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-bold">{overview?.pendingVerifications ?? 0}</CardContent>
            </Card>
            <Card className="glass-card border-border/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserCog className="h-4 w-4 text-primary" />
                  Admin Accounts
                </CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-bold">{overview?.totalAdmins ?? 0}</CardContent>
            </Card>
            <Card className="glass-card border-border/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserCheck className="h-4 w-4 text-primary" />
                  Creators
                </CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-bold">{overview?.totalCreators ?? 0}</CardContent>
            </Card>
          </section>

          <section className="glass-card p-5 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-bold">Instagram Review Queue</h2>
                <p className="text-sm text-muted-foreground">
                  Compare the username, follower count, and verification code with the Instagram bio before approving.
                </p>
              </div>
              <Badge variant="secondary">{pendingVerifications.length} queued</Badge>
            </div>

            {pendingVerifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No submitted verification requests right now.</p>
            ) : (
              <div className="space-y-4">
                {pendingVerifications.map(user => {
                  const instagramUrl = getInstagramProfileUrl(
                    user.instagram_verification_request?.instagram_username ?? user.instagram_username,
                  );

                  return (
                  <div key={user.id} className="rounded-xl border border-border/70 bg-background/70 p-4 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">{user.name}</h3>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {instagramUrl ? (
                          <a href={instagramUrl} target="_blank" rel="noreferrer">
                            <Badge variant="outline" className="hover:bg-muted">
                              @{user.instagram_verification_request?.instagram_username}
                            </Badge>
                          </a>
                        ) : (
                          <Badge variant="outline">@{user.instagram_verification_request?.instagram_username}</Badge>
                        )}
                        <Badge variant="secondary">
                          {(user.instagram_verification_request?.followers_count ?? 0).toLocaleString()} followers
                        </Badge>
                        <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                          {user.instagram_verification_request?.verification_code}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-lg border border-border/60 p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Instagram ID</p>
                        <p className="mt-1 font-medium">{user.instagram_verification_request?.instagram_user_id}</p>
                      </div>
                      <div className="rounded-lg border border-border/60 p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Submitted At</p>
                        <p className="mt-1 font-medium">
                          {user.instagram_verification_request?.submitted_at
                            ? new Date(user.instagram_verification_request.submitted_at).toLocaleString()
                            : 'Not submitted'}
                        </p>
                      </div>
                    </div>

                    <textarea
                      value={noteByUserId[user.id] ?? ''}
                      onChange={event => setNoteByUserId(current => ({ ...current, [user.id]: event.target.value }))}
                      placeholder="Optional review note"
                      className="min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    />

                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => void reviewVerification(user.id, 'approve')}
                        disabled={busyUserId === user.id}
                      >
                        Approve & Show To Admins
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => void reviewVerification(user.id, 'reject')}
                        disabled={busyUserId === user.id}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="glass-card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-bold">Account Control</h2>
                <p className="text-sm text-muted-foreground">Pause, block, reactivate, or remove creators and admins.</p>
              </div>
              <Input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search by name, email, role, or Instagram"
                className="max-w-sm"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-3 pr-4 font-medium">Account</th>
                    <th className="py-3 pr-4 font-medium">Role</th>
                    <th className="py-3 pr-4 font-medium">Instagram</th>
                    <th className="py-3 pr-4 font-medium">Status</th>
                    <th className="py-3 pr-4 font-medium">Created</th>
                    <th className="py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => {
                    const instagramUrl = getInstagramProfileUrl(user.instagram_username);

                    return (
                    <tr key={user.id} className="border-b border-border/70 align-top">
                      <td className="py-4 pr-4">
                        <p className="font-medium">{user.name}</p>
                        <p className="text-muted-foreground">{user.email}</p>
                      </td>
                      <td className="py-4 pr-4">
                        <div className="flex flex-wrap gap-2">
                          {user.roles.map(role => (
                            <Badge key={role} variant="secondary">{role}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 pr-4">
                        {user.instagram_username ? (
                          <div>
                            {instagramUrl ? (
                              <a
                                href={instagramUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="font-medium text-primary hover:underline"
                              >
                                @{user.instagram_username}
                              </a>
                            ) : (
                              <p className="font-medium">@{user.instagram_username}</p>
                            )}
                            <p className="text-muted-foreground">{user.followers_count.toLocaleString()} followers</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Not linked</span>
                        )}
                      </td>
                      <td className="py-4 pr-4">
                        <div className="flex flex-col gap-2">
                          <Badge variant="outline">{user.account_status}</Badge>
                          <span className="text-xs text-muted-foreground">{user.instagram_connection_status}</span>
                        </div>
                      </td>
                      <td className="py-4 pr-4 text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-4">
                        <div className="flex flex-wrap gap-2">
                          {statusOptions.map(status => (
                            <Button
                              key={status}
                              size="sm"
                              variant={user.account_status === status ? 'default' : 'outline'}
                              onClick={() => void updateAccountStatus(user.id, status)}
                              disabled={busyUserId === user.id}
                            >
                              {status === 'active' && <UserCheck className="mr-1 h-3.5 w-3.5" />}
                              {status === 'paused' && <PauseCircle className="mr-1 h-3.5 w-3.5" />}
                              {status === 'suspended' && <Ban className="mr-1 h-3.5 w-3.5" />}
                              {status === 'banned' && <Ban className="mr-1 h-3.5 w-3.5" />}
                              {status}
                            </Button>
                          ))}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => void removeUser(user.id)}
                            disabled={busyUserId === user.id}
                          >
                            <UserMinus className="mr-1 h-3.5 w-3.5" />
                            Remove
                          </Button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </SuperadminLayout>
  );
};

export default SuperadminDashboard;
