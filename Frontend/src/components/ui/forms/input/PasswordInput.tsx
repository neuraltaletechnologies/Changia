type PasswordInputProps = {
  label?: string;
  forgot?: boolean;
  id?: string;
  errorId?: string;
  content?: string;
};

export default function PasswordInput({
  label = 'Password',
  forgot,
  id,
  errorId,
  content,
}: PasswordInputProps) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="mb-2 block text-sm text-neutral-800 dark:text-neutral-200">
          {label}
        </label>
        {forgot ? (
          <button
            type="button"
            className="rounded-lg text-sm font-medium text-orange-400 decoration-2 ring-zinc-500 outline-hidden hover:underline focus-visible:ring-3 dark:text-orange-400 dark:ring-zinc-200 dark:focus:ring-1 dark:focus:outline-hidden"
            data-hs-overlay="#hs-toggle-between-modals-recover-modal"
          >
            Forgot password?
          </button>
        ) : null}
      </div>
      <div className="relative">
        <input
          type="password"
          id={id}
          name="password"
          className="block w-full rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700 focus:border-neutral-200 focus:ring-3 focus:ring-neutral-400 focus:outline-hidden disabled:pointer-events-none disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-700/30 dark:text-neutral-300 dark:focus:ring-1"
          required
          aria-describedby={errorId}
        />
      </div>
      <p className="mt-2 hidden text-xs text-red-600" id={errorId}>
        {content}
      </p>
    </div>
  );
}
