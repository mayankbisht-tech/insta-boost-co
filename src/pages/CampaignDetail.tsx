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
import { ArrowLeft, CheckCircle2, AlertTriangle, TrendingUp, Trophy, Clock3, Radar } from 'lucide-react';

interface Campaign {
  id: string;
  title: string;
  description: string;
  category: string;
  reward_per_million_views: number;
  rules: string[];
  status: string;
  image_url: string | null;
}

const submissionWindowMinutes = 120;

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

    if (!validateReelUrl(reelUrl)) {
      toast.error('Please enter a valid Instagram Reel URL.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/api/submissions', {
        campaign_id: campaign.id,
        reel_url: reelUrl.trim(),
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
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 text-muted-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
        {campaign.image_url && (
          <div className="h-48 rounded-xl overflow-hidden mb-6">
            <img src={campaign.image_url} alt={campaign.title} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="glass-card p-6">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Badge className={
              campaign.category === 'Sports' ? 'bg-info/10 text-info border border-info/20' :
              campaign.category === 'Gambling' ? 'bg-warning/10 text-warning border border-warning/20' :
              'bg-success/10 text-success border border-success/20'
            }>
              {campaign.category}
            </Badge>
            <Badge variant={campaign.status === 'Active' ? 'default' : 'secondary'}>{campaign.status}</Badge>
          </div>

          <h1 className="font-display text-2xl font-bold mb-3">{campaign.title}</h1>
          <p className="text-muted-foreground mb-6 leading-relaxed">{campaign.description}</p>

          <div className="flex items-center gap-2 text-primary mb-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <TrendingUp className="h-4 w-4" />
            <span className="font-display font-semibold">${campaign.reward_per_million_views} per 1M views</span>
          </div>

          <div className="mb-6 rounded-lg border border-warning/20 bg-warning/5 p-4 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <div>
                <p className="font-medium text-foreground">Submission guardrails</p>
                <p className="mt-1">Submit the reel within {submissionWindowMinutes} minutes of upload.</p>
                <p className="mt-1">Each reel can be used only once across the platform, so duplicate submissions are blocked.</p>
                <p className="mt-1">The reel must belong to the same Instagram account you connected here.</p>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Radar className="h-3.5 w-3.5" />
                  Upload times and account ownership are verified automatically via Apify.
                </div>
              </div>
            </div>
          </div>

          <Button asChild variant="outline" size="sm" className="mb-6">
            <Link to={`/campaign/${campaign.id}/leaderboard`}>
              <Trophy className="h-4 w-4 mr-1" /> View Leaderboard
            </Link>
          </Button>

          <h2 className="font-display text-lg font-semibold mb-3">Campaign Rules</h2>
          <div className="space-y-2 mb-6">
            {campaign.rules?.map((rule, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span>{rule}</span>
              </div>
            ))}
          </div>

          {!canSubmit && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/5 border border-warning/10 mb-4 text-sm">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <span>
                {!profile?.instagram_connected
                  ? 'Connect your Instagram account to submit reels.'
                  : 'This campaign is closed.'}
              </span>
            </div>
          )}

          {!showSubmit ? (
            <Button onClick={() => setShowSubmit(true)} disabled={!canSubmit}>
              Submit Reel
            </Button>
          ) : (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              onSubmit={handleSubmit}
              className="space-y-4 p-4 rounded-lg bg-muted border border-border"
            >
              <div>
                <Label htmlFor="reel-url">Instagram Reel URL</Label>
                <Input
                  id="reel-url"
                  value={reelUrl}
                  onChange={e => setReelUrl(e.target.value)}
                  placeholder="https://www.instagram.com/reel/..."
                  className="mt-1"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                We verify the upload time automatically using Apify before accepting the submission.
              </p>
              <div className="flex gap-2">
                <Button type="submit" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit'}</Button>
                <Button type="button" variant="ghost" onClick={() => setShowSubmit(false)}>Cancel</Button>
              </div>
            </motion.form>
          )}
        </div>
      </motion.div>
    </DashboardLayout>
  );
};

export default CampaignDetail;
