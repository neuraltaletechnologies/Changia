import Image from 'next/image';
import type { BlogData } from '@/lib/types';

type AvatarBlogProps = {
  blogEntry: { data: BlogData };
};

export default function AvatarBlog({ blogEntry }: AvatarBlogProps) {
  return (
    <div className="shrink-0">
      <Image
        className="size-[46px] rounded-full border-2 border-neutral-50"
        src={blogEntry.data.authorImage}
        alt={blogEntry.data.authorImageAlt}
        width={46}
        height={46}
        draggable={false}
      />
    </div>
  );
}
