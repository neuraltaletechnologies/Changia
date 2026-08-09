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

// Product images
import product1 from '@/images/product-image-1.avif';
import product2 from '@/images/product-image-2.avif';
import product3 from '@/images/product-image-3.avif';
import product4 from '@/images/product-image-4.avif';
import productMain1 from '@/images/product-image-main-1.avif';
import productMain2 from '@/images/product-image-main-2.avif';
import productMain3 from '@/images/product-image-main-3.avif';
import productMain4 from '@/images/product-image-main-4.avif';
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
  '@/images/product-image-1.avif': product1,
  '@/images/product-image-2.avif': product2,
  '@/images/product-image-3.avif': product3,
  '@/images/product-image-4.avif': product4,
  '@/images/product-image-main-1.avif': productMain1,
  '@/images/product-image-main-2.avif': productMain2,
  '@/images/product-image-main-3.avif': productMain3,
  '@/images/product-image-main-4.avif': productMain4,
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
