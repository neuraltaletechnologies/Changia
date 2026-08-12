type EmailContactInputProps = {
  label?: string;
  id: string;
  name?: string;
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  error?: string;
};

export default function EmailContactInput({
  label = 'Email',
  id,
  name = 'hs-email-contacts',
  value,
  onChange,
  required,
  error,
}: EmailContactInputProps) {
  const hasError = Boolean(error);
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        type="email"
        name={name}
        id={id}
        autoComplete="email"
        placeholder="Email"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
        className={`block w-full rounded-lg border bg-neutral-50 px-4 py-3 text-sm text-neutral-700 placeholder:text-neutral-500 focus:outline-hidden disabled:pointer-events-none disabled:opacity-50 dark:bg-neutral-700/30 dark:text-neutral-300 dark:placeholder:text-neutral-400 ${
          hasError
            ? 'border-red-500 focus:border-red-500 focus:ring-3 focus:ring-red-500/20 dark:border-red-500/70'
            : 'border-neutral-200 focus:border-neutral-200 focus:ring-3 focus:ring-neutral-400 dark:border-neutral-600 dark:focus:ring-1'
        }`}
        required={required}
      />
      <p
        id={errorId}
        role="alert"
        className={`mt-1 text-xs text-red-600 ${hasError ? '' : 'hidden'}`}
      >
        {error}
      </p>
    </div>
  );
}
