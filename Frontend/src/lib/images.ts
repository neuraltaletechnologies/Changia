import type { StaticImageData } from 'next/image';

// Author / blog cover images
import jacob from '@/images/blog/jacob.avif';
import anna from '@/images/blog/anna.avif';
import brad from '@/images/blog/brad.avif';
import post1 from '@/images/blog/post-1.avif';
import post2 from '@/images/blog/post-2.avif';
import post3 from '@/images/blog/post-3.avif';

// Insight cover images
import insight1 from '@/images/insights/insight-1.avif';
import insight2 from '@/images/insights/insight-2.avif';
import insight3 from '@/images/insights/insight-3.avif';

// Campaign images
import campaign1 from '@/images/campaign-image-1.avif';
import campaign2 from '@/images/campaign-image-2.avif';
import campaign3 from '@/images/campaign-image-3.avif';
import campaign4 from '@/images/campaign-image-4.avif';
import campaignMain1 from '@/images/campaign-image-main-1.avif';
import campaignMain2 from '@/images/campaign-image-main-2.avif';
import campaignMain3 from '@/images/campaign-image-main-3.avif';
import campaignMain4 from '@/images/campaign-image-main-4.avif';
import blueprint1 from '@/images/blueprint-1.avif';
import blueprint2 from '@/images/blueprint-2.avif';

/**
 * Registry that maps the `@/images/...` string values used inside Markdown
 * frontmatter to their statically imported images so they can be passed to
 * `next/image` and optimized/transformed at build time.
 */
const imageRegistry: Record<string, StaticImageData> = {
  '@/images/blog/jacob.avif': jacob,
  '@/images/blog/anna.avif': anna,
  '@/images/blog/brad.avif': brad,
  '@/images/blog/post-1.avif': post1,
  '@/images/blog/post-2.avif': post2,
  '@/images/blog/post-3.avif': post3,
  '@/images/insights/insight-1.avif': insight1,
  '@/images/insights/insight-2.avif': insight2,
  '@/images/insights/insight-3.avif': insight3,
  '@/images/campaign-image-1.avif': campaign1,
  '@/images/campaign-image-2.avif': campaign2,
  '@/images/campaign-image-3.avif': campaign3,
  '@/images/campaign-image-4.avif': campaign4,
  '@/images/campaign-image-main-1.avif': campaignMain1,
  '@/images/campaign-image-main-2.avif': campaignMain2,
  '@/images/campaign-image-main-3.avif': campaignMain3,
  '@/images/campaign-image-main-4.avif': campaignMain4,
  '@/images/blueprint-1.avif': blueprint1,
  '@/images/blueprint-2.avif': blueprint2,
};

export function resolveImage(value: unknown): StaticImageData | undefined {
  if (!value || typeof value !== 'string') return undefined;
  return imageRegistry[value];
}

export function resolveImageRequired(value: unknown): StaticImageData {
  const img = resolveImage(value);
  if (!img) {
    throw new Error(
      `Image "${String(value)}" was not found in the image registry (src/lib/images.ts).`
    );
  }
  return img;
}

export { imageRegistry };
