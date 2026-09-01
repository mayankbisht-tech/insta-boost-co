import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import DashboardLayout from '@/components/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2, AlertTriangle, TrendingUp, Trophy, Clock3, Radar, ExternalLink } from 'lucide-react';

interface Campaign {
  id: string;
  title: string;
  description: string;
  category: string;
  max_earning_rupees: number;
  reward_per_million_views: number;
  rules: string[];
  status: string;
  image_url: string | null;
  google_drive_url: string | null;
}

const submissionWindowMinutes = 120;

const normalizeReelUrlInput = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^(www\.)?instagram\.com\//i.test(trimmed)) {
    return `https://${trimmed.replace(/^\/+/, '')}`;
  }

  return trimmed;
};

const CampaignDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [reelUrl, setReelUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);

  useEffect(() => {
    if (id) {
      api.get<Campaign>(`/api/campaigns/${id}`).then(data => {
        setCampaign(data);
      }).catch(() => {
        setCampaign(null);
      });
    }
  }, [id]);

  const validateReelUrl = (url: string) => {
    return /^https?:\/\/(www\.)?instagram\.com\/(reel|reels|p)\/[\w-]+/i.test(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !campaign) return;

    if (!profile?.instagram_connected) {
      toast.error('Connect your Instagram account before submitting.');
      return;
    }

    if (campaign.status !== 'Active') {
      toast.error('This campaign is no longer active.');
      return;
    }

    const normalizedReelUrl = normalizeReelUrlInput(reelUrl);

    if (!validateReelUrl(normalizedReelUrl)) {
      toast.error('Please enter a valid Instagram Reel URL.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/api/submissions', {
        campaign_id: campaign.id,
        reel_url: normalizedReelUrl,
      });
      toast.success('Reel submitted successfully.');
      setReelUrl('');
      setShowSubmit(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit reel.');
    }
    setSubmitting(false);
  };

  if (!campaign) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  const canSubmit = profile?.instagram_connected && campaign.status === 'Active';

  return (
    <DashboardLayout>
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-6 text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to campaigns
      </Button>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mx-auto w-full max-w-3xl">
        {campaign.image_url && (
          <div className="h-56 rounded-2xl overflow-hidden mb-6 border border-white/10 shadow-[0_15px_30px_-15px_rgba(0,0,0,0.5)]">
            <img src={campaign.image_url} alt={campaign.title} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-[#1a1a1c]/60 backdrop-blur-xl p-8 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.8)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#8c84eb] to-[#ffb59e] opacity-50"></div>
          
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <Badge className={
              campaign.category === 'Sports' ? 'bg-info/10 text-info border border-info/20 px-3 py-1 font-semibold text-xs' :
              campaign.category === 'Gambling' ? 'bg-warning/10 text-warning border border-warning/20 px-3 py-1 font-semibold text-xs' :
              'bg-success/10 text-success border border-success/20 px-3 py-1 font-semibold text-xs'
            }>
              {campaign.category}
            </Badge>
            <Badge variant={campaign.status === 'Active' ? 'default' : 'secondary'} className="px-3 py-1 font-semibold text-xs">
              {campaign.status}
            </Badge>
          </div>

          <h1 className="font-display text-3xl font-extrabold text-foreground mb-4">{campaign.title}</h1>
          <p className="text-muted-foreground mb-6 leading-relaxed text-body-md">{campaign.description}</p>

          <div className="flex items-center gap-3 text-[#c5c0ff] mb-6 p-4 rounded-xl bg-white/[0.02] border border-white/10 shadow-inner">
            <TrendingUp className="h-5 w-5 text-[#ffb59e]" />
            <span className="font-display text-lg font-bold">₹ {campaign.reward_per_million_views} per 1M views</span>
          </div>

          <div className="mb-6 rounded-xl border border-white/10 bg-white/[0.01] p-5 text-sm">
            <p className="font-bold text-muted-foreground uppercase tracking-wider text-xs">Max payment per reel</p>
            <p className="mt-2 text-2xl font-extrabold text-foreground">
              ₹ {campaign.max_earning_rupees.toLocaleString('en-IN')}
            </p>
          </div>

          <div className="mb-6 rounded-xl border border-warning/20 bg-warning/5 p-5 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
              <div>
                <p className="font-bold text-foreground mb-2">Submission Guardrails</p>
                <p className="mt-1">Submit the reel within {submissionWindowMinutes} minutes of upload.</p>
                <p className="mt-1">Each reel can be used only once across the platform, so duplicate submissions are blocked.</p>
                <p className="mt-1">The reel must belong to the same Instagram account you connected here.</p>
                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground border-t border-white/5 pt-3">
                  <Radar className="h-4 w-4" />
                  Upload times and account ownership are verified automatically.
                </div>
              </div>
            </div>
          </div>

          {campaign.google_drive_url && (
            <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#1c1b1c]/80 p-5 text-sm">
              <div>
                <p className="font-bold text-foreground">Campaign Brief & Assets</p>
                <p className="text-xs text-muted-foreground mt-1">Google Drive attachment</p>
              </div>
              <Button asChild size="sm" className="shrink-0 bg-white/[0.04] border border-white/10 text-foreground hover:bg-white/[0.08]">
                <a href={campaign.google_drive_url} target="_blank" rel="noreferrer" className="flex items-center gap-2">
                  Open link <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          )}

          <div className="flex gap-3 mb-6">
            <Button asChild variant="outline" size="sm" className="border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-foreground">
              <Link to={`/campaign/${campaign.id}/leaderboard`}>
                <Trophy className="h-4 w-4 mr-2 text-[#ffb59e]" /> View Leaderboard
              </Link>
            </Button>
          </div>

          <h2 className="font-display text-xl font-bold text-foreground mb-4">Campaign Rules</h2>
          <div className="space-y-3 mb-8">
            {campaign.rules?.map((rule, i) => (
              <div key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-[#c5c0ff] mt-0.5 shrink-0" />
                <span>{rule}</span>
              </div>
            ))}
          </div>

          {!canSubmit && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-950/20 border border-red-900/30 mb-6 text-sm text-red-300">
              <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              <span>
                {!profile?.instagram_connected
                  ? 'Connect your Instagram account in settings before submitting reels.'
                  : 'This campaign is currently closed for submissions.'}
              </span>
            </div>
          )}

          {!showSubmit ? (
            <Button 
              onClick={() => setShowSubmit(true)} 
              disabled={!canSubmit}
              className="w-full bg-gradient-to-r from-[#8c84eb] to-[#ffb59e] hover:from-[#7b72e7] hover:to-[#ffa488] text-white font-bold py-4 rounded-xl shadow-lg shadow-[#8c84eb]/20 active:scale-[0.98] transition-all duration-200"
            >
              Submit Reel Link
            </Button>
          ) : (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              onSubmit={handleSubmit}
              className="space-y-5 p-6 rounded-xl bg-[#141415] border border-white/10"
            >
              <div className="space-y-2">
                <Label htmlFor="reel-url" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Instagram Reel URL</Label>
                <div className="relative">
                  <Input
                    id="reel-url"
                    value={reelUrl}
                    onChange={e => setReelUrl(e.target.value)}
                    placeholder="https://www.instagram.com/reel/..."
                    className="w-full bg-[#0e0e0f] border border-white/10 rounded-lg py-3 pl-4 pr-4 text-white focus:border-[#8c84eb] outline-none transition-all placeholder:text-muted-foreground/30"
                    required
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                We verify the upload timestamp and account ownership automatically before accepting submissions.
              </p>
              <div className="flex gap-3 pt-2">
                <Button 
                  type="submit" 
                  disabled={submitting}
                  className="bg-gradient-to-r from-[#8c84eb] to-[#ffb59e] hover:opacity-90 text-white font-bold px-6 py-2.5 rounded-lg active:scale-[0.98] transition-all duration-200"
                >
                  {submitting ? 'Submitting...' : 'Submit Link'}
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setShowSubmit(false)}
                  className="text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                >
                  Cancel
                </Button>
              </div>
            </motion.form>
          )}
        </div>
      </motion.div>
    </DashboardLayout>
  );
};

export default CampaignDetail;
