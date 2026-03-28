import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Instagram, CheckCircle2, Users, Copy, ShieldCheck, Loader2 } from 'lucide-react';

const generateCode = () => 'VK' + Math.random().toString(36).substring(2, 7).toUpperCase();

const InstagramConnect = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [username, setUsername] = useState('');
  const [followers, setFollowers] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<'input' | 'verify'>('input');
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (profile?.instagram_username) setUsername(profile.instagram_username);
    if (profile?.followers_count) setFollowers(String(profile.followers_count));
  }, [profile]);

  const isVerified = (profile as any)?.instagram_verified === true;
  const isPendingApproval = profile?.instagram_connection_status === 'approval_pending';

  const handleGenerateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const trimmedUsername = username.trim().replace(/^@/, '');
    if (!trimmedUsername) { toast.error('Enter a username'); return; }

    const count = parseInt(followers);
    if (isNaN(count) || count < 0) { toast.error('Enter a valid follower count'); return; }

    setSaving(true);
    const code = generateCode();
    setVerificationCode(code);

    try {
      await api.patch('/api/profile/instagram', {
        instagram_connected: true,
        instagram_user_id: trimmedUsername.toLowerCase(),
        instagram_username: trimmedUsername,
        followers_count: count,
        verification_code: code,
      });
      setStep('verify');
      await refreshProfile();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save.');
    }
    setSaving(false);
  };

  const handleVerify = async () => {
    if (!user) return;
    setVerifying(true);

    // Manual approval flow: submission is stored and waits for admin review.
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      await api.post('/api/profile/instagram/submit');
      toast.success('Instagram account submitted for manual approval.');
      await refreshProfile();
    } catch {
      toast.error('Failed to submit your account for review.');
    }
    setVerifying(false);
  };

  const handleDisconnect = async () => {
    if (!user) return;
    setSaving(true);
    await api.delete('/api/profile/instagram');
    toast.success('Instagram disconnected.');
    await refreshProfile();
    setUsername('');
    setFollowers('');
    setVerificationCode('');
    setStep('input');
    setSaving(false);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(verificationCode);
    toast.success('Code copied!');
  };

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 mb-4">
            <Instagram className="h-7 w-7 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold">Connect Instagram</h1>
          <p className="text-muted-foreground text-sm mt-1">Verify your account to start submitting reels</p>
        </div>

        {isVerified ? (
          <div className="glass-card p-6 text-center">
            <ShieldCheck className="h-12 w-12 text-success mx-auto mb-4" />
            <p className="font-semibold text-lg">Verified as @{profile?.instagram_username}</p>
            <div className="flex items-center justify-center gap-1 text-muted-foreground mt-2">
              <Users className="h-4 w-4" />
              <span>{(profile?.followers_count || 0).toLocaleString()} followers</span>
            </div>
            {(profile?.followers_count || 0) < 1000 && (
              <p className="text-xs text-warning mt-3">You need at least 1,000 followers to submit reels.</p>
            )}
            <Button variant="outline" className="mt-6" onClick={handleDisconnect} disabled={saving}>
              Disconnect
            </Button>
          </div>
        ) : isPendingApproval ? (
          <div className="glass-card p-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-warning mx-auto mb-4" />
            <p className="font-semibold text-lg">Approval Pending for @{profile?.instagram_username}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Your Instagram account has been submitted and is waiting for admin approval.
            </p>
            <Button variant="outline" className="mt-6" onClick={handleDisconnect} disabled={saving}>
              Disconnect
            </Button>
          </div>
        ) : profile?.instagram_connected && step === 'input' ? (
          // Already connected but not verified, go to verify step
          <div className="glass-card p-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-warning mx-auto mb-4" />
            <p className="font-semibold text-lg">Connected as @{profile.instagram_username}</p>
            <p className="text-sm text-muted-foreground mt-2">Complete the review submission to request approval.</p>
            <div className="flex gap-2 justify-center mt-4">
              <Button onClick={() => {
                setVerificationCode(profile?.verification_code || generateCode());
                setStep('verify');
              }}>
                Continue
              </Button>
              <Button variant="outline" onClick={handleDisconnect} disabled={saving}>
                Disconnect
              </Button>
            </div>
          </div>
        ) : step === 'input' ? (
          <form onSubmit={handleGenerateCode} className="glass-card p-6 space-y-4">
            <div>
              <Label htmlFor="ig-username">Instagram Username</Label>
              <Input
                id="ig-username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="@yourhandle"
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="ig-followers">Followers Count</Label>
              <Input
                id="ig-followers"
                type="number"
                value={followers}
                onChange={e => setFollowers(e.target.value)}
                placeholder="15000"
                className="mt-1"
                required
                min={0}
              />
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? 'Generating...' : 'Generate Verification Code'}
            </Button>
          </form>
        ) : (
          <div className="glass-card p-6 space-y-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-3">Add this code to your Instagram bio:</p>
              <div className="inline-flex items-center gap-2 bg-muted px-5 py-3 rounded-lg">
                <code className="font-mono text-xl font-bold tracking-widest">{verificationCode}</code>
                <button onClick={copyCode} className="p-1 hover:bg-background rounded transition-colors">
                  <Copy className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Steps:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Copy the code above</li>
                <li>Go to your Instagram profile</li>
                <li>Add the code to your bio</li>
                <li>Click "Verify" below</li>
              </ol>
            </div>

            <Button onClick={handleVerify} className="w-full" disabled={verifying}>
              {verifying ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
                </span>
              ) : (
                'Submit For Approval'
              )}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setStep('input')}>
              Back
            </Button>
          </div>
        )}
      </motion.div>
    </DashboardLayout>
  );
};

export default InstagramConnect;
