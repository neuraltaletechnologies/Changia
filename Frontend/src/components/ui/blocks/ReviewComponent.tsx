import Avatar from '@/components/ui/avatars/Avatar';
import FullStar, { HalfStar } from '@/components/ui/stars/stars';

type ReviewComponentProps = {
  avatars?: string[];
  starCount?: number;
  rating?: string;
  reviews?: string;
};

export default function ReviewComponent({
  avatars,
  starCount = 0,
  rating,
  reviews,
}: ReviewComponentProps) {
  return (
    <div className="mt-6 lg:mt-10">
      <div className="py-5">
        <div className="text-center sm:flex sm:items-center sm:text-start">
          <div className="shrink-0 pb-5 sm:flex sm:pe-5 sm:pb-0">
            <div className="flex justify-center -space-x-3">
              {avatars?.map((src, i) => (
                <Avatar key={i} src={src} alt="Avatar Description" />
              ))}
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 ring-2 ring-white dark:bg-zinc-900 dark:ring-zinc-800">
                <span className="text-xs leading-none font-medium text-white uppercase">
                  7k+
                </span>
              </span>
            </div>
          </div>
          <div className="mx-auto h-px w-32 border-t border-neutral-400 sm:mx-0 sm:h-8 sm:w-auto sm:border-s sm:border-t-0 dark:border-neutral-500" />
          <div className="flex flex-col items-center sm:items-start">
            <div className="flex items-baseline space-x-1 pt-5 sm:ps-5 sm:pt-0">
              <div className="flex space-x-1">
                {Array(starCount)
                  .fill(0)
                  .map((_, i) => (
                    <FullStar key={i} />
                  ))}
                <HalfStar />
              </div>
              <p
                className="text-neutral-800 dark:text-neutral-200"
                dangerouslySetInnerHTML={{ __html: rating || '' }}
              />
            </div>
            <div className="text-sm text-neutral-800 sm:ps-5 dark:text-neutral-200">
              <p dangerouslySetInnerHTML={{ __html: reviews || '' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
