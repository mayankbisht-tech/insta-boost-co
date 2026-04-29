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
    <article className={`rounded-3xl border border-amber-100 bg-gradient-to-br from-white via-sky-50 to-indigo-50 text-slate-900 shadow-[0_18px_50px_rgba(15,23,42,0.08)] ring-1 ring-sky-100/70 ${className}`.trim()}>
      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            {campaign.image_url ? (
              <img
                src={campaign.image_url}
                alt={campaign.title}
                className="h-16 w-24 rounded-xl object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-16 w-24 items-center justify-center rounded-xl bg-amber-100 text-sm font-semibold text-amber-700">
                No image
              </div>
            )}
            <div>
              <h3 className="font-display text-lg font-semibold leading-tight text-slate-900">{campaign.title}</h3>
              <p className="mt-1 text-sm text-slate-700 line-clamp-1">{campaign.description}</p>
            </div>
          </div>

          <div className="text-left lg:text-right">
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">{campaign.category}</Badge>
              <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100">{campaign.status}</Badge>
            </div>
            {!compact && <p className="mt-2 text-sm text-slate-600">{ageLabel((campaign as { created_at?: string }).created_at)}</p>}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-slate-700">Paid Out</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">₹{campaign.spent_budget_rupees.toLocaleString('en-IN')}</p>
            <p className="text-slate-600">/ ₹{campaign.budget_rupees.toLocaleString('en-IN')}</p>
          </div>
          <div>
            <p className="text-slate-700">CPM</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">₹{campaign.rupees_per_thousand_views.toLocaleString('en-IN')}</p>
            <p className="text-slate-600">/ 1k views</p>
          </div>
          <div>
            <p className="text-slate-700">Views</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{campaign.billed_views.toLocaleString('en-IN')}</p>
          </div>
          <div>
            <p className="text-slate-700">Max per user</p>
            <p className="mt-1 text-lg font-semibold text-emerald-600">₹{campaign.max_earning_rupees.toLocaleString('en-IN')}</p>
            <p className="text-slate-600">Remaining: ₹{campaign.remaining_budget_rupees.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="mt-5">
          <Progress value={progressValue} className="h-2 bg-slate-200" />
          <p className="mt-2 text-xs text-slate-600">{progressValue.toFixed(2)}% budget consumed</p>
        </div>

        {campaign.google_drive_url && (
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-amber-100 bg-gradient-to-r from-amber-50 via-white to-sky-50 px-4 py-3 text-sm shadow-sm">
            <div>
              <p className="font-medium text-slate-900">Campaign brief</p>
              <p className="text-slate-600">Google Drive attachment</p>
            </div>
            <a
              href={campaign.google_drive_url}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-indigo-700 transition-colors hover:bg-indigo-100"
            >
              Open link
            </a>
          </div>
        )}
      </div>
    </article>
  );
};
