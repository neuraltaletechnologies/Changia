import Icon from '@/components/ui/icons/Icon';

type StatsGridProps = {
  count: string;
  description: string;
  index: number;
};

export default function StatsGrid({ count, description, index }: StatsGridProps) {
  return (
    <li className="-m-0.5 flex flex-col p-4 sm:p-8">
      <div className="mb-2 flex items-end gap-x-2 text-3xl font-bold text-neutral-800 sm:text-5xl dark:text-neutral-200">
        {index === 1 || index === 2 ? <Icon name="arrowUp" /> : null}
        {count}
      </div>
      <p className="text-sm text-neutral-600 sm:text-base dark:text-neutral-400">
        {description}
      </p>
    </li>
  );
}
