type LoginBtnProps = {
  title?: string;
};

const baseClasses =
  'flex items-center gap-x-2 text-base md:text-sm font-medium text-neutral-600 ring-zinc-500 transition duration-300 focus-visible:ring-3 outline-hidden';
const hoverClasses = 'hover:text-blue-600 dark:hover:text-blue-400';
const darkClasses =
  'dark:border-neutral-700 dark:text-neutral-400 dark:ring-zinc-200 dark:focus:outline-hidden';
const mdClasses = 'md:my-6 md:border-s md:border-neutral-300 md:ps-6';
const txtSizeClasses = '2xl:text-base';

export default function LoginBtn({ title = 'Log in' }: LoginBtnProps) {
  return (
    <button
      type="button"
      data-hs-overlay="#hs-toggle-between-modals-login-modal"
      aria-haspopup="dialog"
      className={`${baseClasses} ${hoverClasses} ${darkClasses} ${mdClasses} ${txtSizeClasses}`}
    >
      <svg
        className="h-4 w-4 shrink-0"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
      {title}
    </button>
  );
}
