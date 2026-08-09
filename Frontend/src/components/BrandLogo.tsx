type BrandLogoProps = React.SVGProps<SVGSVGElement>;

export default function BrandLogo(props: BrandLogoProps) {
  return (
    <svg viewBox="0 0 560 226" fill="none" {...props}>
      <svg
        viewBox="0 0 24 24"
        x="448"
        y="46"
        width="96"
        height="96"
        className="fill-current text-yellow-500 dark:text-yellow-400"
      >
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
      <text
        x="16"
        y="152"
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight="800"
        fontSize="92"
        fill="currentColor"
        className="fill-current text-neutral-800 dark:text-neutral-200"
      >
        Changia
      </text>
      <rect
        x="18"
        y="178"
        width="400"
        height="8"
        rx="4"
        className="fill-current text-yellow-500 dark:text-yellow-400"
        fill="currentColor"
      />
    </svg>
  );
}