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
  eligible: number;
  totalViews: number;
  totalEarnings: number;
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
  eligible: 0,
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
      setStats({ ...emptyStats, ...data });
      setLoading(false);
    };
    void fetchStats();
  }, []);

  const cards = [
    { label: 'Visible Users', value: stats.totalUsers, icon: Users, color: 'from-primary to-primary/60' },
    { label: 'Campaigns', value: stats.totalCampaigns, icon: Megaphone, color: 'from-accent to-accent/60' },
    { label: 'Submissions', value: stats.totalSubmissions, icon: FileVideo, color: 'from-info to-info/60' },
    { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'from-success to-success/60' },
    { label: 'Rejected', value: stats.rejected, icon: XCircle, color: 'from-destructive to-destructive/60' },
    { label: 'Pending', value: stats.pending, icon: Clock, color: 'from-warning to-warning/60' },
    { label: 'Eligible', value: stats.eligible, icon: Radar, color: 'from-primary to-primary/60' },
    { label: 'Total Views', value: stats.totalViews.toLocaleString(), icon: Eye, color: 'from-accent to-accent/60' },
  ];

  return (
    <AdminLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <div className="mb-8">
          <h1 className="admin-header">Dashboard Overview</h1>
          <p className="text-muted-foreground mt-2">Monitor your platform metrics in real-time</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="space-y-4 text-center">
              <div className="h-8 w-8 mx-auto animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
              <p className="text-muted-foreground text-sm">Loading dashboard...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {cards.map((card, i) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.4 }}
                  whileHover={{ y: -4 }}
                  className="stat-card group"
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background: `linear-gradient(135deg, hsl(var(--primary) / 0.05), transparent)`,
                    }}
                  />
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-muted-foreground">{card.label}</span>
                      <motion.div
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <div className={`stat-icon h-10 w-10 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                          <card.icon className="h-6 w-6 text-white" />
                        </div>
                      </motion.div>
                    </div>
                    <motion.p 
                      className="font-display text-4xl font-bold"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.08 + 0.2 }}
                    >
                      {card.value}
                    </motion.p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="stat-card relative overflow-hidden"
              >
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-success/10 rounded-full blur-3xl" />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-success to-success/60 flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Earnings</p>
                    </div>
                  </div>
                  <motion.p 
                    className="font-display text-4xl font-bold text-success"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    ${stats.totalEarnings.toFixed(2)}
                  </motion.p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="stat-card relative overflow-hidden"
              >
                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                      <FileVideo className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Unique Content</p>
                    </div>
                  </div>
                  <motion.p 
                    className="font-display text-4xl font-bold"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    {stats.uniqueReels}
                  </motion.p>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </motion.div>
    </AdminLayout>
  );
};

export default AdminOverview;
