import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Eye, DollarSign } from 'lucide-react';
import { api } from '@/lib/api';

interface LeaderboardEntry {
  rank: number;
  username: string;
  views: number;
  earnings: number;
}

const Leaderboard = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [campaignTitle, setCampaignTitle] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      const data = await api.get<{ campaign_title: string; entries: LeaderboardEntry[] }>(`/api/campaigns/${id}/leaderboard`);
      setCampaignTitle(data.campaign_title);
      setEntries(data.entries);
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const rankColors = ['text-warning', 'text-muted-foreground', 'text-warning/60'];

  return (
    <DashboardLayout>
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 text-muted-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>

      <div className="flex items-center gap-2 mb-6">
        <Trophy className="h-5 w-5 text-warning" />
        <h1 className="font-display text-xl font-bold">Leaderboard</h1>
        {campaignTitle && <span className="text-muted-foreground text-sm">— {campaignTitle}</span>}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : entries.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Trophy className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No submissions yet for this campaign.</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Rank</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Creator</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Views</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Earnings</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <motion.tr
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="py-3 px-4">
                    <span className={`font-display font-bold ${i < 3 ? rankColors[i] : ''}`}>
                      #{entry.rank}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium">@{entry.username}</td>
                  <td className="py-3 px-4 text-right">
                    <span className="flex items-center justify-end gap-1 text-muted-foreground">
                      <Eye className="h-3.5 w-3.5" />
                      {entry.views.toLocaleString()}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="flex items-center justify-end gap-1 text-success font-medium">
                      <DollarSign className="h-3.5 w-3.5" />
                      {entry.earnings.toFixed(2)}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Leaderboard;
