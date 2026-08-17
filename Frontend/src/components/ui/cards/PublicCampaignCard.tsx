import Link from 'next/link';
import Icon from '@/components/ui/icons/Icon';
import { formatTZS, type Locale, type PublicCampaign } from '@/lib/public-campaigns';

type PublicCampaignCardProps = {
  campaign: PublicCampaign;
  wide?: boolean;
  locale?: Locale;
};

const imageClass =
  'absolute inset-0 h-full w-full object-cover object-center transition duration-[600ms] ease-[cubic-bezier(0.45,0,0.55,1)] group-hover:scale-110';

const RAISED_OF = { en: 'raised of', sw: 'zimekusanywa kati ya lengo la' } as const;

export default function PublicCampaignCard({ campaign, wide = false, locale = 'en' }: PublicCampaignCardProps) {
  return (
    <Link
      href={locale === 'sw' ? `/sw/campaigns/${campaign.slug}` : `/campaigns/${campaign.slug}`}
      className={`group relative flex h-48 items-end overflow-hidden rounded-xl shadow-lg ring-zinc-500 outline-hidden focus-visible:ring-3 md:h-80 dark:ring-zinc-200 dark:focus:outline-hidden ${
        wide ? 'md:col-span-2' : ''
      }`}
    >
      {campaign.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={campaign.imageUrl} alt={campaign.name} className={imageClass} draggable={false} />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-emerald-100 to-blue-100 dark:from-emerald-900/40 dark:to-blue-900/40">
          <Icon name="house" className="h-12 w-12 text-emerald-600/50 dark:text-emerald-400/50" />
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-neutral-800 via-transparent to-transparent opacity-60" />
      <div className="relative mb-3 ml-4 mr-4 md:ml-5 md:mr-5">
        <span className="inline-block text-sm font-bold text-neutral-50 transition duration-[600ms] ease-[cubic-bezier(0.45,0,0.55,1)] group-hover:scale-110 md:text-lg">
          {campaign.name} <Icon name="openInNew" />
        </span>
        <div className="mt-1.5 h-1.5 w-full max-w-56 overflow-hidden rounded-full bg-neutral-50/30">
          <div
            className="h-full rounded-full bg-emerald-400"
            style={{ width: `${Math.min(100, campaign.progressPercent)}%` }}
          />
        </div>
        <span className="mt-1 block text-xs text-neutral-100">
          {formatTZS(campaign.raisedAmount)} {RAISED_OF[locale]} {formatTZS(campaign.publicTarget)}
        </span>
      </div>
    </Link>
  );
}
