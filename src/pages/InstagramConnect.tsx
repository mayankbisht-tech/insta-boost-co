import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Instagram, RefreshCcw, ShieldCheck } from 'lucide-react';
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
  const [request, setRequest] = useState<VerificationRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const connectedAccounts = profile?.instagram_accounts ?? [];

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
    setInstagramUsername('');
    void loadRequest();
  }, [user]);

  const handleGenerateCode = async () => {
    const trimmedUsername = instagramUsername.trim();

    if (!trimmedUsername) {
      toast.error('Enter an Instagram username.');
      return;
    }

    setSaving(true);
    try {
      const response = await api.patch<ConnectResponse>('/api/profile/instagram', {
        instagram_username: trimmedUsername,
      });
      await refreshProfile();
      await loadRequest();
      setInstagramUsername('');
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

  const verificationNote =
    request?.review_notes?.startsWith('Verification') ? request.review_notes : null;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-4xl font-extrabold bg-gradient-to-r from-white to-[#c8c6c8] bg-clip-text text-transparent">Instagram Connect</h1>
          <p className="mt-2 text-body-md text-muted-foreground">
            Generate your verification token, add it to your Instagram bio, and verify ownership instantly.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#1a1a1c]/60 backdrop-blur-xl p-8 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.5)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] text-[#c5c0ff] border border-white/10">
                <Instagram className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="font-display text-2xl font-bold text-foreground">
                  {profile?.instagram_username ? `@${profile.instagram_username}` : 'No account linked yet'}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground font-medium">
                  <Badge className={`${statusTone[profile?.instagram_connection_status ?? 'not_connected']} text-xs font-semibold px-3 py-0.5`}>
                    {profile?.instagram_connection_status ?? 'Not Connected'}
                  </Badge>
                  <span>·</span>
                  <span>{(profile?.followers_count ?? 0).toLocaleString()} followers</span>
                  {profile?.verification_code && (
                    <>
                      <span>·</span>
                      <span className="font-mono text-foreground font-bold">Bio Code: {profile.verification_code}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Setup Panel */}
          <div className="rounded-2xl border border-white/10 bg-[#1a1a1c]/60 backdrop-blur-xl p-6 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.5)] flex flex-col justify-between">
            <div>
              <h2 className="font-display text-xl font-bold text-foreground">Setup Instagram Link</h2>
              <p className="mt-2 text-sm text-muted-foreground border-b border-white/10 pb-4">
                Enter your Instagram username to link or update your account.
              </p>

              <div className="mt-5 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="instagram-username" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Instagram Username</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">@</span>
                    <Input
                      id="instagram-username"
                      value={instagramUsername}
                      onChange={event => setInstagramUsername(event.target.value)}
                      placeholder="yourhandle"
                      className="w-full bg-[#141415] border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white focus:border-[#8c84eb] outline-none transition-all placeholder:text-muted-foreground/30"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-white/10">
              <Button 
                onClick={() => void handleGenerateCode()} 
                disabled={saving}
                className="w-full bg-gradient-to-r from-[#8c84eb] to-[#ffb59e] hover:from-[#7b72e7] hover:to-[#ffa488] text-white font-bold py-4 rounded-xl shadow-lg shadow-[#8c84eb]/20 active:scale-[0.98] transition-all duration-200"
              >
                <ShieldCheck className="mr-2 h-5 w-5" />
                {saving ? 'Generating Verification...' : 'Generate Verification Code'}
              </Button>
            </div>
          </div>

          {/* Verification Request Panel */}
          <div className="rounded-2xl border border-white/10 bg-[#1a1a1c]/60 backdrop-blur-xl p-6 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.5)]">
            <h2 className="font-display text-xl font-bold text-foreground">Verification Checklist</h2>
            <p className="mt-2 text-sm text-muted-foreground border-b border-white/10 pb-4">
              Monitor your connection progress and run the bio verification check.
            </p>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : !request ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  No active verification request. Generate a code first to connect.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Badge className={`${statusTone[request.status]} text-xs font-semibold px-2.5 py-0.5`}>
                      {request.status}
                    </Badge>
                    <span className="font-bold text-foreground">@{request.instagram_username}</span>
                  </div>
                  {(request.status === 'draft' || request.status === 'pending') && (
                    <Button 
                      variant="outline" 
                      onClick={() => void handleVerify()} 
                      disabled={checking}
                      className="border border-[#c5c0ff]/30 hover:bg-[#c5c0ff]/10 text-[#c5c0ff]"
                    >
                      <RefreshCcw className={`mr-2 h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
                      {checking ? 'Checking Bio...' : 'Verify Now'}
                    </Button>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-white/[0.01] p-4 text-center">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Required Bio Code</p>
                    <p className="mt-2 font-mono text-2xl font-extrabold bg-gradient-to-r from-[#c5c0ff] to-[#ffb59e] bg-clip-text text-transparent select-all select-none">
                      {request.verification_code}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">Copy and paste this into your Instagram bio</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.01] p-4 text-center flex flex-col justify-center">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Followers Count</p>
                    <p className="mt-2 text-2xl font-extrabold text-foreground">
                      {request.followers_count > 0 ? request.followers_count.toLocaleString() : '--'}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">Scraped from your public page</p>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-muted-foreground bg-white/[0.01] border border-white/10 rounded-xl p-4">
                  <p><span className="font-semibold text-foreground">Submitted:</span> {request.submitted_at ? new Date(request.submitted_at).toLocaleString() : 'Not submitted yet'}</p>
                  <p><span className="font-semibold text-foreground">Expires:</span> {request.expires_at ? new Date(request.expires_at).toLocaleString() : 'No expiry recorded'}</p>
                  <p><span className="font-semibold text-foreground">Last checked:</span> {request.checked_at ? new Date(request.checked_at).toLocaleString() : 'Not checked yet'}</p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.01] p-4">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Status Details</p>
                  <p className="text-sm font-medium text-foreground">
                    {verificationNote || request.checked_bio || 'Checking bio verification token...'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {connectedAccounts.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-[#1a1a1c]/60 backdrop-blur-xl p-6 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.5)]">
            <h2 className="font-display text-xl font-bold text-foreground">Linked Accounts History</h2>
            <div className="mt-4 space-y-3">
              {connectedAccounts.map(account => (
                <div key={account.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.01] p-4 transition-all hover:bg-white/[0.03]">
                  <div>
                    <p className="font-bold text-foreground">@{account.instagram_username}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-medium">
                      <Badge className={`${statusTone[account.instagram_connection_status]} text-[10px] font-semibold px-2 py-0.5`}>
                        {account.instagram_connection_status}
                      </Badge>
                      <span>{account.followers_count.toLocaleString()} followers</span>
                      {account.verification_code && (
                        <span>Code: <span className="font-mono text-foreground font-semibold">{account.verification_code}</span></span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Connected {new Date(account.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default InstagramConnect;
