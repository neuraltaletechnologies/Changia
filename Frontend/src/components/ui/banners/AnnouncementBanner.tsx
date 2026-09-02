'use client';

import { useEffect, useState } from 'react';

type AnnouncementBannerProps = {
  title?: string;
  btnId: string;
  btnTitle: string;
  url: string;
};

export default function AnnouncementBanner({
  title,
  btnId,
  btnTitle,
  url,
}: AnnouncementBannerProps) {
  const storageKey = `changia_banner_dismissed:${btnId}`;
  // Start hidden so the banner never flashes before we've checked the stored
  // dismissal; reveal it on mount only if the visitor hasn't closed it before.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey) !== '1') setVisible(true);
    } catch {
      setVisible(true);
    }
  }, [storageKey]);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(storageKey, '1');
    } catch {
      /* storage unavailable — banner stays dismissed for this session only */
    }
  };

  if (!visible) return null;

  return (
    <div
      className="fixed start-1/2 bottom-0 z-50 mx-auto w-full -translate-x-1/2 transform p-6 sm:max-w-4xl"
      role="region"
      aria-label="Informational Banner"
    >
      <div className="rounded-xl bg-neutral-800 bg-[url('/banner-pattern.svg')] bg-cover bg-center bg-no-repeat p-4 text-center shadow-xs dark:bg-neutral-200">
        <div className="flex items-center justify-center">
          <div className="ml-auto">
            {title ? (
              <p className="me-2 inline-block font-medium text-neutral-50 dark:text-neutral-700">
                {title}
              </p>
            ) : null}
            <a
              className="group inline-flex items-center gap-x-2 rounded-full border-2 border-neutral-50 px-3 py-2 text-sm font-semibold text-neutral-50 backdrop-brightness-75 transition duration-300 hover:border-neutral-100/70 hover:text-neutral-50/70 disabled:pointer-events-none disabled:opacity-50 sm:backdrop-brightness-100 dark:border-neutral-700 dark:text-neutral-700 dark:backdrop-brightness-100 dark:hover:border-neutral-700/70 dark:hover:text-neutral-800/70 dark:focus:outline-hidden"
              href={url}
            >
              {btnTitle}
              <svg
                className="size-4 shrink-0 transition duration-300 group-hover:translate-x-1"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </a>
          </div>
          <button
            type="button"
            className="ml-auto inline-flex items-center gap-x-2 rounded-full border border-transparent bg-gray-100 p-2 text-sm font-semibold text-gray-800 hover:bg-gray-200 disabled:pointer-events-none disabled:opacity-50 dark:bg-neutral-700 dark:text-neutral-50 dark:hover:bg-neutral-700/80 dark:hover:text-neutral-50 dark:focus:outline-hidden"
            id={btnId}
            onClick={dismiss}
          >
            <span className="sr-only">Dismiss</span>
            <svg
              className="size-5 shrink-0"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
