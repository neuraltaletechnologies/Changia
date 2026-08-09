type FooterSocialLinkProps = {
  url: string;
  children: React.ReactNode;
};

const linkClass =
  'inline-flex h-10 w-10 items-center justify-center gap-x-2 rounded-lg border border-transparent text-sm font-bold text-neutral-700 outline-hidden ring-zinc-500 hover:bg-neutral-500/10 focus:outline-hidden focus-visible:ring-3 focus-visible:ring-zinc-500 dark:ring-zinc-200 dark:hover:bg-neutral-50/10';

export default function FooterSocialLink({
  url,
  children,
}: FooterSocialLinkProps) {
  return (
    <a className={linkClass} href={url} rel="noopener noreferrer">
      {children}
    </a>
  );
}
