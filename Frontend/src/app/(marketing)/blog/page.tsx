import type { Metadata } from 'next';
import CardBlog from '@components/ui/cards/CardBlog';
import CardBlogRecent from '@components/ui/cards/CardBlogRecent';
import CardInsight from '@components/ui/cards/CardInsight';
import CardImpactStory from '@components/ui/cards/CardImpactStory';
import { getBlogEntries, getInsightEntries } from '@/lib/content';
import { getCompletedCampaigns } from '@/lib/public-campaigns';

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Stay up-to-date with the latest trends and developments in digital fundraising and mobile-money giving, with insights from the Changia user.',
  openGraph: {
    title: 'Digital Fundraising Blog | Changia',
    description:
      'Stay up-to-date with the latest trends and developments in digital fundraising and mobile-money giving, with insights from the Changia user.',
  },
};

const title = 'Stories from Changia & the Fundraising Community';
const subTitle =
  'Explore the latest news, tips and insights from the Changia user. From Campaign  setup to mobile-money donor journeys, our blog helps you turn good intentions into completed payments.';
const secondTitle = 'Insights';
const secondSubTitle =
  'Long reads on digital fundraising, donor trust and transparent mobile-money giving in Tanzania.';

export default async function BlogIndexPage() {
  const blogPosts = getBlogEntries('en').sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
  );
  const insightPosts = getInsightEntries('en');
  const mostRecentPost = blogPosts[0];
  const otherPosts = blogPosts.slice(1);
  const impactStories = await getCompletedCampaigns('en');

  return (
    <>
      <section className="mx-auto max-w-[85rem] space-y-8 px-4 pt-16 sm:px-6 lg:px-8 2xl:max-w-full">
        <div className="mx-auto max-w-3xl text-left sm:text-center">
          <h1 className="block text-4xl font-bold tracking-tight text-balance text-neutral-800 md:text-5xl lg:text-6xl dark:text-neutral-200">
            {title}
          </h1>
          <p className="mt-4 text-lg text-pretty text-neutral-600 dark:text-neutral-400">
            {subTitle}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14 2xl:max-w-full">
        <div className="grid gap-6 lg:grid-cols-2">
          {otherPosts.map((blogEntry) => (
            <CardBlog key={blogEntry.id} blogEntry={blogEntry} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14 2xl:max-w-full">
        {mostRecentPost ? (
          <CardBlogRecent blogEntry={mostRecentPost} />
        ) : null}
      </section>

      {impactStories.length > 0 && (
        <section className="mx-auto max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14 2xl:max-w-full">
          <div className="mx-auto mb-10 max-w-2xl text-center lg:mb-14">
            <h2 className="text-2xl font-bold text-neutral-800 md:text-4xl md:leading-tight dark:text-neutral-200">
              Impact Stories
            </h2>
            <p className="mt-1 text-pretty text-neutral-600 dark:text-neutral-400">
              Completed campaigns, with proof of exactly how every shilling was used.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {impactStories.map((story) => (
              <CardImpactStory key={story.id} story={story} />
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14 2xl:max-w-full">
        <div className="mx-auto mb-10 max-w-2xl text-center lg:mb-14">
          <h2 className="text-2xl font-bold text-neutral-800 md:text-4xl md:leading-tight dark:text-neutral-200">
            {secondTitle}
          </h2>
          <p className="mt-1 text-pretty text-neutral-600 dark:text-neutral-400">
            {secondSubTitle}
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {insightPosts.map((insightEntry) => (
            <CardInsight key={insightEntry.id} insightEntry={insightEntry} />
          ))}
        </div>
      </section>
    </>
  );
}