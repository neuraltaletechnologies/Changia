import { Suspense } from 'react';
import LoginForm from '@/components/ui/forms/LoginForm';

export const metadata = {
  title: 'Sign in',
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-200 px-4 py-10 dark:bg-neutral-800">
      <div className="w-full max-w-md">
        <Suspense
          fallback={
            <div className="rounded-xl border border-neutral-200 bg-neutral-100 p-7 text-center text-sm text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
              Loading…
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
