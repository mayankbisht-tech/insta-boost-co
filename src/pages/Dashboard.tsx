import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import DashboardLayout from '@/components/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { TrendingUp, CheckCircle, XCircle, Clock, DollarSign, BarChart3, Eye, Radar, BellRing } from 'lucide-react';

interface Campaign {
  id: string;
  title: string;
  description: string;
  category: string;
  reward_per_million_views: number;
  rules: string[];
  status: string;
  created_at: string;
  image_url: string | null;
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

  const statCards = [
    { label: 'Total Submissions', value: overview.total_submissions, icon: Eye, color: 'text-primary' },
    { label: 'Approved', value: overview.approved, icon: CheckCircle, color: 'text-success' },
    { label: 'Rejected', value: overview.rejected, icon: XCircle, color: 'text-destructive' },
    { label: 'Pending', value: overview.pending, icon: Clock, color: 'text-warning' },
  ];

  const analyticsCards = [
    { label: 'Total Views', value: overview.total_views.toLocaleString(), icon: TrendingUp, color: 'text-primary' },
    { label: 'Average Views', value: overview.average_views.toLocaleString(), icon: BarChart3, color: 'text-info' },
    { label: 'Tracked Reels', value: overview.reels_with_analytics, icon: Radar, color: 'text-foreground' },
    { label: 'Best Reel Views', value: overview.best_reel_views.toLocaleString(), icon: Eye, color: 'text-success' },
  ];

  const topCampaign = campaigns.reduce((top, campaign) =>
    campaign.reward_per_million_views > (top?.reward_per_million_views || 0) ? campaign : top,
  campaigns[0]);

  return (
    <DashboardLayout>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-5">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-success" />
            <span className="text-sm text-muted-foreground">Total Earnings</span>
          </div>
          <p className="font-display text-3xl font-bold text-success">₹ {overview.total_earnings.toFixed(2)}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-card p-5">
          <div className="flex items-center gap-2 mb-1">
            <Radar className="h-4 w-4 text-info" />
            <span className="text-sm text-muted-foreground">Analytics Coverage</span>
          </div>
          <p className="font-display text-3xl font-bold text-info">{overview.reels_with_analytics}/{overview.total_submissions}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {overview.latest_sync_at ? `Latest sync ${new Date(overview.latest_sync_at).toLocaleString()}` : 'No synced reel analytics yet.'}
          </p>
        </motion.div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {analyticsCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.04 }}
            className="glass-card p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{card.label}</span>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
            <p className="font-display text-2xl font-bold">{card.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }} className="glass-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <BellRing className="h-4 w-4 text-primary" />
            <div>
              <h2 className="font-display text-lg font-semibold">Latest Notifications</h2>
              <p className="text-sm text-muted-foreground">Approval, rejection, verification, and analytics updates show up here.</p>
            </div>
          </div>

          {notifications.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/80 px-4 py-6 text-sm text-muted-foreground">
              No notifications yet. As soon as a reel is reviewed or your Instagram verification changes, it will show here.
            </p>
          ) : (
            <div className="space-y-3">
              {notifications.map(notification => (
                <div key={notification.id} className="rounded-xl border border-border/70 bg-background/50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm">{notification.message}</p>
                    {!notification.read && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{new Date(notification.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }} className="glass-card p-5">
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
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {campaigns.map((campaign, i) => (
            <motion.div
              key={campaign.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.04 }}
              className="glass-card overflow-hidden flex flex-col group transition-shadow duration-200"
            >
              {campaign.image_url && (
                <div className="h-40 overflow-hidden">
                  <img
                    src={campaign.image_url}
                    alt={campaign.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
              )}
              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <Badge className={categoryColors[campaign.category] || 'bg-muted text-muted-foreground'}>
                    {campaign.category}
                  </Badge>
                  {campaign.id === topCampaign?.id && (
                    <Badge className="bg-warning/10 text-warning border border-warning/20">Top Paying</Badge>
                  )}
                </div>

                <h3 className="font-display text-base font-semibold mb-1.5 group-hover:text-primary transition-colors">
                  {campaign.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-1">
                  {campaign.description}
                </p>

                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div className="flex items-center gap-1 text-primary">
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span className="text-sm font-semibold">₹ {campaign.reward_per_million_views}/1M</span>
                  </div>
                  <Button asChild size="sm" variant="outline" className="text-xs">
                    <Link to={`/campaign/${campaign.id}`}>View Details</Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default Dashboard;
