import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export interface CampaignBudget {
  id: string;
  title: string;
  description: string;
  category: string;
  image_url: string | null;
  google_drive_url?: string | null;
  status: string;
  rupees_per_thousand_views: number;
  budget_rupees: number;
  max_earning_rupees: number;
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
    <article className={`relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0b0b0b] text-foreground shadow-[0_28px_70px_-24px_hsl(0_0%_0%/0.9)] ring-1 ring-white/5 ${className}`.trim()}>
      <div className="absolute inset-x-0 top-0 h-1 bg-white/10" />
      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            {campaign.image_url ? (
              <img
                src={campaign.image_url}
                alt={campaign.title}
                className="h-16 w-24 rounded-xl border border-white/10 object-cover shadow-sm"
                loading="lazy"
              />
            ) : (
              <div className="flex h-16 w-24 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-muted-foreground shadow-sm">
                No image
              </div>
            )}
            <div>
              <h3 className="font-display text-lg font-semibold leading-tight text-foreground">{campaign.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground line-clamp-1">{campaign.description}</p>
            </div>
          </div>

          <div className="text-left lg:text-right">
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Badge className="border border-white/10 bg-white/[0.04] text-foreground hover:bg-white/[0.04]">{campaign.category}</Badge>
              <Badge className="border border-primary/20 bg-primary/10 text-primary hover:bg-primary/10">{campaign.status}</Badge>
            </div>
            {!compact && <p className="mt-2 text-sm text-muted-foreground">{ageLabel((campaign as { created_at?: string }).created_at)}</p>}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3 sm:gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2 sm:p-3 shadow-sm">
            <p className="text-muted-foreground text-xs sm:text-sm">Paid Out</p>
            <p className="mt-1 text-base sm:text-lg font-semibold text-foreground">₹{campaign.spent_budget_rupees.toLocaleString('en-IN')}</p>
            <p className="text-muted-foreground text-xs">/ ₹{campaign.budget_rupees.toLocaleString('en-IN')}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2 sm:p-3 shadow-sm">
            <p className="text-muted-foreground text-xs sm:text-sm">CPM</p>
            <p className="mt-1 text-base sm:text-lg font-semibold text-foreground">₹{campaign.rupees_per_thousand_views.toLocaleString('en-IN')}</p>
            <p className="text-muted-foreground text-xs">/ 1k views</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2 sm:p-3 shadow-sm">
            <p className="text-muted-foreground text-xs sm:text-sm">Views</p>
            <p className="mt-1 text-base sm:text-lg font-semibold text-foreground">{campaign.billed_views.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="mt-5">
          <Progress value={progressValue} className="h-2 bg-white/[0.08]" />
          <p className="mt-2 text-xs text-muted-foreground">{progressValue.toFixed(2)}% budget consumed</p>
        </div>

      </div>
    </article>
  );
};
