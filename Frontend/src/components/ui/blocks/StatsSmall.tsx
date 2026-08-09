type StatsSmallProps = {
  title: string;
  subTitle: string;
};

export default function StatsSmall({ title, subTitle }: StatsSmallProps) {
  return (
    <div>
      <p className="text-3xl font-bold text-orange-400 dark:text-orange-300">{title}</p>
      <p className="mt-1 text-neutral-600 dark:text-neutral-400">{subTitle}</p>
    </div>
  );
}
