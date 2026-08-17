import Image from 'next/image';
import Link from 'next/link';
import { formatDate } from '@/utils/utils';
import type { BlogData } from '@/lib/types';

type CardRelatedProps = {
  blogEntry: { id: string; data: BlogData };
  recentBlogLocale?: string;
};

export default function CardRelated({
  blogEntry,
  recentBlogLocale = '',
}: CardRelatedProps) {
  const slug = blogEntry.id.replace(/^(en|sw)\//, '');
  const href =
    recentBlogLocale && recentBlogLocale !== 'en'
      ? `/${recentBlogLocale}/blog/${slug}/`
      : `/blog/${slug}/`;

  return (
    <Link
      className="group block rounded-xl ring-zinc-500 outline-hidden transition duration-300 focus-visible:ring-3 dark:ring-zinc-200 dark:focus:outline-hidden"
      href={href}
    >
      <div>
        <Image
          className="aspect-video rounded-xl object-cover"
          src={blogEntry.data.cardImage}
          alt={blogEntry.data.cardImageAlt}
          width={640}
          height={360}
          draggable={false}
        />
        <h3 className="mt-2 text-lg font-medium text-balance text-neutral-800 group-hover:text-emerald-600 dark:text-neutral-300 dark:group-hover:text-neutral-50">
          {blogEntry.data.title}
        </h3>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          {formatDate(blogEntry.data.pubDate)}
        </p>
      </div>
    </Link>
  );
}
