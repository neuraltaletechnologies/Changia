import Image from 'next/image';
import Link from 'next/link';
import AvatarBlogLarge from '@/components/ui/avatars/AvatarBlogLarge';
import PrimaryCTA from '@/components/ui/buttons/PrimaryCTA';
import type { BlogData } from '@/lib/types';

type CardBlogRecentProps = {
  blogEntry: { id: string; data: BlogData };
  recentBlogLocale?: string;
};

export default function CardBlogRecent({
  blogEntry,
  recentBlogLocale = '',
}: CardBlogRecentProps) {
  const slug = blogEntry.id.replace(/^(en|fr)\//, '');
  const href =
    recentBlogLocale && recentBlogLocale !== 'en'
      ? `/${recentBlogLocale}/blog/${slug}/`
      : `/blog/${slug}/`;

  return (
    <div className="grid gap-8 sm:grid-cols-2 sm:items-center">
      <div className="sm:order-2">
        <div className="relative rounded-lg pt-[50%] sm:pt-[100%]">
          <Image
            className="absolute start-0 top-0 size-full rounded-xl object-cover"
            src={blogEntry.data.cardImage}
            alt={blogEntry.data.cardImageAlt}
            fill
            sizes="(max-width: 640px) 100vw, 50vw"
            draggable={false}
          />
        </div>
      </div>
      <div className="sm:order-1">
        <h2 className="text-2xl font-bold tracking-tight text-balance text-neutral-800 md:text-3xl lg:text-4xl lg:leading-tight xl:text-5xl xl:leading-tight dark:text-neutral-200">
          <Link
            className="ring-zinc-500 outline-hidden transition duration-300 hover:text-orange-400 focus-visible:ring-3 dark:text-neutral-300 dark:ring-zinc-200 dark:hover:text-neutral-50 dark:focus:outline-hidden"
            href={href}
          >
            {blogEntry.data.description}
          </Link>
        </h2>
        <div className="mt-6 flex items-center sm:mt-10">
          <AvatarBlogLarge blogEntry={blogEntry} />
          <div className="ms-3 sm:ms-4">
            <p className="font-bold text-neutral-800 sm:mb-1 dark:text-neutral-200">
              {blogEntry.data.author}
            </p>
            <p className="text-xs text-neutral-500">{blogEntry.data.role}</p>
          </div>
        </div>
        <div className="mt-5">
          <PrimaryCTA url={href} title="Read More" />
        </div>
      </div>
    </div>
  );
}
