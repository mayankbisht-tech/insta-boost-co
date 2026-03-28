import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { motion } from 'framer-motion';
import { Users, Megaphone, FileVideo, CheckCircle, XCircle, Clock } from 'lucide-react';
import { api } from '@/lib/api';

const AdminOverview = () => {
  const [stats, setStats] = useState({
    totalUsers: 0, totalCampaigns: 0, totalSubmissions: 0,
    approved: 0, rejected: 0, pending: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const data = await api.get<typeof stats>('/api/admin/overview');
      setStats(data);
      setLoading(false);
    };
    fetchStats();
  }, []);

  const cards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-primary' },
    { label: 'Total Campaigns', value: stats.totalCampaigns, icon: Megaphone, color: 'text-info' },
    { label: 'Total Submissions', value: stats.totalSubmissions, icon: FileVideo, color: 'text-foreground' },
    { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'text-success' },
    { label: 'Rejected', value: stats.rejected, icon: XCircle, color: 'text-destructive' },
    { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-warning' },
  ];

  return (
    <AdminLayout>
      <h1 className="font-display text-2xl font-bold mb-6">Admin Overview</h1>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
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
      )}
    </AdminLayout>
  );
};

export default AdminOverview;
