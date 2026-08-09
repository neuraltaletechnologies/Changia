type ContactIconBlockProps = {
  heading?: string;
  content?: string;
  isAddressVisible?: boolean;
  addressContent?: string;
  isLinkVisible?: boolean;
  linkTitle?: string;
  linkURL?: string;
  isArrowVisible?: boolean;
  children?: React.ReactNode;
};

const arrowSVG =
  '<svg class="h-4 w-4 shrink-0 transition ease-in-out group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>';

export default function ContactIconBlock({
  heading,
  content,
  isAddressVisible,
  addressContent,
  isLinkVisible,
  linkTitle,
  linkURL = '#',
  isArrowVisible,
  children,
}: ContactIconBlockProps) {
  return (
    <div className="flex gap-x-7 py-6">
      {children}
      <div className="grow">
        <h3 className="font-bold text-neutral-700 dark:text-neutral-300">{heading}</h3>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{content}</p>
        {isAddressVisible ? (
          <p className="mt-1 text-sm text-neutral-500 italic">{addressContent}</p>
        ) : null}
        {isLinkVisible ? (
          <a
            className="group mt-2 inline-flex items-center gap-x-2 rounded-lg text-sm font-medium text-zinc-600 ring-zinc-500 outline-hidden transition duration-300 hover:text-zinc-800 focus-visible:ring-3 dark:text-zinc-400 dark:ring-zinc-200 dark:hover:text-zinc-200 dark:focus:ring-1 dark:focus:outline-hidden"
            href={linkURL}
          >
            {linkTitle}
            {isArrowVisible ? (
              <span dangerouslySetInnerHTML={{ __html: arrowSVG }} />
            ) : null}
          </a>
        ) : null}
      </div>
    </div>
  );
}
