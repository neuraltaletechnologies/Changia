import Image from 'next/image';
import Link from 'next/link';
import Icon from '@/components/ui/icons/Icon';
import type { CampaignData } from '@/lib/types';

type CardWideProps = {
  campaign: { id: string; data: CampaignData };
  campaignLocale?: string;
};

const imageClass =
  'absolute inset-0 h-full w-full object-cover object-center transition duration-[600ms] ease-[cubic-bezier(0.45,0,0.55,1)] group-hover:scale-110';

export default function CardWide({ campaign, campaignLocale = '' }: CardWideProps) {
  const slug = campaign.id.replace(/^(en|sw)\//, '');
  const href =
    campaignLocale && campaignLocale !== 'en'
      ? `/${campaignLocale}/campaigns/${slug}/`
      : `/campaigns/${slug}/`;

  return (
    <Link
      href={href}
      className="group relative flex h-48 items-end overflow-hidden rounded-lg shadow-xl ring-zinc-500 outline-hidden focus-visible:ring-3 md:col-span-2 md:h-80 dark:ring-zinc-200 dark:focus:outline-hidden"
    >
      <Image
        src={campaign.data.main.imgCard}
        alt={campaign.data.main.imgAlt}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 66vw"
        className={imageClass}
        draggable={false}
      />
      <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-neutral-800 via-transparent to-transparent opacity-50" />
      <span className="relative mb-3 ml-4 inline-block text-sm font-bold text-neutral-50 transition duration-[600ms] ease-[cubic-bezier(0.45,0,0.55,1)] group-hover:scale-110 md:ml-5 md:text-lg">
        {campaign.data.description} <Icon name="openInNew" />
      </span>
    </Link>
  );
}
