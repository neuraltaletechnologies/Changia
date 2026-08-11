import type { Metadata } from 'next';
import CardBlog from '@components/ui/cards/CardBlog';
import CardBlogRecent from '@components/ui/cards/CardBlogRecent';
import CardInsight from '@components/ui/cards/CardInsight';
import { getBlogEntries, getInsightEntries } from '@/lib/content';

export const metadata: Metadata = {
  title: 'Blogu',
  description:
    'Endelea kufahamu mienendo na maendeleo ya hivi karibuni ya ukusanyaji fedha wa kidijitali na mchango wa All money transfer, pamoja na uchambuzi wa timu ya Changia.',
  openGraph: {
    title: 'Blogu ya ukusanyaji fedha wa kidijitali | Changia',
    description:
      'Endelea kufahamu mienendo na maendeleo ya hivi karibuni ya ukusanyaji fedha wa kidijitali na mchango wa All money transfer, pamoja na uchambuzi wa timu ya Changia.',
  },
};

const title = "Hadithi za Changia na jamii ya ukusanyaji fedha";
const subTitle =
  "Chunguza habari, vidokezo na uchambuzi wa hivi karibuni kutoka timu ya Changia. Kutoka kusanidi kampeni hadi safari za wafadhili za All money transfer, blogu yetu inakusaidia kubadilisha nia njema kuwa malipo yaliyofanyika.";
const secondTitle = 'Uchambuzi';
const secondSubTitle =
  'Usomaji wa kina kuhusu ukusanyaji fedha wa kidijitali, imani ya wafadhili na mchango wa All money transfer wenye uwazi nchini Tanzania.';

export default function SwahiliBlogIndexPage() {
  const blogPosts = getBlogEntries('sw').sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
  );
  const insightPosts = getInsightEntries('sw');
  const mostRecentPost = blogPosts[0];
  const otherPosts = blogPosts.slice(1);

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
            <CardBlog key={blogEntry.id} blogEntry={blogEntry} blogLocale="sw" />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14 2xl:max-w-full">
        {mostRecentPost ? <CardBlogRecent blogEntry={mostRecentPost} recentBlogLocale="sw" /> : null}
      </section>

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
            <CardInsight
              key={insightEntry.id}
              insightEntry={insightEntry}
              insightLocale="sw"
              label="Soma zaidi"
            />
          ))}
        </div>
      </section>
    </>
  );
}
