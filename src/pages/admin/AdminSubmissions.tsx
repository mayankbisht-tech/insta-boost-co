import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { CheckCircle, XCircle, AlertTriangle, ExternalLink, Eye, Heart, MessageCircle, PlayCircle, RefreshCcw } from 'lucide-react';
import { api } from '@/lib/api';

interface Submission {
  id: string;
  campaign_id: string;
  user_id: string;
  reel_url: string;
  status: string;
  reel_uploaded_at: string;
  submission_closes_at: string;
  rejection_reason: string | null;
  submitted_at: string;
  views: number;
  play_count: number;
  likes_count: number;
  comments_count: number;
  analytics_source: string | null;
  analytics_synced_at: string | null;
  earnings: number;
  campaigns?: { title: string; reward_per_million_views: number } | null;
  profiles?: { instagram_username: string | null; name: string; email: string } | null;
}

interface SyncAnalyticsResponse {
  submission: Submission;
  refresh_limit: number;
  refreshes_remaining: number;
  window_resets_at: string | null;
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
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [refreshInfo, setRefreshInfo] = useState<Pick<SyncAnalyticsResponse, 'refresh_limit' | 'refreshes_remaining' | 'window_resets_at'> | null>(null);

  const fetchSubmissions = async () => {
    const data = await api.get<Submission[]>('/api/admin/submissions');
    setSubmissions(data);
    setLoading(false);
  };

  useEffect(() => {
    void fetchSubmissions();
    api.get<{ id: string; title: string }[]>('/api/admin/campaigns').then(data => {
      setCampaigns(data.map(({ id, title }) => ({ id, title })));
    });
  }, []);

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/api/admin/submissions/${id}/status`, { status });
      toast.success(`Submission ${status.toLowerCase()}.`);
      void fetchSubmissions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update.');
    }
  };

  const updateViews = async (id: string) => {
    const views = parseInt(editingViews[id] || '0', 10);
    if (Number.isNaN(views) || views < 0) {
      toast.error('Invalid views.');
      return;
    }

    try {
      await api.patch(`/api/admin/submissions/${id}/views`, { views });
      toast.success('Views updated.');
      setEditingViews(current => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      void fetchSubmissions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update views.');
    }
  };

  const syncAnalytics = async (id: string) => {
    setSyncingId(id);
    try {
      const response = await api.patch<SyncAnalyticsResponse>(`/api/admin/submissions/${id}/sync-analytics`);
      setSubmissions(current =>
        current.map(submission => (submission.id === id ? response.submission : submission)),
      );
      setRefreshInfo({
        refresh_limit: response.refresh_limit,
        refreshes_remaining: response.refreshes_remaining,
        window_resets_at: response.window_resets_at,
      });
      toast.success(`Analytics synced. ${response.refreshes_remaining} refreshes left this hour.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to sync analytics.');
    } finally {
      setSyncingId(null);
    }
  };

  const filtered = submissions.filter(submission => {
    if (filterCampaign !== 'all' && submission.campaign_id !== filterCampaign) return false;
    if (filterStatus !== 'all' && submission.status !== filterStatus) return false;
    return true;
  });

  return (
    <AdminLayout>
      <h1 className="font-display text-2xl font-bold mb-6">Submissions Review</h1>
      {refreshInfo && (
        <p className="mb-5 text-sm text-muted-foreground">
          Refreshes left this hour: {refreshInfo.refreshes_remaining}/{refreshInfo.refresh_limit}
          {refreshInfo.window_resets_at ? `, resets ${new Date(refreshInfo.window_resets_at).toLocaleTimeString()}` : ''}
        </p>
      )}

      <div className="flex flex-wrap gap-3 mb-5">
        <Select value={filterCampaign} onValueChange={setFilterCampaign}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Campaign" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Campaigns</SelectItem>
            {campaigns.map(campaign => <SelectItem key={campaign.id} value={campaign.id}>{campaign.title}</SelectItem>)}
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
          {filtered.map((submission, i) => (
            <motion.div
              key={submission.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="glass-card p-4"
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
                <div className="flex-1 min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      @{submission.profiles?.instagram_username || submission.profiles?.name || 'Unknown'}
                    </span>
                    <Badge className={statusColors[submission.status] || ''}>{submission.status}</Badge>
                    {submission.analytics_source && <Badge variant="outline">{submission.analytics_source}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{submission.campaigns?.title || 'Unknown Campaign'}</p>
                  <a href={submission.reel_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1 mt-1">
                    View Reel <ExternalLink className="h-3 w-3" />
                  </a>
                  <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-2 xl:grid-cols-4">
                    <p>Uploaded: {new Date(submission.reel_uploaded_at).toLocaleString()}</p>
                    <p>Window closes: {new Date(submission.submission_closes_at).toLocaleString()}</p>
                    <p>Submitted: {new Date(submission.submitted_at).toLocaleString()}</p>
                    <p>{submission.analytics_synced_at ? `Synced ${new Date(submission.analytics_synced_at).toLocaleString()}` : 'Not synced yet'}</p>
                  </div>
                  {submission.rejection_reason && (
                    <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                      {submission.rejection_reason}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[420px]">
                  <div className="rounded-lg border border-border/70 p-3">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground"><Eye className="h-3.5 w-3.5" /> Views</div>
                    <p className="mt-2 text-xl font-semibold">{submission.views.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg border border-border/70 p-3">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground"><PlayCircle className="h-3.5 w-3.5" /> Plays</div>
                    <p className="mt-2 text-xl font-semibold">{submission.play_count.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg border border-border/70 p-3">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground"><Heart className="h-3.5 w-3.5" /> Likes</div>
                    <p className="mt-2 text-xl font-semibold">{submission.likes_count.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg border border-border/70 p-3">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground"><MessageCircle className="h-3.5 w-3.5" /> Comments</div>
                    <p className="mt-2 text-xl font-semibold">{submission.comments_count.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 border-t border-border/70 pt-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type="number"
                      className="w-28 h-8 text-sm"
                      placeholder={String(submission.views || 0)}
                      value={editingViews[submission.id] ?? ''}
                      onChange={event => setEditingViews(current => ({ ...current, [submission.id]: event.target.value }))}
                    />
                  </div>
                  {editingViews[submission.id] !== undefined && (
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => void updateViews(submission.id)}>
                      Save Views
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => void syncAnalytics(submission.id)}
                    disabled={syncingId === submission.id}
                  >
                    <RefreshCcw className="mr-1 h-3.5 w-3.5" />
                    {syncingId === submission.id ? 'Syncing...' : 'Sync Apify'}
                  </Button>
                  <span className="text-sm font-medium text-success">${Number(submission.earnings || 0).toFixed(2)}</span>
                </div>

                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" className="text-success hover:text-success hover:bg-success/10 h-8"
                    onClick={() => void updateStatus(submission.id, 'Approved')} disabled={submission.status === 'Approved'}>
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8"
                    onClick={() => void updateStatus(submission.id, 'Rejected')} disabled={submission.status === 'Rejected'}>
                    <XCircle className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-warning hover:text-warning hover:bg-warning/10 h-8"
                    onClick={() => void updateStatus(submission.id, 'Flagged')} disabled={submission.status === 'Flagged'}>
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
