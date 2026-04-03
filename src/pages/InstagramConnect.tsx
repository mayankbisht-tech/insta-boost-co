import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Instagram, RefreshCcw, ShieldCheck, Unplug } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

type VerificationRequest = {
  id: string;
  instagram_username: string;
  instagram_user_id: string;
  followers_count: number;
  verification_code: string;
  status: 'draft' | 'pending' | 'verified' | 'failed' | 'expired';
  submitted_at: string | null;
  expires_at: string | null;
  checked_at: string | null;
  checked_bio: string | null;
  checked_followers: number | null;
  bio_contains_token: boolean | null;
  followers_match: boolean | null;
  reviewed_at: string | null;
  review_notes: string | null;
};

type RequestResponse = {
  request: VerificationRequest | null;
};

type ConnectResponse = {
  verification_code: string;
};

type VerifyResponse = {
  status: 'verified' | 'failed' | 'expired' | 'pending';
};

const statusTone: Record<string, string> = {
  not_connected: 'bg-muted text-muted-foreground',
  code_generated: 'bg-warning/10 text-warning border border-warning/20',
  approval_pending: 'bg-primary/10 text-primary border border-primary/20',
  approved: 'bg-success/10 text-success border border-success/20',
  rejected: 'bg-destructive/10 text-destructive border border-destructive/20',
  pending: 'bg-primary/10 text-primary border border-primary/20',
  verified: 'bg-success/10 text-success border border-success/20',
  failed: 'bg-destructive/10 text-destructive border border-destructive/20',
  expired: 'bg-muted text-muted-foreground',
};

const InstagramConnect = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [instagramUsername, setInstagramUsername] = useState(profile?.instagram_username ?? '');
  const [followersCount, setFollowersCount] = useState(
    profile?.followers_count ? String(profile.followers_count) : '',
  );
  const [request, setRequest] = useState<VerificationRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const loadRequest = async () => {
    try {
      const data = await api.get<RequestResponse>('/api/profile/instagram/request');
      setRequest(data.request);
    } catch {
      setRequest(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    setInstagramUsername(profile?.instagram_username ?? '');
    setFollowersCount(profile?.followers_count ? String(profile.followers_count) : '');
    void loadRequest();
  }, [user, profile?.followers_count, profile?.instagram_username]);

  const handleGenerateCode = async () => {
    const trimmedUsername = instagramUsername.trim();
    const parsedFollowers = Number.parseInt(followersCount, 10);

    if (!trimmedUsername) {
      toast.error('Enter an Instagram username.');
      return;
    }

    if (Number.isNaN(parsedFollowers) || parsedFollowers < 0) {
      toast.error('Enter a valid followers count.');
      return;
    }

    setSaving(true);
    try {
      const response = await api.patch<ConnectResponse>('/api/profile/instagram', {
        instagram_username: trimmedUsername,
        followers_count: parsedFollowers,
      });
      await refreshProfile();
      await loadRequest();
      toast.success(`Verification code generated: ${response.verification_code}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to connect Instagram.');
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async () => {
    setChecking(true);
    try {
      const response = await api.post<VerifyResponse>('/api/profile/instagram/verify');
      await refreshProfile();
      await loadRequest();
      toast.success(
        response.status === 'verified'
          ? 'Instagram verified successfully.'
          : response.status === 'expired'
          ? 'Verification window expired. Generate a new code and try again.'
          : 'Verification check completed.',
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Verification failed.');
    } finally {
      setChecking(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await api.delete('/api/profile/instagram');
      await refreshProfile();
      setInstagramUsername('');
      setFollowersCount('');
      setRequest(null);
      toast.success('Instagram account disconnected.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to disconnect Instagram.');
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-xl font-bold">Instagram Connect</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate your verification code, add it to your Instagram bio, then run the check yourself. No superadmin approval is needed now.
          </p>
        </div>

        <div className="glass-card p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Instagram className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold">{profile?.instagram_username ? `@${profile.instagram_username}` : 'No Instagram linked yet'}</p>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge className={statusTone[profile?.instagram_connection_status ?? 'not_connected'] || ''}>
                  {profile?.instagram_connection_status ?? 'not_connected'}
                </Badge>
                <span>{(profile?.followers_count ?? 0).toLocaleString()} followers</span>
                {profile?.verification_code && <span>Code: {profile.verification_code}</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="glass-card p-5">
            <h2 className="font-display text-lg font-semibold">Setup</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Use the same username and follower count that should match your live Instagram profile.
            </p>

            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="instagram-username">Instagram Username</Label>
                <Input
                  id="instagram-username"
                  value={instagramUsername}
                  onChange={event => setInstagramUsername(event.target.value)}
                  placeholder="@yourhandle"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="followers-count">Followers Count</Label>
                <Input
                  id="followers-count"
                  type="number"
                  min="0"
                  value={followersCount}
                  onChange={event => setFollowersCount(event.target.value)}
                  placeholder="1000"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void handleGenerateCode()} disabled={saving}>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  {saving ? 'Generating...' : 'Generate Verification Code'}
                </Button>
                <Button variant="outline" onClick={() => void handleVerify()} disabled={checking || !request}>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  {checking ? 'Checking...' : 'Verify Now'}
                </Button>
                <Button variant="ghost" onClick={() => void handleDisconnect()} disabled={disconnecting}>
                  <Unplug className="mr-2 h-4 w-4" />
                  {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                </Button>
              </div>
            </div>
          </div>

          <div className="glass-card p-5">
            <h2 className="font-display text-lg font-semibold">Verification Request</h2>
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : !request ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No verification request yet. Generate a code first, add it to your Instagram bio, then run the automatic check.
              </p>
            ) : (
              <div className="mt-4 space-y-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={statusTone[request.status] || ''}>{request.status}</Badge>
                  <span className="text-muted-foreground">@{request.instagram_username}</span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-border/70 p-3">
                    <p className="text-xs text-muted-foreground">Verification Code</p>
                    <p className="mt-1 font-mono font-medium">{request.verification_code}</p>
                  </div>
                  <div className="rounded-xl border border-border/70 p-3">
                    <p className="text-xs text-muted-foreground">Followers Submitted</p>
                    <p className="mt-1 font-medium">{request.followers_count.toLocaleString()}</p>
                  </div>
                </div>

                <div className="space-y-1 text-muted-foreground">
                  <p>Submitted: {request.submitted_at ? new Date(request.submitted_at).toLocaleString() : 'Not submitted yet'}</p>
                  <p>Expires: {request.expires_at ? new Date(request.expires_at).toLocaleString() : 'No expiry recorded yet'}</p>
                  <p>Last checked: {request.checked_at ? new Date(request.checked_at).toLocaleString() : 'Not checked yet'}</p>
                </div>

                <div className="rounded-xl border border-border/70 p-3">
                  <p className="text-xs text-muted-foreground">Verification Notes</p>
                  <p className="mt-1">
                    {request.review_notes || request.checked_bio || 'No review notes yet.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default InstagramConnect;
