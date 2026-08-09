import Image from 'next/image';
import Link from 'next/link';
import AvatarBlog from '@/components/ui/avatars/AvatarBlog';
import { formatDate } from '@/utils/utils';
import type { BlogData } from '@/lib/types';

type CardBlogProps = {
  blogEntry: { id: string; data: BlogData };
  blogLocale?: string;
};

export default function CardBlog({ blogEntry, blogLocale = '' }: CardBlogProps) {
  const slug = blogEntry.id.replace(/^(en|fr)\//, '');
  const href = blogLocale && blogLocale !== 'en' ? `/${blogLocale}/blog/${slug}/` : `/blog/${slug}/`;

  return (
    <Link
      className="group relative block overflow-hidden rounded-xl ring-zinc-500 outline-hidden transition duration-500 focus-visible:ring-3 dark:ring-zinc-200 dark:focus:outline-hidden"
      href={href}
    >
      <div className="relative h-[350px] w-full shrink-0 overflow-hidden rounded-xl before:absolute before:inset-x-0 before:z-1 before:size-full before:bg-linear-to-t before:from-neutral-900/[.7]">
        <Image
          className="absolute start-0 top-0 size-full object-cover transition duration-500 group-hover:scale-110"
          src={blogEntry.data.cardImage}
          alt={blogEntry.data.cardImageAlt}
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          draggable={false}
        />
      </div>

      <div className="absolute inset-x-0 top-0 z-10">
        <div className="flex h-full flex-col p-4 sm:p-6">
          <div className="flex items-center">
            <AvatarBlog blogEntry={blogEntry} />
            <div className="ms-2.5 sm:ms-4">
              <h4 className="font-bold text-neutral-50">{blogEntry.data.author}</h4>
              <p className="text-xs text-neutral-50/[.8]">
                {formatDate(blogEntry.data.pubDate)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10">
        <div className="flex h-full flex-col p-4 sm:p-6">
          <h3 className="text-lg font-bold text-balance text-neutral-50 group-hover:text-neutral-50/[.8] sm:text-3xl">
            {blogEntry.data.title}
          </h3>
          <p className="mt-2 text-pretty text-neutral-50/[.8]">
            {blogEntry.data.description}
          </p>
        </div>
      </div>
    </Link>
  );
}
