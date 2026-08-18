import Link from 'next/link';
import type { CompletedCampaignCard } from '@/lib/public-campaigns';
import { formatTZS } from '@/lib/public-campaigns';
import { formatDate } from '@/utils/utils';

type CardImpactStoryProps = {
  story: CompletedCampaignCard;
  locale?: string;
};

/**
 * A completed campaign whose completion-report proof has been approved —
 * the "blog post" for a finished campaign. Uses a plain <img> (not
 * next/image) because the photo is served from the backend's own /uploads/
 * origin, which isn't in next.config.mjs's remotePatterns allowlist.
 */
export default function CardImpactStory({ story, locale = '' }: CardImpactStoryProps) {
  const href = locale && locale !== 'en' ? `/${locale}/blog/campaign/${story.slug}/` : `/blog/campaign/${story.slug}/`;

  return (
    <Link
      className="group relative block overflow-hidden rounded-xl ring-zinc-500 outline-hidden transition duration-500 focus-visible:ring-3 dark:ring-zinc-200 dark:focus:outline-hidden"
      href={href}
    >
      <div className="relative h-[280px] w-full shrink-0 overflow-hidden rounded-xl bg-neutral-200 before:absolute before:inset-x-0 before:z-1 before:size-full before:bg-linear-to-t before:from-neutral-900/[.75] dark:bg-neutral-800">
        {story.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={story.image}
            alt={story.title}
            className="absolute start-0 top-0 size-full object-cover transition duration-500 group-hover:scale-110"
            draggable={false}
          />
        ) : null}
      </div>

      <div className="absolute inset-x-0 top-0 z-10 p-4 sm:p-6">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/90 px-2.5 py-1 text-xs font-semibold text-white">
          Campaign completed
        </span>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10">
        <div className="flex h-full flex-col p-4 sm:p-6">
          {story.organizationName && (
            <p className="text-xs text-neutral-50/[.8]">{story.organizationName}</p>
          )}
          <h3 className="mt-1 text-lg font-bold text-balance text-neutral-50 group-hover:text-neutral-50/[.8] sm:text-2xl">
            {story.title}
          </h3>
          <p className="mt-2 line-clamp-2 text-pretty text-sm text-neutral-50/[.8]">
            {story.excerpt}
          </p>
          <p className="mt-3 text-xs font-medium text-neutral-50/[.9]">
            {formatTZS(story.raisedAmount)} raised · {story.donorCount} donors ·{' '}
            {formatDate(new Date(story.publishedAt))}
          </p>
        </div>
      </div>
    </Link>
  );
}
