import Icon from '../icons/Icon';

type GithubBtnProps = {
  title?: string;
  url?: string;
};

const baseClasses =
  'group inline-flex items-center justify-center gap-x-3 rounded-lg px-4 py-3 text-center text-sm font-medium text-neutral-50 ring-zinc-500 focus-visible:ring-3 transition duration-300 outline-hidden';
const borderClasses = 'border border-transparent';
const bgColorClasses = 'bg-emerald-600 dark:focus:outline-hidden';
const hoverClasses = 'hover:shadow-2xl hover:shadow-emerald-500';
const fontSizeClasses = '2xl:text-base';
const ringClasses = 'dark:ring-zinc-200';

export default function GithubBtn({ title, url = '#' }: GithubBtnProps) {
  return (
    <a
      className={`${baseClasses} ${borderClasses} ${bgColorClasses} ${hoverClasses} ${fontSizeClasses} ${ringClasses}`}
      href={url}
      rel="noopener noreferrer"
    >
      <Icon name="github" />
      {title}
    </a>
  );
}
