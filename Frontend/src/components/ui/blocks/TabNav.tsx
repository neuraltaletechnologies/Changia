type TabNavProps = {
  dataTab: string;
  id: string;
  aria: string;
  heading?: string;
  content?: string;
  first?: boolean;
  children?: React.ReactNode;
};

const BUTTON_CLASS =
  'dark:hover:bg-neutral-700 rounded-xl p-4 text-start outline-hidden ring-zinc-500 transition duration-300 hover:bg-neutral-200 focus-visible:ring-3 hs-tab-active:bg-neutral-50 hs-tab-active:shadow-md hs-tab-active:hover:border-transparent dark:ring-zinc-200 dark:focus:outline-hidden  dark:hs-tab-active:bg-neutral-700/60 md:p-5';

export default function TabNav({
  dataTab,
  id,
  aria,
  heading,
  content,
  first,
  children,
}: TabNavProps) {
  return (
    <button
      type="button"
      className={`${first ? 'active ' : ''}${BUTTON_CLASS}`}
      id={id}
      data-hs-tab={dataTab}
      aria-controls={aria}
      aria-selected={first ? 'true' : 'false'}
      role="tab"
    >
      <span className="flex">
        {children}
        <span className="ms-6 grow">
          <span className="hs-tab-active:text-orange-400 dark:hs-tab-active:text-orange-300 block text-lg font-bold text-neutral-800 dark:text-neutral-200">
            {heading}
          </span>
          <span className="hs-tab-active:text-neutral-600 dark:hs-tab-active:text-neutral-200 mt-1 block text-neutral-500 dark:text-neutral-400">
            {content}
          </span>
        </span>
      </span>
    </button>
  );
}
