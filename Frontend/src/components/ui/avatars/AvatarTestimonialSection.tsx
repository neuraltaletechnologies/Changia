type AvatarTestimonialSectionProps = {
  /** Portrait URL. When empty, an initials bubble (from `alt`) is shown instead. */
  src?: string | null;
  alt: string;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function AvatarTestimonialSection({
  src,
  alt,
}: AvatarTestimonialSectionProps) {
  return (
    <div className="shrink-0">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="size-8 rounded-full object-cover sm:h-[2.875rem] sm:w-[2.875rem]"
          src={src}
          alt={alt}
          loading="lazy"
        />
      ) : (
        <span
          aria-label={alt}
          className="flex size-8 items-center justify-center rounded-full bg-neutral-300 text-xs font-semibold text-neutral-700 sm:h-[2.875rem] sm:w-[2.875rem] sm:text-sm dark:bg-neutral-600 dark:text-neutral-100"
        >
          {initials(alt)}
        </span>
      )}
    </div>
  );
}
