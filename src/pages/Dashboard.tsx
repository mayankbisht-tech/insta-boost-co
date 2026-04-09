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
import { TrendingUp, CheckCircle, XCircle, Clock, DollarSign, BarChart3, Eye, Radar, BellRing } from 'lucide-react';

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

interface Notification {
  id: string;
  message: string;
  read: boolean;
  created_at: string;
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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const campData = await api.get<Campaign[]>('/api/campaigns');
      setCampaigns(campData);

      if (user) {
        const [overviewData, notificationData] = await Promise.all([
          api.get<SubmissionOverview>('/api/submissions/overview'),
          api.get<Notification[]>('/api/notifications'),
        ]);
        setOverview(overviewData);
        setNotifications(notificationData.slice(0, 4));
      } else {
        setOverview(emptyOverview);
        setNotifications([]);
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
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{stat.label}</span>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <p className="font-display text-2xl font-bold">{stat.value}</p>
          </motion.div>
        ))}
      </div>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-5 lg:w-1/2"
        >
          <div className="mb-6 flex items-center gap-2 sm:mb-8">
            <DollarSign className="h-7 w-7 text-success sm:h-8 sm:w-8" />
            <span className="text-xl text-muted-foreground sm:text-2xl">Total Earnings</span>
          </div>
          <p className="font-display text-2xl font-bold text-success sm:text-3xl">₹ {overview.total_earnings.toFixed(2)}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.36 }}
          className="glass-card p-5 lg:flex-1"
        >
          <h2 className="font-display text-lg font-semibold">Creator Snapshot</h2>
          <div className="mt-4 space-y-4 text-sm text-muted-foreground">
            <div className="rounded-xl border border-border/70 bg-background/50 p-4">
              <p className="text-xs uppercase tracking-[0.18em]">Connected Instagram</p>
              <p className="mt-2 text-base font-semibold text-foreground">
                {user ? (overview.total_submissions > 0 ? 'Ready for reel submissions' : 'Verified and ready to start') : 'Sign in required'}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      <h2 className="font-display text-xl font-semibold mb-4">Active Campaigns</h2>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-muted-foreground">No campaigns available.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((campaign, i) => (
            <motion.div
              key={campaign.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.04 }}
              className="space-y-3"
            >
              <CampaignBudgetCard campaign={campaign} />
              <div className="flex flex-col items-start gap-2 px-1 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={categoryColors[campaign.category] || 'bg-muted text-muted-foreground'}>
                    {campaign.category}
                  </Badge>
                  {campaign.id === topCampaign?.id && (
                    <Badge className="bg-warning/10 text-warning border border-warning/20">Top Paying</Badge>
                  )}
                </div>
                <Button asChild size="sm" variant="outline" className="w-full text-xs sm:w-auto">
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
