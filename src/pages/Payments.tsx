import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { CheckCircle, Clock, XCircle, IndianRupee } from 'lucide-react';

type PaymentProfile = {
  id: string;
  upi_id: string;
  full_name: string;
  phone_number: string;
  status: 'pending' | 'verified' | 'rejected';
  reviewed_at: string | null;
  review_notes: string | null;
};

type PaymentOverview = {
  available_balance: number;
  total_earned: number;
  total_paid: number;
  payment_profile_status: PaymentProfile['status'] | null;
  pending_request: { id: string; amount: number; status: string; requested_at: string } | null;
};

const statusTone: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border border-warning/20',
  verified: 'bg-success/10 text-success border border-success/20',
  rejected: 'bg-destructive/10 text-destructive border border-destructive/20',
};

const Payments = () => {
  const [profile, setProfile] = useState<PaymentProfile | null>(null);
  const [overview, setOverview] = useState<PaymentOverview | null>(null);
  const [saving, setSaving] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const [upiId, setUpiId] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const loadData = async () => {
    const [profileData, overviewData] = await Promise.all([
      api.get<{ profile: PaymentProfile | null }>('/api/payments/profile'),
      api.get<PaymentOverview>('/api/payments/overview'),
    ]);

    setProfile(profileData.profile);
    setOverview(overviewData);
    setUpiId(profileData.profile?.upi_id ?? '');
    setFullName(profileData.profile?.full_name ?? '');
    setPhoneNumber(profileData.profile?.phone_number ?? '');
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleSaveProfile = async () => {
    if (!upiId.trim() || !fullName.trim() || !phoneNumber.trim()) {
      toast.error('Please fill all payment details.');
      return;
    }

    setSaving(true);
    try {
      const response = await api.put<{ profile: PaymentProfile }>('/api/payments/profile', {
        upi_id: upiId.trim(),
        full_name: fullName.trim(),
        phone_number: phoneNumber.trim(),
      });
      setProfile(response.profile);
      toast.success('Payment details submitted for verification.');
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save payment details.');
    } finally {
      setSaving(false);
    }
  };

  const handleWithdraw = async () => {
    setWithdrawing(true);
    try {
      await api.post('/api/payments/withdraw', { confirm: true });
      toast.success('Withdrawal request submitted.');
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to request withdrawal.');
    } finally {
      setWithdrawing(false);
    }
  };

  const isVerified = profile?.status === 'verified';
  const pendingRequest = overview?.pending_request;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-xl font-bold">Payments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your UPI details, get them verified, then request withdrawals when you have earnings.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="glass-card p-5">
            <h2 className="font-display text-lg font-semibold">UPI Details</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              These details are reviewed by admin before withdrawals are enabled.
            </p>

            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="upi-id">UPI ID</Label>
                <Input
                  id="upi-id"
                  value={upiId}
                  onChange={event => setUpiId(event.target.value)}
                  placeholder="yourname@bank"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="upi-name">Full Name</Label>
                <Input
                  id="upi-name"
                  value={fullName}
                  onChange={event => setFullName(event.target.value)}
                  placeholder="Name on bank account"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="upi-phone">Phone Number</Label>
                <Input
                  id="upi-phone"
                  value={phoneNumber}
                  onChange={event => setPhoneNumber(event.target.value)}
                  placeholder="10-digit phone"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={() => void handleSaveProfile()} disabled={saving}>
                  {saving ? 'Saving...' : profile ? 'Update & Verify' : 'Submit for Verification'}
                </Button>
                {profile?.status && (
                  <Badge className={statusTone[profile.status] || ''}>{profile.status}</Badge>
                )}
              </div>

              {profile?.review_notes && (
                <p className="text-sm text-muted-foreground">
                  Admin note: {profile.review_notes}
                </p>
              )}
            </div>
          </div>

          <div className="glass-card p-5">
            <h2 className="font-display text-lg font-semibold">Withdrawal</h2>
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-border/70 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <IndianRupee className="h-4 w-4" />
                  Available Balance
                </div>
                <p className="mt-2 font-display text-3xl font-bold text-success">
                  ₹ {overview?.available_balance?.toFixed(2) ?? '0.00'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Total earned: ₹ {overview?.total_earned?.toFixed(2) ?? '0.00'} · Paid out: ₹ {overview?.total_paid?.toFixed(2) ?? '0.00'}
                </p>
              </div>

              {pendingRequest ? (
                <div className="flex items-center gap-2 rounded-xl border border-border/70 p-4 text-sm">
                  <Clock className="h-4 w-4 text-warning" />
                  <div>
                    <p className="font-medium">Withdrawal pending</p>
                    <p className="text-muted-foreground">
                      Requested ₹ {pendingRequest.amount.toFixed(2)} on {new Date(pendingRequest.requested_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={() => void handleWithdraw()}
                  disabled={withdrawing || !isVerified || (overview?.available_balance ?? 0) <= 0}
                >
                  {withdrawing ? 'Requesting...' : 'Request Withdrawal'}
                </Button>
              )}

              {!isVerified && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <XCircle className="h-4 w-4 text-destructive" />
                  Your payment details must be verified before you can request a withdrawal.
                </div>
              )}

              {isVerified && !pendingRequest && (overview?.available_balance ?? 0) > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-success" />
                  Once requested, the withdrawal cannot be cancelled.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Payments;
