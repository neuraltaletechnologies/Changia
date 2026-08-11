type EmailInputProps = {
  label?: string;
  id: string;
  errorId: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
};

export default function EmailInput({
  label = 'Email address',
  id,
  errorId,
  value,
  onChange,
  error,
}: EmailInputProps) {
  const hasError = Boolean(error);
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
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          aria-invalid={hasError}
          aria-describedby={error ? errorId : undefined}
          className={`block w-full rounded-lg border bg-neutral-50 px-4 py-3 text-sm text-neutral-700 focus:outline-hidden disabled:pointer-events-none disabled:opacity-50 dark:bg-neutral-700/30 dark:text-neutral-300 ${
            hasError
              ? 'border-red-500 focus:border-red-500 focus:ring-3 focus:ring-red-500/20 dark:border-red-500/70'
              : 'border-neutral-200 focus:border-neutral-200 focus:ring-3 focus:ring-neutral-400 dark:border-neutral-600 dark:focus:ring-1'
          }`}
          required
        />
      </div>
      <p
        id={errorId}
        role="alert"
        className={`mt-2 text-xs text-red-600 ${hasError ? '' : 'hidden'}`}
      >
        {error ?? 'Please include a valid email address so we can get back to you'}
      </p>
    </div>
  );
}
