import Image from 'next/image';
import type { BlogData } from '@/lib/types';

type AvatarBlogLargeProps = {
  blogEntry: { data: BlogData };
};

export default function AvatarBlogLarge({ blogEntry }: AvatarBlogLargeProps) {
  return (
    <div className="shrink-0">
      <Image
        className="size-10 rounded-full sm:h-14 sm:w-14"
        src={blogEntry.data.authorImage}
        alt={blogEntry.data.authorImageAlt}
        width={56}
        height={56}
        draggable={false}
      />
    </div>
  );
}
