import Image from 'next/image';
import Link from 'next/link';
import Icon from '@/components/ui/icons/Icon';
import type { InsightData } from '@/lib/types';

type CardInsightProps = {
  insightEntry: { id: string; data: InsightData };
  insightLocale?: string;
  label?: string;
};

export default function CardInsight({
  insightEntry,
  insightLocale,
  label = 'Read more',
}: CardInsightProps) {
  const slug = insightEntry.id.replace(/^(en|sw)\//, '');
  const href =
    insightLocale && insightLocale !== 'en'
      ? `/${insightLocale}/insights/${slug}/`
      : `/insights/${slug}/`;

  return (
    <Link
      className="group rounded-xl ring-zinc-500 outline-hidden transition duration-300 focus-visible:ring-3 dark:ring-zinc-200 dark:focus:outline-hidden"
      href={href}
    >
      <div className="relative overflow-hidden rounded-xl pt-[50%] sm:pt-[70%]">
        <Image
          className="absolute start-0 top-0 size-full rounded-xl object-cover transition duration-500 ease-in-out group-hover:scale-105"
          src={insightEntry.data.cardImage}
          alt={insightEntry.data.cardImageAlt}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          draggable={false}
        />
      </div>
      <div className="mt-7">
        <h3 className="text-xl font-bold text-neutral-800 group-hover:text-neutral-600 dark:text-neutral-200 dark:group-hover:text-neutral-400">
          {insightEntry.data.title}
        </h3>
        <p className="mt-3 text-neutral-600 dark:text-neutral-400">
          {insightEntry.data.description}
        </p>
        <p className="mt-5 inline-flex items-center gap-x-1 font-medium text-emerald-600 decoration-2 group-hover:underline dark:text-emerald-400">
          {label}
          <Icon name="arrowRightStatic" />
        </p>
      </div>
    </Link>
  );
}
