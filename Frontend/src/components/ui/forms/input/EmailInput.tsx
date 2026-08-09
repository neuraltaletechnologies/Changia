type EmailInputProps = {
  label?: string;
  id: string;
  errorId: string;
};

export default function EmailInput({
  label = 'Email address',
  id,
  errorId,
}: EmailInputProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm text-neutral-800 dark:text-neutral-200">
        {label}
      </label>
      <div className="relative">
        <input
          type="email"
          id={id}
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          className="block w-full rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700 focus:border-neutral-200 focus:ring-3 focus:ring-neutral-400 focus:outline-hidden disabled:pointer-events-none disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-700/30 dark:text-neutral-300 dark:focus:ring-1"
          required
          aria-describedby={errorId}
        />
      </div>
      <p className="mt-2 hidden text-xs text-red-600" id={errorId}>
        Please include a valid email address so we can get back to you
      </p>
    </div>
  );
}
