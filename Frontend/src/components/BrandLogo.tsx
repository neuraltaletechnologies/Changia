type BrandLogoProps = React.SVGProps<SVGSVGElement>;

export default function BrandLogo(props: BrandLogoProps) {
  return (
    <svg viewBox="0 0 521 226" fill="none" {...props}>
      <rect
        width="78.937"
        height="18.485"
        x="269"
        y="154.911"
        className="fill-current text-yellow-500 dark:text-yellow-400"
        fill="currentColor"
        rx="9.242"
        transform="rotate(-43.075 269 154.911)"
      />
      <rect
        width="78.937"
        height="18.485"
        x="319"
        y="154.911"
        className="fill-current text-yellow-500 dark:text-yellow-400"
        fill="currentColor"
        rx="9.242"
        transform="rotate(-43.075 319 154.911)"
      />
      <rect
        width="78.937"
        height="18.485"
        x="369.285"
        y="154.911"
        className="fill-current text-yellow-500 dark:text-yellow-400"
        fill="currentColor"
        rx="9.242"
        transform="rotate(-43.075 369.285 154.911)"
      />
      <rect
        width="28.464"
        height="18.485"
        x="419.57"
        y="154.911"
        className="fill-current text-yellow-500 dark:text-yellow-400"
        fill="currentColor"
        rx="9.242"
        transform="rotate(-43.075 419.57 154.911)"
      />
      <path
        className="fill-current text-yellow-500 dark:text-yellow-400"
        fill="currentColor"
        d="M499.804 128.068c7.03 2.636 6.885 12.63-.219 15.061l-18.951 6.483c-5.238 1.792-10.669-2.15-10.589-7.686l.196-13.514c.081-5.535 5.624-9.318 10.808-7.374l18.755 7.03Z"
      />
      <text
        x="25"
        y="170"
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight="800"
        fontSize="120"
        fill="currentColor"
        className="fill-current text-neutral-800 dark:text-neutral-200"
      >
        ScrewFast
      </text>
    </svg>
  );
}
