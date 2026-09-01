import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import { ExternalLink, Eye, FileVideo, Heart, MessageCircle, PlayCircle } from 'lucide-react';

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

    void fetchData();
  }, [user]);

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
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-4xl font-extrabold bg-gradient-to-r from-white to-[#c8c6c8] bg-clip-text text-transparent">My Submissions</h1>
          <p className="mt-2 text-body-md text-muted-foreground">
            Track validation progress, view counts, and payout metrics for your submitted reels.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 mb-6 bg-white/[0.02] border border-white/10 p-3 rounded-xl">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px] bg-transparent border-white/10">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1c] border-white/10">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
              <SelectItem value="Flagged">Flagged</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterCampaign} onValueChange={setFilterCampaign}>
            <SelectTrigger className="w-[180px] bg-transparent border-white/10">
              <SelectValue placeholder="Campaign" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1c] border-white/10">
              <SelectItem value="all">All Campaigns</SelectItem>
              {campaigns.map(campaign => (
                <SelectItem key={campaign.id} value={campaign.id}>{campaign.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterDate} onValueChange={setFilterDate}>
            <SelectTrigger className="w-[140px] bg-transparent border-white/10">
              <SelectValue placeholder="Date" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1c] border-white/10">
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
          <div className="rounded-2xl border border-white/10 bg-[#1a1a1c]/60 p-12 text-center">
            <FileVideo className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No submissions found.</p>
            <p className="text-xs text-muted-foreground mt-1">Submit a reel from a campaign to see it here.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {filtered.map((submission, index) => (
              <motion.div
                key={submission.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className="rounded-2xl border border-white/10 bg-[#1a1a1c]/60 backdrop-blur-xl p-6 transition-all hover:bg-[#1a1a1c]/80 shadow-[0_15px_30px_-15px_rgba(0,0,0,0.5)]"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="font-display text-xl font-bold text-foreground">{submission.campaigns?.title || 'Unknown campaign'}</h2>
                      <Badge className={`${statusColors[submission.status] || ''} text-xs font-semibold px-2.5 py-0.5`}>{submission.status}</Badge>
                      {submission.analytics_source && (
                        <Badge variant="outline" className="border-white/20 text-muted-foreground text-xs">{submission.analytics_source}</Badge>
                      )}
                    </div>

                    <a
                      href={submission.reel_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#c5c0ff] hover:underline flex items-center gap-1.5 text-sm font-semibold"
                    >
                      View reel <ExternalLink className="h-3.5 w-3.5" />
                    </a>

                    <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 xl:grid-cols-4 pt-1">
                      <p><span className="font-semibold text-foreground">Uploaded:</span> {submission.reel_uploaded_at ? new Date(submission.reel_uploaded_at).toLocaleString() : 'N/A'}</p>
                      <p><span className="font-semibold text-foreground">Window Closes:</span> {submission.submission_closes_at ? new Date(submission.submission_closes_at).toLocaleString() : 'N/A'}</p>
                      <p><span className="font-semibold text-foreground">Submitted:</span> {submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : 'N/A'}</p>
                      <p>{submission.analytics_synced_at ? `Synced: ${new Date(submission.analytics_synced_at).toLocaleString()}` : 'Analytics not synced yet'}</p>
                    </div>

                    {submission.rejection_reason && (
                      <div className="text-sm text-red-300 bg-red-950/20 border border-red-900/30 rounded-lg p-3 mt-2">
                        <span className="font-bold">Admin review note:</span> {submission.rejection_reason}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[420px]">
                    <div className="rounded-xl border border-white/10 bg-white/[0.01] p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <Eye className="h-3.5 w-3.5 text-[#c5c0ff]" /> Views
                      </div>
                      <p className="mt-2 text-lg font-extrabold text-foreground">{(submission.views ?? 0).toLocaleString()}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.01] p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <PlayCircle className="h-3.5 w-3.5 text-[#ffb59e]" /> Plays
                      </div>
                      <p className="mt-2 text-lg font-extrabold text-foreground">{(submission.play_count ?? 0).toLocaleString()}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.01] p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <Heart className="h-3.5 w-3.5 text-[#c5c0ff]" /> Likes
                      </div>
                      <p className="mt-2 text-lg font-extrabold text-foreground">{(submission.likes_count ?? 0).toLocaleString()}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.01] p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <MessageCircle className="h-3.5 w-3.5 text-[#ffb59e]" /> Comments
                      </div>
                      <p className="mt-2 text-lg font-extrabold text-foreground">{(submission.comments_count ?? 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
                  <div className="flex items-center gap-3">
                    <p className="text-xs text-muted-foreground">
                      {submission.status === 'Rejected' || submission.status === 'Flagged'
                        ? 'This reel is not earning right now because its status is rejected or flagged.'
                        : 'Analytics updates are managed by admin only.'}
                    </p>
                  </div>
                  <p className={`text-xl font-extrabold bg-gradient-to-r ${submission.earnings > 0 ? 'from-[#c5c0ff] to-[#ffb59e] bg-clip-text text-transparent' : 'from-foreground to-foreground text-foreground'}`}>
                    ₹{Number(submission.earnings || 0).toFixed(2)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Submissions;
