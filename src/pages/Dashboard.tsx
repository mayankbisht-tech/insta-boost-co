import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import DashboardLayout from '@/components/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { TrendingUp, Eye, CheckCircle, XCircle, Clock, DollarSign, BarChart3 } from 'lucide-react';

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

interface Submission {
  status: string;
  views: number;
  earnings: number;
}

const categoryColors: Record<string, string> = {
  Sports: 'bg-info/10 text-info border border-info/20',
  General: 'bg-success/10 text-success border border-success/20',
  Gambling: 'bg-warning/10 text-warning border border-warning/20',
};

const Dashboard = () => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState({ total: 0, approved: 0, rejected: 0, pending: 0 });
  const [earnings, setEarnings] = useState({ total: 0, estimated: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const campData = await api.get<Campaign[]>('/api/campaigns');
      setCampaigns(campData);

      const subData = user ? await api.get<Submission[]>('/api/submissions') : [];
      const subs = subData as Submission[];
      setStats({
        total: subs.length,
        approved: subs.filter(s => s.status === 'Approved').length,
        rejected: subs.filter(s => s.status === 'Rejected').length,
        pending: subs.filter(s => s.status === 'Pending').length,
      });
      const totalEarnings = subs.reduce((sum, s) => sum + Number(s.earnings || 0), 0);
      const estimatedEarnings = subs.reduce((sum, s) => {
        if (s.status === 'Pending' || s.status === 'Approved') {
          return sum + Number(s.earnings || 0);
        }
        return sum;
      }, 0);
      setEarnings({ total: totalEarnings, estimated: estimatedEarnings });
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const statCards = [
    { label: 'Total Submissions', value: stats.total, icon: Eye, color: 'text-primary' },
    { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'text-success' },
    { label: 'Rejected', value: stats.rejected, icon: XCircle, color: 'text-destructive' },
    { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-warning' },
  ];

  const topCampaign = campaigns.reduce((top, c) => c.reward_per_million_views > (top?.reward_per_million_views || 0) ? c : top, campaigns[0]);

  return (
    <DashboardLayout>
      {/* Stats */}
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

      {/* Earnings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-5">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-success" />
            <span className="text-sm text-muted-foreground">Total Earnings</span>
          </div>
          <p className="font-display text-3xl font-bold text-success">${earnings.total.toFixed(2)}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-card p-5">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-4 w-4 text-info" />
            <span className="text-sm text-muted-foreground">Estimated Earnings</span>
          </div>
          <p className="font-display text-3xl font-bold text-info">${earnings.estimated.toFixed(2)}</p>
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
                    <Badge className="bg-warning/10 text-warning border border-warning/20">Top Performing</Badge>
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
                    <span className="text-sm font-semibold">${campaign.reward_per_million_views}/1M</span>
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
