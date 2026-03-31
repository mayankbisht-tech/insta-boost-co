import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ExternalLink, Eye, FileVideo, Heart, MessageCircle, PlayCircle, RefreshCcw } from 'lucide-react';

interface Submission {
  id: string;
  campaign_id: string;
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
  campaigns?: { title: string } | null;
}

interface RefreshQuota {
  refresh_limit: number;
  refreshes_remaining: number;
  window_resets_at: string | null;
}

interface RefreshAnalyticsResponse extends RefreshQuota {
  submission: Submission;
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
  const [quota, setQuota] = useState<RefreshQuota | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

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

    const fetchQuota = async () => {
      const data = await api.get<RefreshQuota>('/api/submissions/refresh-quota');
      setQuota(data);
    };

    void fetchData();
    void fetchQuota();
  }, [user]);

  const refreshAnalytics = async (id: string) => {
    setSyncingId(id);
    try {
      const response = await api.patch<RefreshAnalyticsResponse>(`/api/submissions/${id}/refresh-analytics`);
      setSubmissions(current =>
        current.map(submission => (submission.id === id ? response.submission : submission)),
      );
      setQuota({
        refresh_limit: response.refresh_limit,
        refreshes_remaining: response.refreshes_remaining,
        window_resets_at: response.window_resets_at,
      });
      toast.success(`Analytics updated. ${response.refreshes_remaining} refreshes left this hour.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to refresh analytics.');
    } finally {
      setSyncingId(null);
    }
  };

  const filtered = useMemo(() => submissions.filter(submission => {
    if (filterStatus !== 'all' && submission.status !== filterStatus) return false;
    if (filterCampaign !== 'all' && submission.campaign_id !== filterCampaign) return false;
    if (filterDate !== 'all') {
      const days = filterDate === '7' ? 7 : 30;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      if (new Date(submission.submitted_at) < cutoff) return false;
    }
    return true;
  }), [filterCampaign, filterDate, filterStatus, submissions]);

  return (
    <DashboardLayout>
      <h1 className="font-display text-xl font-bold mb-5">My Submissions</h1>
      {quota && (
        <p className="mb-5 text-sm text-muted-foreground">
          Analytics refreshes left this hour: {quota.refreshes_remaining}/{quota.refresh_limit}
          {quota.window_resets_at ? `, resets ${new Date(quota.window_resets_at).toLocaleTimeString()}` : ''}
        </p>
      )}
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
            {campaigns.map(campaign => (
              <SelectItem key={campaign.id} value={campaign.id}>{campaign.title}</SelectItem>
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
        <div className="space-y-4">
          {filtered.map((submission, index) => (
            <motion.div
              key={submission.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
              className="glass-card p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-lg font-semibold">{submission.campaigns?.title || 'Unknown campaign'}</h2>
                    <Badge className={statusColors[submission.status] || ''}>{submission.status}</Badge>
                    {submission.analytics_source && (
                      <Badge variant="outline">{submission.analytics_source}</Badge>
                    )}
                  </div>

                  <a
                    href={submission.reel_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1 text-sm"
                  >
                    View reel <ExternalLink className="h-3 w-3" />
                  </a>

                  <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
                    <p>Uploaded: {new Date(submission.reel_uploaded_at).toLocaleString()}</p>
                    <p>Submission window closed: {new Date(submission.submission_closes_at).toLocaleString()}</p>
                    <p>Submitted: {new Date(submission.submitted_at).toLocaleString()}</p>
                    <p>{submission.analytics_synced_at ? `Analytics synced ${new Date(submission.analytics_synced_at).toLocaleString()}` : 'Analytics not synced yet'}</p>
                  </div>

                  {submission.rejection_reason && (
                    <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                      {submission.rejection_reason}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[420px]">
                  <div className="rounded-xl border border-border/70 bg-background/60 p-3">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      <Eye className="h-3.5 w-3.5" /> Views
                    </div>
                    <p className="mt-2 text-xl font-semibold">{submission.views.toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background/60 p-3">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      <PlayCircle className="h-3.5 w-3.5" /> Plays
                    </div>
                    <p className="mt-2 text-xl font-semibold">{submission.play_count.toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background/60 p-3">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      <Heart className="h-3.5 w-3.5" /> Likes
                    </div>
                    <p className="mt-2 text-xl font-semibold">{submission.likes_count.toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background/60 p-3">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      <MessageCircle className="h-3.5 w-3.5" /> Comments
                    </div>
                    <p className="mt-2 text-xl font-semibold">{submission.comments_count.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-4">
                <div className="flex items-center gap-3">
                  <p className="text-sm text-muted-foreground">Basic analytics for users stay high level and easy to scan.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void refreshAnalytics(submission.id)}
                    disabled={syncingId === submission.id || Boolean(quota && quota.refreshes_remaining <= 0)}
                  >
                    <RefreshCcw className="mr-2 h-3.5 w-3.5" />
                    {syncingId === submission.id ? 'Updating...' : 'Update'}
                  </Button>
                </div>
                <p className="text-lg font-semibold text-success">${Number(submission.earnings || 0).toFixed(2)}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default Submissions;
