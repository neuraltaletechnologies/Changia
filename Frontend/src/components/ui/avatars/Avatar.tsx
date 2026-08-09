import Image from 'next/image';

type AvatarProps = {
  src: string;
  alt: string;
};

export default function Avatar({ src, alt }: AvatarProps) {
  return (
    <Image
      className="inline-block h-8 w-8 rounded-full object-cover ring-2 ring-neutral-50 dark:ring-zinc-800"
      src={src}
      alt={alt}
      width={32}
      height={32}
      loading="eager"
    />
  );
}
