'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

type PasswordInputProps = {
  label?: string;
  forgot?: boolean;
  id?: string;
  errorId?: string;
  content?: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
};

export default function PasswordInput({
  label = 'Password',
  forgot,
  id,
  errorId,
  content,
  value,
  onChange,
  error,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="mb-2 block text-sm text-neutral-800 dark:text-neutral-200">
          {label}
        </label>
        {forgot ? (
          <button
            type="button"
            className="rounded-lg text-sm font-medium text-emerald-600 decoration-2 ring-zinc-500 outline-hidden hover:underline focus-visible:ring-3 dark:text-emerald-400 dark:ring-zinc-200 dark:focus:ring-1 dark:focus:outline-hidden"
            data-hs-overlay="#hs-toggle-between-modals-recover-modal"
          >
            Forgot password?
          </button>
        ) : null}
      </div>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          id={id}
          name="password"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={`block w-full rounded-lg border bg-neutral-50 px-4 py-3 pr-11 text-sm text-neutral-700 focus:outline-hidden disabled:pointer-events-none disabled:opacity-50 dark:bg-neutral-700/30 dark:text-neutral-300 ${
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-3 focus:ring-red-500/20 dark:border-red-500/70'
              : 'border-neutral-200 focus:border-neutral-200 focus:ring-3 focus:ring-neutral-400 dark:border-neutral-600 dark:focus:ring-1'
          }`}
          required
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="absolute end-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      <p
        className={`mt-2 text-xs text-red-600 ${error ? '' : 'hidden'}`}
        id={errorId}
        role="alert"
      >
        {error ?? content}
      </p>
    </div>
  );
}
