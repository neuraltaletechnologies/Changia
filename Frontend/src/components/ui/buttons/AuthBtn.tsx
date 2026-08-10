type AuthBtnProps = {
  title: string;
  disabled?: boolean;
};

const baseClasses =
  'inline-flex w-full items-center justify-center gap-x-2 rounded-lg px-4 py-3 text-sm font-bold text-neutral-700 focus-visible:ring-3 outline-hidden transition duration-300';
const borderClasses = 'border border-transparent';
const bgColorClasses = 'bg-yellow-400 dark:focus:outline-hidden';
const hoverClasses = 'hover:bg-yellow-500';
const fontSizeClasses = '2xl:text-base';
const disabledClasses = 'disabled:pointer-events-none disabled:opacity-50';
const ringClasses = 'ring-zinc-500 dark:ring-zinc-200';

export default function AuthBtn({ title, disabled }: AuthBtnProps) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className={`${baseClasses} ${borderClasses} ${bgColorClasses} ${hoverClasses} ${fontSizeClasses} ${disabledClasses} ${ringClasses}`}
    >
      {title}
    </button>
  );
}
