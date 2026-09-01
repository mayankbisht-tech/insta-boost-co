import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { CampaignBudgetCard, type CampaignBudget } from '@/components/CampaignBudgetCard';
import { api } from '@/lib/api';
import { getRealtimeSocket } from '@/lib/realtime';
import DashboardLayout from '@/components/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock, Eye } from 'lucide-react';

interface Campaign extends CampaignBudget {
  reward_per_million_views: number;
  rules: string[];
  created_at: string;
}

interface SubmissionOverview {
  total_submissions: number;
  approved: number;
  rejected: number;
  pending: number;
  total_views: number;
  total_earnings: number;
  average_views: number;
  active_reels: number;
  reels_with_analytics: number;
  best_reel_views: number;
  latest_sync_at: string | null;
}

interface PaymentOverview {
  estimated_earning: number;
  total_earned: number;
  total_paid: number;
  available_balance: number;
  total_reel_earnings?: number;
}

const categoryColors: Record<string, string> = {
  Sports: 'bg-info/10 text-info border border-info/20',
  General: 'bg-success/10 text-success border border-success/20',
  Gambling: 'bg-warning/10 text-warning border border-warning/20',
};

const emptyOverview: SubmissionOverview = {
  total_submissions: 0,
  approved: 0,
  rejected: 0,
  pending: 0,
  total_views: 0,
  total_earnings: 0,
  average_views: 0,
  active_reels: 0,
  reels_with_analytics: 0,
  best_reel_views: 0,
  latest_sync_at: null,
};

const Dashboard = () => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [overview, setOverview] = useState<SubmissionOverview>(emptyOverview);
  const [paymentOverview, setPaymentOverview] = useState<PaymentOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const campData = await api.get<Campaign[]>('/api/campaigns');
      setCampaigns(campData);

      if (user) {
        const [overviewData, paymentData] = await Promise.all([
          api.get<SubmissionOverview>('/api/submissions/overview'),
          api.get<PaymentOverview>('/api/payments/overview'),
        ]);
        setOverview(overviewData);
        setPaymentOverview(paymentData);
      } else {
        setOverview(emptyOverview);
        setPaymentOverview(null);
      }

      setLoading(false);
    };

    void fetchData();
  }, [user]);

  useEffect(() => {
    const socket = getRealtimeSocket();

    const onBudgetUpdate = (payload: CampaignBudget) => {
      setCampaigns(previous => {
        const found = previous.some(campaign => campaign.id === payload.id);
        if (!found) {
          return [{
            ...payload,
            reward_per_million_views: payload.rupees_per_thousand_views * 1000,
            rules: [],
            created_at: new Date().toISOString(),
          }, ...previous];
        }

        return previous.map(campaign => (
          campaign.id === payload.id
            ? {
                ...campaign,
                ...payload,
              }
            : campaign
        ));
      });
    };

    socket.on('campaign:budget-updated', onBudgetUpdate);

    return () => {
      socket.off('campaign:budget-updated', onBudgetUpdate);
    };
  }, []);

  const statCards = [
    { label: 'Total Submissions', value: overview.total_submissions, icon: Eye, color: 'text-primary' },
    { label: 'Approved', value: overview.approved, icon: CheckCircle, color: 'text-success' },
    { label: 'Rejected', value: overview.rejected, icon: XCircle, color: 'text-destructive' },
    { label: 'Pending', value: overview.pending, icon: Clock, color: 'text-warning' },
  ];

  const topCampaign = campaigns.reduce((top, campaign) =>
    campaign.reward_per_million_views > (top?.reward_per_million_views || 0) ? campaign : top,
  campaigns[0]);

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 gap-5 mb-8 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl border border-white/10 bg-[#1a1a1c]/60 backdrop-blur-xl p-6 relative overflow-hidden transition-all duration-300 hover:border-primary/40 hover:-translate-y-0.5 shadow-[0_15px_30px_-15px_rgba(0,0,0,0.5)]"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{stat.label}</span>
              <div className="w-8 h-8 rounded-full bg-white/[0.04] flex items-center justify-center">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </div>
            <p className="font-display text-3xl font-extrabold text-foreground">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 relative">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-white/10 bg-[#1a1a1c]/60 backdrop-blur-xl p-8 flex flex-col justify-between relative z-10 transition-all duration-300 hover:border-[#c5c0ff]/40 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.6)]"
        >
          <div className="flex justify-between items-start mb-6">
            <span className="text-muted-foreground font-semibold uppercase tracking-wider text-xs">Total Earnings</span>
            <div className="w-10 h-10 rounded-full bg-white/[0.04] flex items-center justify-center">
              <Clock className="h-5 w-5 text-[#c5c0ff]" />
            </div>
          </div>
          <div>
            <h2 className="font-display text-4xl font-extrabold bg-gradient-to-r from-[#c5c0ff] to-[#ffb59e] bg-clip-text text-transparent mb-2">
              ₹ {paymentOverview?.total_earned?.toFixed(2) ?? '0.00'}
            </h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <span>All-time approved payouts</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
          className="rounded-2xl border border-white/10 bg-[#1a1a1c]/60 backdrop-blur-xl p-8 flex flex-col justify-between relative z-10 transition-all duration-300 hover:border-[#ffb59e]/40 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.6)]"
        >
          <div className="flex justify-between items-start mb-6">
            <span className="text-muted-foreground font-semibold uppercase tracking-wider text-xs">Available Balance</span>
            <div className="w-10 h-10 rounded-full bg-white/[0.04] flex items-center justify-center">
              <Clock className="h-5 w-5 text-[#ffb59e]" />
            </div>
          </div>
          <div>
            <h2 className="font-display text-4xl font-extrabold text-foreground mb-2">
              ₹ {paymentOverview?.available_balance?.toFixed(2) ?? '0.00'}
            </h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <span>Withdrawable instantly</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className="rounded-2xl border border-white/10 bg-[#1a1a1c]/60 backdrop-blur-xl p-8 flex flex-col justify-between relative z-10 transition-all duration-300 hover:border-[#c5c0ff]/40 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.6)]"
        >
          <div className="flex justify-between items-start mb-6">
            <span className="text-muted-foreground font-semibold uppercase tracking-wider text-xs">Total Views</span>
            <div className="w-10 h-10 rounded-full bg-white/[0.04] flex items-center justify-center">
              <Eye className="h-5 w-5 text-[#c5c0ff]" />
            </div>
          </div>
          <div>
            <h2 className="font-display text-4xl font-extrabold text-foreground mb-2">
              {overview.total_views >= 1000000 
                ? `${(overview.total_views / 1000000).toFixed(1)}M` 
                : overview.total_views >= 1000 
                ? `${(overview.total_views / 1000).toFixed(0)}K` 
                : overview.total_views}
            </h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <span>Best Reel: {overview.best_reel_views >= 1000000 ? `${(overview.best_reel_views / 1000000).toFixed(1)}M` : `${(overview.best_reel_views / 1000).toFixed(0)}K`} views</span>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="font-display text-2xl font-bold bg-gradient-to-r from-white to-[#c8c6c8] bg-clip-text text-transparent">Active Campaigns</h2>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#1a1a1c]/60 p-12 text-center">
          <p className="text-muted-foreground">No campaigns available.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-2">
          {campaigns.map((campaign, i) => (
            <motion.div
              key={campaign.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.04 }}
              className="space-y-3"
            >
              <CampaignBudgetCard campaign={campaign} />
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Badge className={categoryColors[campaign.category] || 'bg-muted text-muted-foreground'}>
                    {campaign.category}
                  </Badge>
                  {campaign.id === topCampaign?.id && (
                    <Badge className="bg-warning/10 text-warning border border-warning/20">Top Paying</Badge>
                  )}
                </div>
                <Button asChild size="sm" className="text-xs bg-gradient-to-r from-[#8c84eb] to-[#ffb59e] hover:from-[#7b72e7] hover:to-[#ffa488] text-white font-semibold shadow-lg shadow-[#8c84eb]/20 active:scale-[0.98] transition-all duration-200">
                  <Link to={`/campaign/${campaign.id}`}>View Details</Link>
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default Dashboard;
