import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatDate } from '@/utils/utils';
import { getCompletedCampaign, formatTZS } from '@/lib/public-campaigns';

type Params = { params: Promise<{ slug: string }> };

// DB-backed, not filesystem content — always fetched fresh, no static params.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const story = await getCompletedCampaign(slug, 'sw');
  if (!story) return { title: 'Hadithi ya Mafanikio' };
  return {
    title: story.title,
    description: story.completionSummary.slice(0, 160),
    openGraph: {
      title: `${story.title} | Hadithi ya Mafanikio | Changia`,
      description: story.completionSummary.slice(0, 160),
    },
  };
}

export default async function SwahiliImpactStoryPage({ params }: Params) {
  const { slug } = await params;
  const story = await getCompletedCampaign(slug, 'sw');
  if (!story) notFound();

  return (
    <section className="mx-auto max-w-3xl px-4 pt-6 pb-16 sm:px-6 lg:px-8 lg:pt-10">
      <div className="mb-6 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/90 px-2.5 py-1 text-xs font-semibold text-white">
          Kampeni imekamilika
        </span>
        {story.organizationName && (
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {story.organizationName}
          </span>
        )}
      </div>

      <h1 className="mb-3 text-2xl font-bold text-neutral-800 md:text-4xl dark:text-neutral-200">
        {story.title}
      </h1>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        Ilichapishwa {formatDate(new Date(story.publishedAt))}
      </p>

      {story.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="mt-6 w-full rounded-xl object-cover"
          src={story.image}
          alt={story.title}
        />
      )}

      <div className="mt-8 grid grid-cols-2 gap-4 rounded-xl border border-neutral-200 p-5 sm:grid-cols-4 dark:border-neutral-700">
        <Stat label="Lengo" value={formatTZS(story.goalAmount)} />
        <Stat label="Kiasi kilichopatikana" value={formatTZS(story.raisedAmount)} />
        <Stat label="Wafadhili" value={String(story.donorCount)} />
        <Stat label="Asilimia iliyofikiwa" value={`${story.progressPercent}%`} />
      </div>

      {story.campaignStory && (
        <div className="mt-8">
          <h2 className="mb-2 text-lg font-bold text-neutral-800 dark:text-neutral-200">
            Kuhusu kampeni
          </h2>
          <p className="text-pretty text-neutral-700 dark:text-neutral-300">{story.campaignStory}</p>
        </div>
      )}

      <div className="mt-8">
        <h2 className="mb-2 text-lg font-bold text-neutral-800 dark:text-neutral-200">
          Jinsi fedha zilivyotumika
        </h2>
        {story.amountUtilized != null && (
          <p className="mb-3 text-sm font-medium text-neutral-600 dark:text-neutral-400">
            Kiasi kilichotumika: {formatTZS(story.amountUtilized)}
          </p>
        )}
        <p className="text-pretty text-lg text-neutral-700 dark:text-neutral-300">
          {story.completionSummary}
        </p>
      </div>

      {story.proofImages.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-bold text-neutral-800 dark:text-neutral-200">
            Uthibitisho
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {story.proofImages.map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={src}
                src={src}
                alt="Uthibitisho wa matumizi ya fedha"
                className="aspect-square w-full rounded-lg object-cover"
              />
            ))}
          </div>
        </div>
      )}

      <div className="mt-10">
        <Link
          href="/sw/blog"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          ← Rudi kwenye blogu
        </Link>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-neutral-800 dark:text-neutral-200">{value}</p>
    </div>
  );
}
