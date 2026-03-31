import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { motion } from 'framer-motion';
import { Users, Megaphone, FileVideo, CheckCircle, XCircle, Clock, Eye, DollarSign, Radar } from 'lucide-react';
import { api } from '@/lib/api';

interface AdminOverviewStats {
  totalUsers: number;
  totalCampaigns: number;
  totalSubmissions: number;
  approved: number;
  rejected: number;
  pending: number;
  totalViews: number;
  totalEarnings: number;
  averageViews: number;
  uniqueReels: number;
  reelsWithAnalytics: number;
  pendingInstagramVerifications: number;
}

const emptyStats: AdminOverviewStats = {
  totalUsers: 0,
  totalCampaigns: 0,
  totalSubmissions: 0,
  approved: 0,
  rejected: 0,
  pending: 0,
  totalViews: 0,
  totalEarnings: 0,
  averageViews: 0,
  uniqueReels: 0,
  reelsWithAnalytics: 0,
  pendingInstagramVerifications: 0,
};

const AdminOverview = () => {
  const [stats, setStats] = useState<AdminOverviewStats>(emptyStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const data = await api.get<AdminOverviewStats>('/api/admin/overview');
      setStats(data);
      setLoading(false);
    };
    void fetchStats();
  }, []);

  const cards = [
    { label: 'Visible Users', value: stats.totalUsers, icon: Users, color: 'text-primary' },
    { label: 'Campaigns', value: stats.totalCampaigns, icon: Megaphone, color: 'text-info' },
    { label: 'Submissions', value: stats.totalSubmissions, icon: FileVideo, color: 'text-foreground' },
    { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'text-success' },
    { label: 'Rejected', value: stats.rejected, icon: XCircle, color: 'text-destructive' },
    { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-warning' },
    { label: 'Total Views', value: stats.totalViews.toLocaleString(), icon: Eye, color: 'text-primary' },
    { label: 'Avg Views/Reel', value: stats.averageViews.toLocaleString(), icon: Radar, color: 'text-info' },
  ];

  return (
    <AdminLayout>
      <h1 className="font-display text-2xl font-bold mb-6">Admin Overview</h1>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-5"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{card.label}</span>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <p className="font-display text-3xl font-bold">{card.value}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="h-4 w-4 text-success" />
                Total Earnings
              </div>
              <p className="mt-3 font-display text-3xl font-bold text-success">${stats.totalEarnings.toFixed(2)}</p>
            </div>
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileVideo className="h-4 w-4 text-primary" />
                Unique Reels
              </div>
              <p className="mt-3 font-display text-3xl font-bold">{stats.uniqueReels}</p>
            </div>
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Radar className="h-4 w-4 text-info" />
                Analytics Coverage
              </div>
              <p className="mt-3 font-display text-3xl font-bold">{stats.reelsWithAnalytics}</p>
              <p className="mt-2 text-xs text-muted-foreground">{stats.pendingInstagramVerifications} Instagram verification requests waiting.</p>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminOverview;
