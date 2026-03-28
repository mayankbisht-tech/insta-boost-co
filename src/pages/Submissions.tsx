import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import { ExternalLink, Eye, DollarSign, FileVideo } from 'lucide-react';

interface Submission {
  id: string;
  campaign_id: string;
  reel_url: string;
  status: string;
  submitted_at: string;
  views: number;
  earnings: number;
  campaigns?: { title: string } | null;
}

const statusColors: Record<string, string> = {
  Pending: 'bg-warning/10 text-warning border border-warning/20',
  Approved: 'bg-success/10 text-success border border-success/20',
  Rejected: 'bg-destructive/10 text-destructive border border-destructive/20',
  Flagged: 'bg-primary/10 text-primary border border-primary/20',
};

const Submissions = () => {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [campaigns, setCampaigns] = useState<{ id: string; title: string }[]>([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCampaign, setFilterCampaign] = useState('all');
  const [filterDate, setFilterDate] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const [data, campData] = await Promise.all([
        api.get<Submission[]>('/api/submissions'),
        api.get<{ id: string; title: string }[]>('/api/campaigns'),
      ]);
      setSubmissions(data);
      setCampaigns(campData.map(({ id, title }) => ({ id, title })));
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const filtered = submissions.filter(s => {
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    if (filterCampaign !== 'all' && s.campaign_id !== filterCampaign) return false;
    if (filterDate !== 'all') {
      const days = filterDate === '7' ? 7 : 30;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      if (new Date(s.submitted_at) < cutoff) return false;
    }
    return true;
  });

  return (
    <DashboardLayout>
      <h1 className="font-display text-xl font-bold mb-5">My Submissions</h1>

      <div className="flex flex-wrap gap-3 mb-5">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Approved">Approved</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
            <SelectItem value="Flagged">Flagged</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterCampaign} onValueChange={setFilterCampaign}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Campaign" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Campaigns</SelectItem>
            {campaigns.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterDate} onValueChange={setFilterDate}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="7">Last 7 Days</SelectItem>
            <SelectItem value="30">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <FileVideo className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No submissions found.</p>
          <p className="text-xs text-muted-foreground mt-1">Submit a reel from a campaign to see it here.</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Campaign</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Reel</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Views</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Earnings</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((sub, i) => (
                <motion.tr
                  key={sub.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="py-3 px-4 font-medium">{sub.campaigns?.title || 'Unknown'}</td>
                  <td className="py-3 px-4">
                    <a href={sub.reel_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                      View <ExternalLink className="h-3 w-3" />
                    </a>
                  </td>
                  <td className="py-3 px-4">
                    <Badge className={statusColors[sub.status] || ''}>{sub.status}</Badge>
                  </td>
                  <td className="py-3 px-4 text-right text-muted-foreground">
                    {(sub.views || 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right text-success font-medium">
                    ${Number(sub.earnings || 0).toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right text-muted-foreground text-xs">
                    {new Date(sub.submitted_at).toLocaleDateString()}
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

export default Submissions;
