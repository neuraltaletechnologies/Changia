type EmailFooterInputProps = {
  label?: string;
  title?: string;
  id?: string;
};

export default function EmailFooterInput({
  label = 'Search',
  title = 'Subscribe',
  id = 'footer-input',
}: EmailFooterInputProps) {
  return (
    <div className="mt-4 flex flex-col items-center gap-2 rounded-lg bg-neutral-200 p-2 sm:flex-row sm:gap-3 dark:bg-neutral-800">
      <div className="w-full">
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
        <input
          type="text"
          id={id}
          name="footer-input"
          placeholder="Enter your email"
          className="block w-full rounded-lg border-transparent bg-neutral-100 px-4 py-3 text-sm text-neutral-600 caret-orange-400 focus:border-orange-400 focus:ring-orange-400 disabled:pointer-events-none disabled:opacity-50 dark:border-transparent dark:bg-neutral-700 dark:text-gray-300 dark:placeholder:text-neutral-300"
        />
      </div>
      <a
        className="inline-flex w-full items-center justify-center gap-x-2 rounded-lg border border-transparent bg-orange-400 p-3 text-sm font-bold whitespace-nowrap text-neutral-50 ring-zinc-500 outline-hidden transition duration-300 hover:bg-orange-500 focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-50 sm:w-auto dark:ring-zinc-200 dark:focus:ring-1 dark:focus:outline-hidden"
        href="#"
      >
        {title}
      </a>
    </div>
  );
}
