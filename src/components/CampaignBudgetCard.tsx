import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export interface CampaignBudget {
  id: string;
  title: string;
  description: string;
  category: string;
  image_url: string | null;
  status: string;
  rupees_per_thousand_views: number;
  budget_rupees: number;
  spent_budget_rupees: number;
  remaining_budget_rupees: number;
  budget_consumed_percent: number;
  billed_views: number;
}

type CampaignBudgetCardProps = {
  campaign: CampaignBudget;
  className?: string;
  compact?: boolean;
};

const ageLabel = (createdAt?: string) => {
  if (!createdAt) {
    return 'Live now';
  }

  const createdDate = new Date(createdAt);
  const days = Math.max(Math.floor((Date.now() - createdDate.getTime()) / 86_400_000), 0);

  if (days === 0) {
    return 'Today';
  }

  if (days < 7) {
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
};

export const CampaignBudgetCard = ({ campaign, className = '', compact = false }: CampaignBudgetCardProps) => {
  const progressValue = Math.max(0, Math.min(campaign.budget_consumed_percent, 100));

  return (
    <article className={`rounded-3xl border border-primary/20 bg-slate-950 text-slate-100 shadow-xl ${className}`.trim()}>
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {campaign.image_url ? (
              <img
                src={campaign.image_url}
                alt={campaign.title}
                className="h-16 w-24 rounded-xl object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-16 w-24 items-center justify-center rounded-xl bg-primary/30 text-sm font-semibold text-primary-foreground">
                No image
              </div>
            )}
            <div>
              <h3 className="font-display text-lg font-semibold leading-tight">{campaign.title}</h3>
              <p className="mt-1 text-sm text-slate-300 line-clamp-1">{campaign.description}</p>
            </div>
          </div>

          <div className="text-right">
            <div className="flex justify-end gap-2">
              <Badge className="bg-fuchsia-600 text-white hover:bg-fuchsia-600">{campaign.category}</Badge>
              <Badge className="bg-fuchsia-600 text-white hover:bg-fuchsia-600">{campaign.status}</Badge>
            </div>
            {!compact && <p className="mt-2 text-sm text-slate-400">{ageLabel((campaign as { created_at?: string }).created_at)}</p>}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <p className="text-slate-400">Paid Out</p>
            <p className="mt-1 text-2xl font-semibold">₹{campaign.spent_budget_rupees.toLocaleString('en-IN')}</p>
            <p className="text-slate-400">/ ₹{campaign.budget_rupees.toLocaleString('en-IN')}</p>
          </div>
          <div>
            <p className="text-slate-400">CPM</p>
            <p className="mt-1 text-2xl font-semibold">₹{campaign.rupees_per_thousand_views.toLocaleString('en-IN')}</p>
            <p className="text-slate-400">/ 1k views</p>
          </div>
          <div>
            <p className="text-slate-400">Views</p>
            <p className="mt-1 text-2xl font-semibold">{campaign.billed_views.toLocaleString('en-IN')}</p>
          </div>
          <div>
            <p className="text-slate-400">Remaining</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-400">₹{campaign.remaining_budget_rupees.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="mt-5">
          <Progress value={progressValue} className="h-2 bg-slate-700" />
          <p className="mt-2 text-xs text-slate-400">{progressValue.toFixed(2)}% budget consumed</p>
        </div>
      </div>
    </article>
  );
};
