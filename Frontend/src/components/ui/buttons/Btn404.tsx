import Icon from '../icons/Icon';

type Btn404Props = {
  title?: string;
  id?: string;
  noArrow?: boolean;
};

const baseClasses =
  'group inline-flex items-center justify-center gap-x-2 rounded-lg px-4 py-3 text-sm font-bold text-neutral-50 ring-zinc-500 transition duration-300 focus-visible:ring-3 outline-hidden';
const borderClasses = 'border border-transparent';
const bgColorClasses =
  'bg-orange-400 hover:bg-orange-500 active:bg-orange-500 dark:focus:outline-hidden';
const disableClasses = 'disabled:pointer-events-none disabled:opacity-50';
const fontSizeClasses = '2xl:text-base';
const ringClasses = 'dark:ring-zinc-200';

export default function Btn404({ title, id, noArrow }: Btn404Props) {
  return (
    <button
      className={`${baseClasses} ${borderClasses} ${bgColorClasses} ${disableClasses} ${fontSizeClasses} ${ringClasses}`}
      id={id}
    >
      {title}
      {noArrow ? null : <Icon name="arrowRight" />}
    </button>
  );
}

