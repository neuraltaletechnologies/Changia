import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import AvatarBlogLarge from '@components/ui/avatars/AvatarBlogLarge';
import CardRelated from '@components/ui/cards/CardRelated';
import Bookmark from '@components/ui/buttons/Bookmark';
import SocialShare from '@components/ui/buttons/SocialShare';
import PostFeedback from '@components/ui/feedback/PostFeedback';
import { capitalize, formatDate } from '@/utils/utils';
import { getBlogEntries } from '@/lib/content';

type Params = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return getBlogEntries('sw').map((post) => ({ id: post.slug }));
}

function findPost(id: string) {
  return getBlogEntries('sw').find((p) => p.slug === id);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const post = findPost(id);
  if (!post) return { title: 'Blogu' };
  return {
    title: post.data.title,
    description: post.data.contents[0] || `Soma ${post.data.title} kwenye blogu ya Changia`,
    openGraph: {
      title: `${post.data.title} | Blogu | Changia`,
      description: post.data.contents[0],
    },
  };
}

export default async function SwahiliBlogPostPage({ params }: Params) {
  const { id } = await params;
  const post = findPost(id);
  if (!post) notFound();
  const data = post.data;
  const relatedPosts = getBlogEntries('sw').filter((p) => p.id !== post.id);

  return (
    <>
      <section className="mx-auto max-w-3xl px-4 pt-6 pb-12 sm:px-6 lg:px-8 lg:pt-10">
        <div className="max-w-2xl">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex w-full gap-x-5 sm:items-center sm:gap-x-3">
              <AvatarBlogLarge blogEntry={post} />
              <div className="grow">
                <span className="font-bold text-neutral-700 dark:text-neutral-300">
                  {data.author}
                </span>
                <ul className="text-xs text-neutral-500">
                  <li className="relative inline-block pe-6 before:absolute before:end-2 before:top-1/2 before:size-1 before:-translate-y-1/2 before:rounded-full before:bg-neutral-300 last:pe-0 last-of-type:before:hidden dark:text-neutral-400 dark:before:bg-neutral-600">
                    {formatDate(data.pubDate)}
                  </li>
                  <li className="relative inline-block pe-6 before:absolute before:end-2 before:top-1/2 before:size-1 before:-translate-y-1/2 before:rounded-full before:bg-neutral-300 last:pe-0 last-of-type:before:hidden dark:text-neutral-400 dark:before:bg-neutral-600">
                    {data.readTime} dakika za kusoma
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <h2 className="mb-3 text-2xl font-bold text-neutral-800 md:text-3xl dark:text-neutral-200">
            {data.title}
          </h2>

          <div className="mb-5 space-y-5 md:mb-8 md:space-y-8">
            {data.contents.map((content, index) =>
              index === 1 ? (
                <div key={index}>
                  <p className="text-lg text-pretty text-neutral-700 dark:text-neutral-300">
                    {content}
                  </p>
                  <Image
                    className="w-full rounded-xl object-cover"
                    src={data.cardImage}
                    alt={data.cardImageAlt}
                    width={1200}
                    height={800}
                    draggable={false}
                  />
                </div>
              ) : (
                <p key={index} className="text-lg text-pretty text-neutral-700 dark:text-neutral-300">
                  {content}
                </p>
              )
            )}
          </div>

          <div className="mx-auto grid max-w-(--breakpoint-lg) gap-y-5 sm:flex sm:items-center sm:justify-between sm:gap-y-0">
            <div className="flex flex-wrap gap-x-2 gap-y-1 sm:flex-nowrap sm:items-center sm:gap-y-0">
              {data.tags?.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-x-1.5 rounded-lg bg-neutral-400/30 px-3 py-1.5 text-xs font-medium text-neutral-700 outline-hidden focus:outline-hidden focus-visible:ring-3 focus-visible:outline-hidden dark:bg-neutral-700/60 dark:text-neutral-300"
                >
                  {capitalize(tag)}
                </span>
              ))}
            </div>
            <div className="flex items-center justify-end gap-x-1.5">
              <Bookmark />
              <div className="mx-3 block h-4 border-e border-neutral-400 dark:border-neutral-500" />
              <div className="inline-flex">
                <SocialShare pageTitle={data.title} />
              </div>
            </div>
          </div>
        </div>

        <PostFeedback title="Je, makala hii ilikuwa muhimu?" firstChoice="Ndiyo" secondChoice="Hapana" />
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="mb-10 max-w-2xl">
          <h2 className="text-2xl font-bold text-balance text-neutral-800 md:text-4xl md:leading-tight dark:text-neutral-200">
            Makala zinazohusiana
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-6">
          {relatedPosts.map((entry) => (
            <CardRelated key={entry.id} blogEntry={entry} recentBlogLocale="sw" />
          ))}
        </div>
      </section>
    </>
  );
}
