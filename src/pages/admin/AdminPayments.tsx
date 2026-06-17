import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

type PaymentProfile = {
  id: string;
  user: { id: string; name: string; email: string; username: string | null };
  upi_id: string;
  full_name: string;
  phone_number: string;
  ethereum_wallet_address: string | null;
  status: 'pending' | 'verified' | 'rejected';
  reviewed_at: string | null;
  review_notes: string | null;
  updated_at: string;
};

type PayoutRequest = {
  id: string;
  user: { id: string; name: string; email: string; username: string | null };
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  reviewed_at: string | null;
  reviewed_by_admin: string | null;
  rejection_reason: string | null;
  upi_id: string;
  full_name: string;
  phone_number: string;
};

const statusTone: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border border-warning/20',
  verified: 'bg-success/10 text-success border border-success/20',
  rejected: 'bg-destructive/10 text-destructive border border-destructive/20',
  approved: 'bg-success/10 text-success border border-success/20',
};

const AdminPayments = () => {
  const [profiles, setProfiles] = useState<PaymentProfile[]>([]);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectProfileId, setRejectProfileId] = useState<string | null>(null);
  const [rejectProfileNote, setRejectProfileNote] = useState('');
  const [rejectPayoutId, setRejectPayoutId] = useState<string | null>(null);
  const [rejectPayoutReason, setRejectPayoutReason] = useState('');

  const loadData = async () => {
    try {
      const [profilesData, payoutsData] = await Promise.all([
        api.get<PaymentProfile[]>('/api/admin/payments/profiles'),
        api.get<PayoutRequest[]>('/api/admin/payments/payouts'),
      ]);
      setProfiles(profilesData);
      setPayouts(payoutsData);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load payment data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const updateProfileStatus = async (id: string, status: 'verified' | 'rejected', notes?: string) => {
    try {
      await api.patch(`/api/admin/payments/profiles/${id}`, { status, notes });
      toast.success(`Payment profile ${status}.`);
      setRejectProfileId(null);
      setRejectProfileNote('');
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update payment profile.');
    }
  };

  const updatePayoutStatus = async (id: string, status: 'approved' | 'rejected', reason?: string) => {
    try {
      await api.patch(`/api/admin/payments/payouts/${id}`, { status, reason });
      toast.success(`Payout ${status}.`);
      setRejectPayoutId(null);
      setRejectPayoutReason('');
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update payout request.');
    }
  };

  return (
    <AdminLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <div className="mb-8">
          <h1 className="admin-header">Payments</h1>
          <p className="text-muted-foreground mt-2">Verify payment profiles and approve withdrawals</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="space-y-4 text-center">
              <div className="h-8 w-8 mx-auto animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
              <p className="text-muted-foreground text-sm">Loading payment data...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="glass-card p-5">
              <Tabs defaultValue="profiles" className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-display text-lg font-semibold">Withdrawal Requests</h2>
                  <TabsList className="ml-auto">
                    <TabsTrigger value="profiles">Payment Profiles</TabsTrigger>
                    <TabsTrigger value="payouts">Withdrawal Requests</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="profiles" className="space-y-4">
                  {profiles.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No payment profiles yet.</p>
                  ) : (
                    profiles.map(profile => (
                      <div key={profile.id} className="rounded-xl border border-border/70 p-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold">
                              {profile.user.username ? `@${profile.user.username}` : profile.user.name}
                            </p>
                            <p className="text-xs text-muted-foreground">{profile.user.email}</p>
                          </div>
                          <Badge className={statusTone[profile.status] || ''}>{profile.status}</Badge>
                        </div>

                        <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                          <p>UPI: <span className="text-foreground">{profile.upi_id}</span></p>
                          <p>Name: <span className="text-foreground">{profile.full_name}</span></p>
                          <p>Phone: <span className="text-foreground">{profile.phone_number}</span></p>
                          {profile.ethereum_wallet_address && (
                            <p className="sm:col-span-3">ETH Wallet: <span className="text-foreground font-mono text-xs break-all">{profile.ethereum_wallet_address}</span></p>
                          )}
                        </div>

                        {profile.status === 'pending' && (
                          <div className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" variant="outline" onClick={() => void updateProfileStatus(profile.id, 'verified')}>
                                <CheckCircle className="mr-2 h-4 w-4" /> Verify
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setRejectProfileId(profile.id);
                                  setRejectProfileNote('');
                                }}
                              >
                                <XCircle className="mr-2 h-4 w-4" /> Reject
                              </Button>
                            </div>

                            {rejectProfileId === profile.id && (
                              <div className="space-y-2 rounded-lg border border-border/70 p-3">
                                <p className="text-xs font-medium text-muted-foreground">Rejection note</p>
                                <Textarea
                                  value={rejectProfileNote}
                                  onChange={event => setRejectProfileNote(event.target.value)}
                                  placeholder="Add reason for rejecting this payment profile"
                                  rows={3}
                                />
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => void updateProfileStatus(profile.id, 'rejected', rejectProfileNote.trim())}
                                  >
                                    Submit Rejection
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setRejectProfileId(null);
                                      setRejectProfileNote('');
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {profile.status === 'rejected' && profile.review_notes && (
                          <p className="text-sm text-muted-foreground">Admin note: {profile.review_notes}</p>
                        )}
                      </div>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="payouts" className="space-y-4">
                  {payouts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No payout requests yet.</p>
                  ) : (
                    payouts.map(payout => (
                      <div key={payout.id} className="rounded-xl border border-border/70 p-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold">
                              {payout.user.username ? `@${payout.user.username}` : payout.user.name}
                            </p>
                            <p className="text-xs text-muted-foreground">{payout.user.email}</p>
                          </div>
                          <Badge className={statusTone[payout.status] || ''}>{payout.status}</Badge>
                        </div>

                        <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                          <p>Amount: <span className="text-foreground">₹ {payout.amount.toFixed(2)}</span></p>
                          <p>UPI: <span className="text-foreground">{payout.upi_id}</span></p>
                          <p>Phone: <span className="text-foreground">{payout.phone_number}</span></p>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Requested {new Date(payout.requested_at).toLocaleString()}
                        </p>

                        {payout.status === 'pending' && (
                          <div className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" variant="outline" onClick={() => void updatePayoutStatus(payout.id, 'approved')}>
                                <CheckCircle className="mr-2 h-4 w-4" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setRejectPayoutId(payout.id);
                                  setRejectPayoutReason('');
                                }}
                              >
                                <XCircle className="mr-2 h-4 w-4" /> Reject
                              </Button>
                            </div>

                            {rejectPayoutId === payout.id && (
                              <div className="space-y-2 rounded-lg border border-border/70 p-3">
                                <p className="text-xs font-medium text-muted-foreground">Rejection note</p>
                                <Textarea
                                  value={rejectPayoutReason}
                                  onChange={event => setRejectPayoutReason(event.target.value)}
                                  placeholder="Add reason for rejecting this withdrawal request"
                                  rows={3}
                                />
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => void updatePayoutStatus(payout.id, 'rejected', rejectPayoutReason.trim())}
                                  >
                                    Submit Rejection
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setRejectPayoutId(null);
                                      setRejectPayoutReason('');
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {payout.status === 'rejected' && payout.rejection_reason && (
                          <p className="text-sm text-muted-foreground">Admin note: {payout.rejection_reason}</p>
                        )}
                      </div>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </motion.div>
    </AdminLayout>
  );
};

export default AdminPayments;
