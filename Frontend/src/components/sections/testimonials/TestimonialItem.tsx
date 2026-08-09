import Image from 'next/image';
import Icon from '@/components/ui/icons/Icon';

type TestimonialItemProps = {
  content: string;
  author: string;
  role: string;
  avatarSrc: string;
};

export default function TestimonialItem({
  content,
  author,
  role,
  avatarSrc,
}: TestimonialItemProps) {
  return (
    <blockquote className="relative">
      <Icon name="quotation" />
      <div className="relative z-10">
        <p className="text-xl text-neutral-800 italic dark:text-neutral-200">{content}</p>
      </div>
      <div className="mt-6">
        <div className="flex items-center">
          <div className="shrink-0">
            <Image
              className="h-8 w-8 rounded-full object-cover"
              src={avatarSrc}
              alt="Avatar Description"
              width={32}
              height={32}
              loading="eager"
            />
          </div>
          <div className="ms-4 grow">
            <div className="font-bold text-neutral-800 dark:text-neutral-200">{author}</div>
            <div className="text-xs text-neutral-500">{role}</div>
          </div>
        </div>
      </div>
    </blockquote>
  );
}
