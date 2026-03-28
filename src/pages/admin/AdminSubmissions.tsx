import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { CheckCircle, XCircle, AlertTriangle, ExternalLink, Eye } from 'lucide-react';
import { api } from '@/lib/api';

interface Submission {
  id: string;
  campaign_id: string;
  user_id: string;
  reel_url: string;
  status: string;
  submitted_at: string;
  views: number;
  earnings: number;
  campaigns?: { title: string; reward_per_million_views: number } | null;
  profiles?: { instagram_username: string | null; name: string; email: string } | null;
}

const statusColors: Record<string, string> = {
  Pending: 'bg-warning/10 text-warning border border-warning/20',
  Approved: 'bg-success/10 text-success border border-success/20',
  Rejected: 'bg-destructive/10 text-destructive border border-destructive/20',
  Flagged: 'bg-primary/10 text-primary border border-primary/20',
};

const AdminSubmissions = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [campaigns, setCampaigns] = useState<{ id: string; title: string }[]>([]);
  const [filterCampaign, setFilterCampaign] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [editingViews, setEditingViews] = useState<Record<string, string>>({});

  const fetchSubmissions = async () => {
    const data = await api.get<Submission[]>('/api/admin/submissions');
    setSubmissions(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchSubmissions();
    api.get<{ id: string; title: string }[]>('/api/admin/campaigns').then(data => {
      setCampaigns(data.map(({ id, title }) => ({ id, title })));
    });
  }, []);

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/api/admin/submissions/${id}/status`, { status });
      toast.success(`Submission ${status.toLowerCase()}.`);
      fetchSubmissions();
    } catch {
      toast.error('Failed to update.');
    }
  };

  const updateViews = async (id: string, campaignReward: number) => {
    const views = parseInt(editingViews[id] || '0');
    if (isNaN(views) || views < 0) { toast.error('Invalid views.'); return; }
    const earnings = (views / 1_000_000) * campaignReward;

    try {
      await api.patch(`/api/admin/submissions/${id}/views`, {
        views,
        earnings: parseFloat(earnings.toFixed(2)),
      });
      toast.success('Views updated!');
      setEditingViews(ev => { const copy = { ...ev }; delete copy[id]; return copy; });
      fetchSubmissions();
    } catch {
      toast.error('Failed to update views.');
    }
  };

  const filtered = submissions.filter(s => {
    if (filterCampaign !== 'all' && s.campaign_id !== filterCampaign) return false;
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    return true;
  });

  return (
    <AdminLayout>
      <h1 className="font-display text-2xl font-bold mb-6">Submissions Review</h1>

      <div className="flex flex-wrap gap-3 mb-5">
        <Select value={filterCampaign} onValueChange={setFilterCampaign}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Campaign" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Campaigns</SelectItem>
            {campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Approved">Approved</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
            <SelectItem value="Flagged">Flagged</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-muted-foreground">No submissions found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((sub, i) => (
            <motion.div
              key={sub.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="glass-card p-4"
            >
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">
                      @{sub.profiles?.instagram_username || sub.profiles?.name || 'Unknown'}
                    </span>
                    <Badge className={statusColors[sub.status] || ''}>{sub.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{sub.campaigns?.title || 'Unknown Campaign'}</p>
                  <a href={sub.reel_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1 mt-1">
                    View Reel <ExternalLink className="h-3 w-3" />
                  </a>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(sub.submitted_at).toLocaleString()}</p>
                </div>

                {/* Views input */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type="number"
                      className="w-28 h-8 text-sm"
                      placeholder={String(sub.views || 0)}
                      value={editingViews[sub.id] ?? ''}
                      onChange={e => setEditingViews(ev => ({ ...ev, [sub.id]: e.target.value }))}
                    />
                  </div>
                  {editingViews[sub.id] !== undefined && (
                    <Button size="sm" variant="outline" className="h-8 text-xs"
                      onClick={() => updateViews(sub.id, sub.campaigns?.reward_per_million_views || 100)}>
                      Save
                    </Button>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" className="text-success hover:text-success hover:bg-success/10 h-8"
                    onClick={() => updateStatus(sub.id, 'Approved')} disabled={sub.status === 'Approved'}>
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8"
                    onClick={() => updateStatus(sub.id, 'Rejected')} disabled={sub.status === 'Rejected'}>
                    <XCircle className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-warning hover:text-warning hover:bg-warning/10 h-8"
                    onClick={() => updateStatus(sub.id, 'Flagged')} disabled={sub.status === 'Flagged'}>
                    <AlertTriangle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminSubmissions;
