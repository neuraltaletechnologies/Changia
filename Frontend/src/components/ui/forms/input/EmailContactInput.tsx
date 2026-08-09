type EmailContactInputProps = {
  label?: string;
  id: string;
};

export default function EmailContactInput({
  label = 'Email',
  id,
}: EmailContactInputProps) {
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        type="email"
        name="hs-email-contacts"
        id={id}
        autoComplete="email"
        placeholder="Email"
        className="block w-full rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700 placeholder:text-neutral-500 focus:border-neutral-200 focus:ring-3 focus:ring-neutral-400 focus:outline-hidden disabled:pointer-events-none disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-700/30 dark:text-neutral-300 dark:placeholder:text-neutral-400 dark:focus:ring-1"
      />
    </div>
  );
}
