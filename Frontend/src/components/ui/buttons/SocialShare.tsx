'use client';

import { useEffect } from 'react';
import Icon from '../icons/Icon';

type SocialShareProps = {
  pageTitle: string;
  title?: string;
};

type SocialPlatform = {
  name: string;
  url: string;
  svg: string;
};

export default function SocialShare({
  pageTitle,
  title = 'Share',
}: SocialShareProps) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let active = true;
    const load = () => {
      if (!active) return;
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const ClipboardJS = require('clipboard');
      const elements = document.querySelectorAll<HTMLElement>('.js-clipboard');
      elements.forEach((el) => {
        const clipboard = new ClipboardJS(el, {
          text: () => window.location.href,
        });
        clipboard.on('success', () => {
          const defaultEl = el.querySelector<HTMLElement>('.js-clipboard-default');
          const successEl = el.querySelector<HTMLElement>('.js-clipboard-success');
          const successTextEl = el.querySelector<HTMLElement>('.js-clipboard-success-text');
          const successText = el.dataset.clipboardSuccessText || '';
          const oldText = successTextEl?.textContent || '';
          if (successTextEl) successTextEl.textContent = successText;
          if (defaultEl && successEl) {
            defaultEl.style.display = 'none';
            successEl.style.display = 'block';
          }
          setTimeout(() => {
            if (successTextEl) successTextEl.textContent = oldText;
            if (defaultEl && successEl) {
              successEl.style.display = '';
              defaultEl.style.display = '';
            }
          }, 800);
        });
      });
    };

    window.addEventListener('load', load);
    return () => {
      active = false;
      window.removeEventListener('load', load);
    };
  }, []);

  const socialPlatforms: SocialPlatform[] = [
    { name: 'Facebook', url: '#!', svg: 'facebook' },
    { name: 'X', url: '#!', svg: 'x' },
    { name: 'LinkedIn', url: '#!', svg: 'linkedIn' },
  ];

  return (
    <div className="hs-dropdown relative inline-flex [--auto-close:inside] [--placement:top-left]">
      <button
        id="hs-dropup"
        type="button"
        className="hs-dropdown-toggle inline-flex items-center gap-x-2 rounded-lg px-4 py-3 text-sm font-medium text-neutral-600 ring-zinc-500 outline-hidden transition duration-300 hover:bg-neutral-100 hover:text-neutral-700 focus-visible:ring-3 dark:text-neutral-400 dark:ring-zinc-200 dark:hover:bg-neutral-700 dark:hover:text-neutral-300 dark:focus:outline-hidden"
      >
        <Icon name="share" />
        {title}
      </button>

      <div
        className="hs-dropdown-menu duration hs-dropdown-open:opacity-100 z-10 hidden w-72 divide-y divide-neutral-200 rounded-lg bg-neutral-50 p-2 opacity-0 shadow-md transition-[opacity,margin] dark:divide-neutral-700 dark:border dark:border-neutral-700 dark:bg-neutral-800"
        aria-labelledby="hs-dropup"
      >
        <div className="py-2 first:pt-0 last:pb-0">
          {socialPlatforms.map((platform) => (
            <a
              key={platform.name}
              className="flex items-center gap-x-3.5 rounded-lg px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-200 focus:bg-neutral-100 focus:outline-hidden dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:text-neutral-300 dark:focus:bg-neutral-700"
              href={platform.url}
              rel="noopener noreferrer"
              aria-label={`Share on ${platform.name}`}
            >
              <Icon name={platform.svg} />
              Share on {platform.name}
            </a>
          ))}
        </div>
        <div className="py-2 first:pt-0 last:pb-0">
          <button
            type="button"
            className="js-clipboard hover:text-dark focus-visible:ring-secondary group inline-flex w-full items-center gap-x-3.5 rounded-lg px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-200 focus:bg-neutral-100 focus:outline-hidden focus-visible:ring-1 focus-visible:outline-hidden dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:text-neutral-300 dark:focus:bg-neutral-700"
            data-clipboard-success-text="Copied"
          >
            <svg
              className="js-clipboard-default h-4 w-4 transition group-hover:rotate-6"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            </svg>
            <svg
              className="js-clipboard-success hidden h-4 w-4 text-neutral-700 dark:text-neutral-300"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span className="js-clipboard-success-text">Copy link</span>
          </button>
        </div>
      </div>
    </div>
  );
}
