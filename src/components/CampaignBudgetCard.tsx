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
    <article className={`relative overflow-hidden rounded-[28px] border border-slate-200 bg-white text-slate-900 shadow-[0_24px_60px_rgba(15,23,42,0.12)] ring-1 ring-slate-100 ${className}`.trim()}>
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 via-indigo-500 to-amber-400" />
      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            {campaign.image_url ? (
              <img
                src={campaign.image_url}
                alt={campaign.title}
                className="h-16 w-24 rounded-xl border border-slate-200 object-cover shadow-sm"
                loading="lazy"
              />
            ) : (
              <div className="flex h-16 w-24 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-sm font-semibold text-amber-800 shadow-sm">
                No image
              </div>
            )}
            <div>
              <h3 className="font-display text-lg font-semibold leading-tight text-slate-950">{campaign.title}</h3>
              <p className="mt-1 text-sm text-slate-600 line-clamp-1">{campaign.description}</p>
            </div>
          </div>

          <div className="text-left lg:text-right">
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Badge className="border border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-50">{campaign.category}</Badge>
              <Badge className="border border-indigo-200 bg-indigo-50 text-indigo-900 hover:bg-indigo-50">{campaign.status}</Badge>
            </div>
            {!compact && <p className="mt-2 text-sm text-slate-500">{ageLabel((campaign as { created_at?: string }).created_at)}</p>}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 shadow-sm">
            <p className="text-slate-600">Paid Out</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">₹{campaign.spent_budget_rupees.toLocaleString('en-IN')}</p>
            <p className="text-slate-500">/ ₹{campaign.budget_rupees.toLocaleString('en-IN')}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 shadow-sm">
            <p className="text-slate-600">CPM</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">₹{campaign.rupees_per_thousand_views.toLocaleString('en-IN')}</p>
            <p className="text-slate-500">/ 1k views</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 shadow-sm">
            <p className="text-slate-600">Views</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">{campaign.billed_views.toLocaleString('en-IN')}</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 shadow-sm">
            <p className="text-slate-600">Max per reel</p>
            <p className="mt-1 text-lg font-semibold text-emerald-700">₹{campaign.max_earning_rupees.toLocaleString('en-IN')}</p>
            <p className="text-slate-500">Remaining: ₹{campaign.remaining_budget_rupees.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="mt-5">
          <Progress value={progressValue} className="h-2 bg-slate-200" />
          <p className="mt-2 text-xs text-slate-500">{progressValue.toFixed(2)}% budget consumed</p>
        </div>

      </div>
    </article>
  );
};
