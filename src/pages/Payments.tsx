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
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-4xl font-extrabold bg-gradient-to-r from-white to-[#c8c6c8] bg-clip-text text-transparent">Payments & Earnings</h1>
          <p className="mt-2 text-body-md text-muted-foreground">
            Manage your payment profile, link withdrawal accounts, and request earnings payouts.
          </p>
        </div>

        <div className="flex justify-center">
          <div className="rounded-2xl border border-white/10 bg-[#1a1a1c]/60 backdrop-blur-xl w-full max-w-3xl p-8 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.8)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-[#8c84eb] to-[#ffb59e] opacity-50"></div>
            
            {showWithdrawalCard ? (
              <>
                <Tabs defaultValue="withdraw" className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                    <h2 className="font-display text-xl font-bold text-foreground">Withdrawal Center</h2>
                    <TabsList className="bg-white/[0.04] border border-white/10 p-1">
                      <TabsTrigger value="withdraw" className="data-[state=active]:bg-white/[0.08] data-[state=active]:text-foreground text-xs">Withdraw</TabsTrigger>
                      <TabsTrigger value="history" className="data-[state=active]:bg-white/[0.08] data-[state=active]:text-foreground text-xs">History</TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="withdraw" className="space-y-6">
                    {latestRequest && (
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#c5c0ff]/30 bg-[#c5c0ff]/5 p-4">
                        <div className="text-sm text-muted-foreground">
                          Latest payout request: <span className="font-bold text-foreground">₹ {latestRequest.amount.toFixed(2)}</span> · {new Date(latestRequest.requested_at).toLocaleString()}
                        </div>
                        <Badge className={`${requestStatusTone[latestRequest.status]} text-xs font-semibold px-3 py-1`}>
                          {toRequestStatusLabel(latestRequest.status)}
                        </Badge>
                      </div>
                    )}

                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          <Wallet className="h-4 w-4 text-[#c5c0ff]" />
                          Withdrawable
                        </div>
                        <p className="mt-3 font-display text-2xl font-extrabold bg-gradient-to-r from-[#c5c0ff] to-[#ffb59e] bg-clip-text text-transparent">
                          ₹ {overview?.total_earned?.toFixed(2) ?? '0.00'}
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          <IndianRupee className="h-4 w-4 text-[#ffb59e]" />
                          Estimated
                        </div>
                        <p className="mt-3 font-display text-2xl font-extrabold text-foreground">
                          ₹ {estimatedEarning.toFixed(2)}
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          <CheckCircle className="h-4 w-4 text-[#c5c0ff]" />
                          Already Paid
                        </div>
                        <p className="mt-3 font-display text-2xl font-extrabold text-muted-foreground">
                          ₹ {overview?.total_paid?.toFixed(2) ?? '0.00'}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
                      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                        <IndianRupee className="h-4 w-4 text-[#c5c0ff]" />
                        Withdrawable Balance Summary
                      </div>
                      <p className="font-display text-4xl font-extrabold text-foreground">
                        ₹ {estimatedEarning.toFixed(2)}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Only approved earnings from ended campaigns are counted here.
                      </p>
                    </div>

                    <Button
                      onClick={() => void handleWithdraw()}
                      disabled={withdrawing || Boolean(pendingRequest) || estimatedEarning <= withdrawalThreshold}
                      className="w-full bg-gradient-to-r from-[#8c84eb] to-[#ffb59e] hover:from-[#7b72e7] hover:to-[#ffa488] text-white font-bold py-4 rounded-xl shadow-lg shadow-[#8c84eb]/20 active:scale-[0.98] transition-all duration-200"
                    >
                      {withdrawing ? 'Processing Withdrawal...' : pendingRequest ? 'Withdrawal Pending Approval' : 'Request Withdrawal'}
                    </Button>

                    {!pendingRequest && estimatedEarning > 0 && estimatedEarning <= withdrawalThreshold && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-4 w-4 text-warning" />
                        You need more approved earnings from ended campaigns before you can request a payout.
                      </div>
                    )}

                    {!pendingRequest && estimatedEarning > withdrawalThreshold && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle className="h-4 w-4 text-success" />
                        Once requested, the withdrawal will be verified and paid out by the administrator team.
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="history" className="space-y-4">
                    {history.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No withdrawal requests yet.</p>
                    ) : (
                      history.map(item => (
                        <div key={item.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-3 transition-all hover:bg-white/[0.04]">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-foreground">
                              Requested <span className="text-[#c5c0ff]">₹ {item.amount.toFixed(2)}</span> on {new Date(item.requested_at).toLocaleDateString()}
                            </p>
                            <Badge className={`${requestStatusTone[item.status]} text-xs font-semibold`}>
                              {toRequestStatusLabel(item.status)}
                            </Badge>
                          </div>

                          {item.reviewed_at && (
                            <p className="text-xs text-muted-foreground">
                              Reviewed on {new Date(item.reviewed_at).toLocaleString()}
                            </p>
                          )}

                          {item.status === 'rejected' && item.rejection_reason && (
                            <div className="text-sm text-red-300 bg-red-950/20 border border-red-900/30 rounded-lg p-3">
                              <span className="font-bold">Admin note:</span> {item.rejection_reason}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </TabsContent>
                </Tabs>
              </>
            ) : (
              <>
                <h2 className="font-display text-2xl font-bold text-foreground">UPI Profile Details</h2>
                <p className="mt-2 text-body-sm text-muted-foreground border-b border-white/10 pb-4">
                  Add your details. The admin team will review and approve your profile to unlock withdrawals.
                </p>

                <div className="mt-6 space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="upi-id" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">UPI ID / VPA</Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground material-symbols-outlined font-normal text-lg">account_balance</span>
                      <Input
                        id="upi-id"
                        value={upiId}
                        onChange={event => setUpiId(event.target.value)}
                        placeholder="yourname@bank"
                        className="w-full bg-[#141415] border border-white/10 rounded-lg py-3 pl-12 pr-4 text-white focus:border-[#8c84eb] outline-none transition-all placeholder:text-muted-foreground/30"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="upi-name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Full Name (Bank Account Holder)</Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground material-symbols-outlined font-normal text-lg">person</span>
                      <Input
                        id="upi-name"
                        value={fullName}
                        onChange={event => setFullName(event.target.value)}
                        placeholder="John Doe"
                        className="w-full bg-[#141415] border border-white/10 rounded-lg py-3 pl-12 pr-4 text-white focus:border-[#8c84eb] outline-none transition-all placeholder:text-muted-foreground/30"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="upi-phone" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Phone Number</Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground material-symbols-outlined font-normal text-lg">call</span>
                      <Input
                        id="upi-phone"
                        value={phoneNumber}
                        onChange={event => setPhoneNumber(event.target.value)}
                        placeholder="10-digit phone"
                        className="w-full bg-[#141415] border border-white/10 rounded-lg py-3 pl-12 pr-4 text-white focus:border-[#8c84eb] outline-none transition-all placeholder:text-muted-foreground/30"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="eth-address" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-muted-foreground" />
                      Ethereum Wallet Address <span className="text-[10px] text-muted-foreground font-normal lowercase">(optional)</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground material-symbols-outlined font-normal text-lg">currency_bitcoin</span>
                      <Input
                        id="eth-address"
                        value={ethAddress}
                        onChange={event => {
                          setEthAddress(event.target.value);
                          setEthError('');
                        }}
                        placeholder="0x..."
                        className={`w-full bg-[#141415] border border-white/10 rounded-lg py-3 pl-12 pr-4 text-white focus:border-[#8c84eb] outline-none transition-all placeholder:text-muted-foreground/30 ${ethError ? 'border-destructive' : ''}`}
                      />
                    </div>
                    {ethError ? (
                      <p className="text-xs text-destructive">{ethError}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Your Ethereum payout address (42-character hex, starting with 0x). Stored as an alternative payout destination.
                      </p>
                    )}
                  </div>

                  {profile?.review_notes && (
                    <div className="text-sm text-yellow-300 bg-yellow-950/20 border border-yellow-900/30 rounded-lg p-4">
                      <span className="font-bold">Admin review note:</span> {profile.review_notes}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-white/10">
                    <Button 
                      onClick={() => void handleSaveProfile()} 
                      disabled={saving}
                      className="bg-gradient-to-r from-[#8c84eb] to-[#ffb59e] hover:opacity-90 text-white font-bold px-6 py-3 rounded-lg shadow-lg active:scale-[0.98] transition-all duration-200"
                    >
                      {saving ? 'Submitting...' : profile ? 'Update Details' : 'Submit Profile for Verification'}
                    </Button>
                    {profile?.status && (
                      <Badge className={`${statusTone[profile.status]} text-xs font-semibold px-3 py-1.5`}>
                        Status: {profile.status}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
                    <Clock className="h-4 w-4 text-[#ffb59e]" />
                    Your details must be verified by the admin team before requesting a withdrawal.
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






