import Image from 'next/image';
import type { StaticImageData } from 'next/image';

type TabContentProps = {
  id: string;
  aria: string;
  src?: StaticImageData | string;
  alt: string;
  first?: boolean;
  second?: boolean;
};

export default function TabContent({
  id,
  aria,
  src,
  alt,
  first,
  second,
}: TabContentProps) {
  const firstClass = first ? '' : 'hidden';
  const secondClass = second
    ? 'shadow-xl aspect-video object-contain bg-neutral-300 dark:bg-neutral-600 p-3 lg:object-cover lg:aspect-square shadow-neutral-200 rounded-xl dark:shadow-neutral-900/[.2]'
    : 'shadow-xl aspect-video object-cover lg:aspect-square shadow-neutral-200 rounded-xl dark:shadow-neutral-900/[.2]';

  if (!src) return null;

  return (
    <div id={id} role="tabpanel" className={firstClass} aria-labelledby={aria}>
      <Image
        src={src}
        alt={alt}
        className={secondClass}
        width={1200}
        height={900}
        draggable={false}
        loading="eager"
      />
    </div>
  );
}
