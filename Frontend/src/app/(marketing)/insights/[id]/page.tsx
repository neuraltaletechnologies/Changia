import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import InsightReader from '@components/insights/InsightReader';
import { getInsightEntries } from '@/lib/content';

type Params = { params: Promise<{ id: string }> };

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u00C0-\u00FF]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getToc(body: string): { id: string; text: string }[] {
  const re = /^##\s+(.+)$/gm;
  const out: { id: string; text: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    out.push({ id: slugify(m[1]), text: m[1] });
  }
  return out;
}

export function generateStaticParams() {
  return getInsightEntries('en').map((post) => ({ id: post.slug }));
}

function findInsight(id: string) {
  return getInsightEntries('en').find((p) => p.slug === id);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const post = findInsight(id);
  if (!post) return { title: 'Insights' };
  return {
    title: post.data.title,
    description: post.data.description,
    openGraph: {
      title: `${post.data.title} | Insights | Changia`,
      description: post.data.description,
    },
  };
}

export default async function InsightPostPage({ params }: Params) {
  const { id } = await params;
  const post = findInsight(id);
  if (!post) notFound();
  const toc = getToc(post.body);

  return (
    <section className="py-6 sm:py-8 lg:py-12">
      <div className="mx-auto max-w-(--breakpoint-xl) px-4 md:px-8">
        <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
          <div>
            <div className="h-64 overflow-hidden rounded-lg shadow-lg md:h-auto">
              <Image
                className="h-full w-full object-cover object-center"
                src={post.data.cardImage}
                alt={post.data.cardImageAlt}
                width={1200}
                height={800}
                draggable={false}
              />
            </div>
            <div
              id="progress-mobile"
              className="fixed top-0 left-0 h-2 w-full bg-linear-to-r from-orange-400/30 to-orange-400 md:hidden"
            />
            <div id="pin" className="mt-10 hidden space-y-4 md:block">
              <div className="h-px w-full overflow-hidden bg-neutral-300 dark:bg-neutral-700">
                <div
                  id="progress"
                  className="h-px w-0 bg-linear-to-r from-orange-400/30 to-orange-400"
                />
              </div>
              <p className="text-sm text-pretty text-neutral-500">Table of Contents:</p>
              <div id="toc">
                <ul className="space-y-2 text-base text-pretty text-neutral-700 transition duration-300 dark:text-neutral-400">
                  {toc.map((h) => (
                    <li key={h.id} className="flex gap-2">
                      <a
                        href={`#${h.id}`}
                        className="hover:text-orange-400 dark:hover:text-orange-300"
                      >
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="md:pt-8">
            <h1 className="mb-4 text-center text-2xl font-bold text-balance text-neutral-800 sm:text-3xl md:mb-6 md:text-left dark:text-neutral-200">
              {post.data.title}
            </h1>
            <InsightReader body={post.body} />
          </div>
        </div>
      </div>
    </section>
  );
}

