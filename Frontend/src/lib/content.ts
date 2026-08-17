import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import type { StaticImageData } from 'next/image';
import { resolveImage, resolveImageRequired } from './images';
import type { BlogData, CampaignData, InsightData } from './types';

const CONTENT_ROOT = path.join(process.cwd(), 'src', 'content');

export type CollectionName = 'blog' | 'campaigns' | 'insights';

/**
 * Maps a logical collection name to the on-disk sub-directory under
 * `src/content`. Campaign content currently lives in the `products` folder
 * (a legacy name), so the `campaigns` collection is backed by `products`.
 */
const COLLECTION_DIRS: Record<CollectionName, string> = {
  blog: 'blog',
  campaigns: 'products',
  insights: 'insights',
};

export interface ContentEntry<T = Record<string, unknown>> {
  /** Relative id, e.g. "en/post-1" (matching the old Astro collection id). */
  id: string;
  /** Language prefix, e.g. "en" or "sw". */
  lang: string;
  /** Slug without the language prefix, e.g. "post-1". */
  slug: string;
  data: T;
  body: string;
}

function listMarkdownFiles(collectionsDir: string): string[] {
  if (!existsSync(collectionsDir)) return [];
  const results: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(md|mdx)$/.test(entry.name)) results.push(full);
    }
  };
  walk(collectionsDir);
  return results;
}

function toPosix(p: string): string {
  return p.split(path.sep).join('/');
}

export function getCollection<T = Record<string, unknown>>(
  name: CollectionName
): ContentEntry<T>[] {
  const dir = path.join(CONTENT_ROOT, COLLECTION_DIRS[name]);
  return listMarkdownFiles(dir).map((file) => {
    const raw = readFileSync(file, 'utf-8');
    const { data, content } = matter(raw);
    const rel = toPosix(path.relative(dir, file)).replace(/\.(md|mdx)$/, '');
    const parts = rel.split('/');
    const lang = parts[0];
    const slug = parts.slice(1).join('/');
    return { id: rel, lang, slug, data: data as T, body: content };
  });
}

/** Resolve a frontmatter image string into an optimizable StaticImageData. */
export function resolve(img: unknown): StaticImageData | undefined {
  return resolveImage(img);
}

function resolveBlog(entry: ContentEntry): ContentEntry<BlogData> {
  return {
    ...entry,
    data: {
      title: entry.data.title as string,
      description: entry.data.description as string,
      contents: (entry.data.contents as string[]) ?? [],
      author: entry.data.author as string,
      role: entry.data.role as string | undefined,
      authorImage: resolveImageRequired(entry.data.authorImage),
      authorImageAlt: entry.data.authorImageAlt as string,
      pubDate: entry.data.pubDate as Date,
      cardImage: resolveImageRequired(entry.data.cardImage),
      cardImageAlt: entry.data.cardImageAlt as string,
      readTime: entry.data.readTime as number,
      tags: (entry.data.tags as string[]) ?? [],
    },
  };
}

function resolveCampaign(entry: ContentEntry): ContentEntry<CampaignData> {
  const main = entry.data.main as Record<string, unknown>;
  return {
    ...entry,
    data: {
      title: entry.data.title as string,
      description: entry.data.description as string,
      main: {
        id: main.id as number,
        content: main.content as string,
        imgCard: resolveImageRequired(main.imgCard),
        imgMain: resolveImageRequired(main.imgMain),
        imgAlt: main.imgAlt as string,
      },
      tabs: (main ? entry.data.tabs : []) as CampaignData['tabs'],
      longDescription: entry.data.longDescription as CampaignData['longDescription'],
      descriptionList: (entry.data.descriptionList ?? []) as CampaignData['descriptionList'],
      specificationsLeft: (entry.data.specificationsLeft ??
        []) as CampaignData['specificationsLeft'],
      specificationsRight: (entry.data.specificationsRight ??
        []) as CampaignData['specificationsRight'],
      tableData: entry.data.tableData as CampaignData['tableData'],
      blueprints: {
        first: resolveImage(
          (entry.data.blueprints as Record<string, unknown> | undefined)?.['first']
        ),
        second: resolveImage(
          (entry.data.blueprints as Record<string, unknown> | undefined)?.['second']
        ),
      },
    },
  };
}

function resolveInsight(entry: ContentEntry): ContentEntry<InsightData> {
  return {
    ...entry,
    data: {
      title: entry.data.title as string,
      description: entry.data.description as string,
      cardImage: resolveImageRequired(entry.data.cardImage),
      cardImageAlt: entry.data.cardImageAlt as string,
    },
  };
}

export function getBlogEntries(lang?: 'en' | 'sw'): ContentEntry<BlogData>[] {
  return getCollection('blog')
    .filter((e) => (lang ? e.lang === lang : true))
    .map(resolveBlog);
}

export function getCampaignEntries(lang?: 'en' | 'sw'): ContentEntry<CampaignData>[] {
  return getCollection('campaigns')
    .filter((e) => (lang ? e.lang === lang : true))
    .map(resolveCampaign);
}

export function getInsightEntries(lang?: 'en' | 'sw'): ContentEntry<InsightData>[] {
  return getCollection('insights')
    .filter((e) => (lang ? e.lang === lang : true))
    .map(resolveInsight);
}

