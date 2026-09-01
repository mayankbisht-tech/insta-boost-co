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
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-6 text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>

      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04] text-[#ffb59e] border border-white/10">
          <Trophy className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-4xl font-extrabold bg-gradient-to-r from-white to-[#c8c6c8] bg-clip-text text-transparent">Leaderboard</h1>
          {campaignTitle && <p className="text-sm text-muted-foreground mt-1">Campaign: {campaignTitle}</p>}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#1a1a1c]/60 p-12 text-center">
          <Trophy className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No submissions yet for this campaign.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-[#1a1a1c]/60 backdrop-blur-xl overflow-hidden shadow-[0_20px_40px_-20px_rgba(0,0,0,0.5)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02]">
                <th className="text-left py-4 px-6 font-bold uppercase tracking-wider text-xs text-muted-foreground">Rank</th>
                <th className="text-left py-4 px-6 font-bold uppercase tracking-wider text-xs text-muted-foreground">Creator</th>
                <th className="text-right py-4 px-6 font-bold uppercase tracking-wider text-xs text-muted-foreground">Views</th>
                <th className="text-right py-4 px-6 font-bold uppercase tracking-wider text-xs text-muted-foreground">Earnings</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <motion.tr
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-white/10 last:border-b-0 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="py-4 px-6">
                    <span className={`font-display font-black text-base ${i < 3 ? rankColors[i] : 'text-muted-foreground'}`}>
                      #{entry.rank}
                    </span>
                  </td>
                  <td className="py-4 px-6 font-semibold text-foreground">@{entry.username}</td>
                  <td className="py-4 px-6 text-right">
                    <span className="inline-flex items-center justify-end gap-1.5 font-bold text-foreground">
                      <Eye className="h-4 w-4 text-[#c5c0ff]" />
                      {(entry.views ?? 0).toLocaleString()}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <span className="inline-flex items-center justify-end gap-1.5 font-extrabold bg-gradient-to-r from-[#c5c0ff] to-[#ffb59e] bg-clip-text text-transparent">
                      ₹ {(entry.earnings ?? 0).toFixed(2)}
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
