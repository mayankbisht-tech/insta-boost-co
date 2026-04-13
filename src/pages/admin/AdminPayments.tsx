import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

  const loadData = async () => {
    const [profilesData, payoutsData] = await Promise.all([
      api.get<PaymentProfile[]>('/api/admin/payments/profiles'),
      api.get<PayoutRequest[]>('/api/admin/payments/payouts'),
    ]);
    setProfiles(profilesData);
    setPayouts(payoutsData);
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const updateProfileStatus = async (id: string, status: 'verified' | 'rejected') => {
    try {
      await api.patch(`/api/admin/payments/profiles/${id}`, { status });
      toast.success(`Payment profile ${status}.`);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update payment profile.');
    }
  };

  const updatePayoutStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await api.patch(`/api/admin/payments/payouts/${id}`, { status });
      toast.success(`Payout ${status}.`);
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
              <h2 className="font-display text-lg font-semibold">Payment Profiles</h2>
              <div className="mt-4 space-y-4">
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
                      </div>

                      {profile.status === 'pending' && (
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => void updateProfileStatus(profile.id, 'verified')}>
                            <CheckCircle className="mr-2 h-4 w-4" /> Verify
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => void updateProfileStatus(profile.id, 'rejected')}>
                            <XCircle className="mr-2 h-4 w-4" /> Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="glass-card p-5">
              <h2 className="font-display text-lg font-semibold">Withdrawal Requests</h2>
              <div className="mt-4 space-y-4">
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
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => void updatePayoutStatus(payout.id, 'approved')}>
                            <CheckCircle className="mr-2 h-4 w-4" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => void updatePayoutStatus(payout.id, 'rejected')}>
                            <XCircle className="mr-2 h-4 w-4" /> Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </AdminLayout>
  );
};

export default AdminPayments;
