import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Icon from '@components/ui/icons/Icon';
import PublicCampaignTabs from '@/components/campaigns/PublicCampaignTabs';
import { formatTZS, getPublicCampaign } from '@/lib/public-campaigns';

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const campaign = await getPublicCampaign(id, 'sw');
  if (!campaign) return { title: 'Kampeni' };
  return {
    title: campaign.name,
    description: campaign.story || undefined,
    openGraph: {
      title: `${campaign.name} | Jukwaa la Changia`,
      description: campaign.story || undefined,
    },
  };
}

export default async function SwahiliCampaignDetailPage({ params }: Params) {
  const { id } = await params;
  const campaign = await getPublicCampaign(id, 'sw');
  if (!campaign) notFound();

  return (
    <>
      <section className="mx-auto flex max-w-[85rem] flex-col px-4 py-10 sm:px-6 lg:px-8 lg:py-14 2xl:max-w-full">
        <div>
          <p className="mb-8 max-w-prose font-light text-pretty text-neutral-700 sm:text-xl dark:text-neutral-300">
            Kampeni ya {campaign.category || 'Jamii'} na {campaign.organizationName || 'shirika la Changia'}
          </p>
        </div>
        <div className="flex flex-col items-center justify-between space-y-4 sm:flex-row sm:space-y-0">
          <div>
            <h1 className="block text-4xl font-bold tracking-tighter text-neutral-800 sm:text-5xl md:text-6xl lg:text-7xl dark:text-neutral-200">
              {campaign.name}
            </h1>
            <p className="text-lg text-neutral-600 dark:text-neutral-400">
              {formatTZS(campaign.raisedAmount)} zimekusanywa kati ya lengo la {formatTZS(campaign.publicTarget)}{' '}
              · {campaign.progressPercent}% imefikiwa
            </p>
          </div>
          <div>
            {campaign.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={campaign.imageUrl}
                alt={campaign.name}
                className="w-[600px] max-w-full rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-[400px] w-[600px] max-w-full items-center justify-center rounded-xl bg-linear-to-br from-emerald-100 to-blue-100 dark:from-emerald-900/40 dark:to-blue-900/40">
                <Icon name="house" className="h-20 w-20 text-emerald-600/50 dark:text-emerald-400/50" />
              </div>
            )}
          </div>
        </div>
      </section>

      <PublicCampaignTabs campaign={campaign} locale="sw" />
    </>
  );
}
