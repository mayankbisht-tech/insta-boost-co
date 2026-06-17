import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { CheckCircle, XCircle, IndianRupee, Wallet } from 'lucide-react';

type PaymentProfile = {
  id: string;
  upi_id: string;
  full_name: string;
  phone_number: string;
  ethereum_wallet_address: string | null;
  status: 'pending' | 'verified' | 'rejected';
  reviewed_at: string | null;
  review_notes: string | null;
};

type PaymentOverview = {
  available_balance: number;
  estimated_earning: number;
  total_earned: number;
  total_paid: number;
  payment_profile_status: PaymentProfile['status'] | null;
  pending_request: { id: string; amount: number; status: string; requested_at: string } | null;
};

type PayoutHistoryItem = {
  id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
};

const statusTone: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border border-warning/20',
  verified: 'bg-success/10 text-success border border-success/20',
  rejected: 'bg-destructive/10 text-destructive border border-destructive/20',
};

const Payments = () => {
  const [profile, setProfile] = useState<PaymentProfile | null>(null);
  const [overview, setOverview] = useState<PaymentOverview | null>(null);
  const [history, setHistory] = useState<PayoutHistoryItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const [upiId, setUpiId] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [ethAddress, setEthAddress] = useState('');
  const [ethError, setEthError] = useState('');

  const loadData = async () => {
    const [profileResult, overviewResult, historyResult] = await Promise.allSettled([
      api.get<{ profile: PaymentProfile | null }>('/api/payments/profile'),
      api.get<PaymentOverview>('/api/payments/overview'),
      api.get<PayoutHistoryItem[]>('/api/payments/history'),
    ]);

    if (profileResult.status !== 'fulfilled' || overviewResult.status !== 'fulfilled') {
      throw new Error('Failed to load payment details.');
    }

    const profileData = profileResult.value;
    const overviewData = overviewResult.value;
    const historyData = historyResult.status === 'fulfilled' ? historyResult.value : [];

    setProfile(profileData.profile);
    setOverview(overviewData);
    setHistory(historyData);
    setUpiId(profileData.profile?.upi_id ?? '');
    setFullName(profileData.profile?.full_name ?? '');
    setPhoneNumber(profileData.profile?.phone_number ?? '');
    setEthAddress(profileData.profile?.ethereum_wallet_address ?? '');
  };

  useEffect(() => {
    void loadData().catch(error => {
      toast.error(error instanceof Error ? error.message : 'Failed to load payments data.');
    });
  }, []);

  const handleSaveProfile = async () => {
    if (!upiId.trim() || !fullName.trim() || !phoneNumber.trim()) {
      toast.error('Please fill all required payment details.');
      return;
    }

    // Validate ETH address format if provided
    if (ethAddress.trim() && !/^0x[0-9a-fA-F]{40}$/.test(ethAddress.trim())) {
      setEthError('Invalid Ethereum address. Must be 0x followed by 40 hex characters.');
      return;
    }
    setEthError('');

    setSaving(true);
    try {
      const response = await api.put<{ profile: PaymentProfile }>('/api/payments/profile', {
        upi_id: upiId.trim(),
        full_name: fullName.trim(),
        phone_number: phoneNumber.trim(),
        ethereum_wallet_address: ethAddress.trim() || undefined,
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
  const latestRequest = history[0] ?? null;
  const showWithdrawalCard = isVerified;
  const estimatedEarning = overview?.estimated_earning ?? overview?.available_balance ?? 0;
  const hasPreviousPayout = (overview?.total_paid ?? 0) > 0;
  const withdrawalThreshold = hasPreviousPayout ? 0 : 500;

  const toRequestStatusLabel = (status: PayoutHistoryItem['status']) => {
    if (status === 'approved') return 'Done';
    if (status === 'rejected') return 'Rejected';
    return 'Pending';
  };

  const requestStatusTone: Record<PayoutHistoryItem['status'], string> = {
    pending: 'bg-warning/10 text-warning border border-warning/20',
    approved: 'bg-success/10 text-success border border-success/20',
    rejected: 'bg-destructive/10 text-destructive border border-destructive/20',
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-xl font-bold">Payments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your UPI details, get them verified, then request withdrawals after your campaigns end and earnings become withdrawable.
          </p>
        </div>

        <div className="flex justify-center">
          <div className="glass-card w-full max-w-3xl p-5">
            {showWithdrawalCard ? (
              <>
                <Tabs defaultValue="withdraw" className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-display text-lg font-semibold">Withdrawal</h2>
                    <TabsList className="ml-auto">
                      <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
                      <TabsTrigger value="history">History</TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="withdraw" className="space-y-4">
                    {latestRequest && (
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 p-3">
                        <p className="text-sm text-muted-foreground">
                          Latest request: ₹ {latestRequest.amount.toFixed(2)} · {new Date(latestRequest.requested_at).toLocaleString()}
                        </p>
                        <Badge className={requestStatusTone[latestRequest.status]}>
                          {toRequestStatusLabel(latestRequest.status)}
                        </Badge>
                      </div>
                    )}

                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="rounded-xl border border-border/70 p-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <IndianRupee className="h-4 w-4" />
                          Withdrawable Earnings
                        </div>
                        <p className="mt-2 font-display text-3xl font-bold text-primary">
                          ₹ {overview?.total_earned?.toFixed(2) ?? '0.00'}
                        </p>
                      </div>

                      <div className="rounded-xl border border-border/70 p-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <IndianRupee className="h-4 w-4" />
                          Estimated Earnings
                        </div>
                        <p className="mt-2 font-display text-3xl font-bold text-success">
                          ₹ {estimatedEarning.toFixed(2)}
                        </p>
                      </div>

                      <div className="rounded-xl border border-border/70 p-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <IndianRupee className="h-4 w-4" />
                          Already Paid
                        </div>
                        <p className="mt-2 font-display text-3xl font-bold text-foreground">
                          ₹ {overview?.total_paid?.toFixed(2) ?? '0.00'}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/70 p-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <IndianRupee className="h-4 w-4" />
                        Withdrawable Amount
                      </div>
                      <p className="mt-2 font-display text-3xl font-bold text-success">
                        ₹ {estimatedEarning.toFixed(2)}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Only approved earnings from ended campaigns are counted here.
                      </p>
                    </div>

                    <Button
                      onClick={() => void handleWithdraw()}
                      disabled={withdrawing || Boolean(pendingRequest) || estimatedEarning <= withdrawalThreshold}
                    >
                      {withdrawing ? 'Requesting...' : pendingRequest ? 'Pending...' : 'Request Withdrawal'}
                    </Button>

                    {!pendingRequest && estimatedEarning > 0 && estimatedEarning <= withdrawalThreshold && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle className="h-4 w-4 text-warning" />
                        You need more approved earnings from ended campaigns before you can request a payout.
                      </div>
                    )}

                    {!pendingRequest && estimatedEarning > withdrawalThreshold && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle className="h-4 w-4 text-success" />
                        Once requested, the withdrawal cannot be cancelled.
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="history" className="space-y-3">
                    {history.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No withdrawal requests yet.</p>
                    ) : (
                      history.map(item => (
                        <div key={item.id} className="rounded-xl border border-border/70 p-4 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm text-muted-foreground">
                              Requested ₹ {item.amount.toFixed(2)} on {new Date(item.requested_at).toLocaleString()}
                            </p>
                            <Badge className={requestStatusTone[item.status]}>
                              {toRequestStatusLabel(item.status)}
                            </Badge>
                          </div>

                          {item.reviewed_at && (
                            <p className="text-xs text-muted-foreground">
                              Reviewed on {new Date(item.reviewed_at).toLocaleString()}
                            </p>
                          )}

                          {item.status === 'rejected' && item.rejection_reason && (
                            <p className="text-sm text-muted-foreground">
                              Admin note: {item.rejection_reason}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </TabsContent>
                </Tabs>
              </>
            ) : (
              <>
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

                  <div className="space-y-2">
                    <Label htmlFor="eth-address" className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-muted-foreground" />
                      Ethereum Wallet Address
                      <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                    </Label>
                    <Input
                      id="eth-address"
                      value={ethAddress}
                      onChange={event => {
                        setEthAddress(event.target.value);
                        setEthError('');
                      }}
                      placeholder="0x..."
                      className={ethError ? 'border-destructive' : ''}
                    />
                    {ethError ? (
                      <p className="text-xs text-destructive">{ethError}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Your Ethereum payout address (42-character hex, starting with 0x). Stored as an alternative payout destination.
                      </p>
                    )}
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

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <XCircle className="h-4 w-4 text-destructive" />
                    Your payment details must be verified before you can request a withdrawal.
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Payments;






