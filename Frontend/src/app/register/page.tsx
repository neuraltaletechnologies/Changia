import { Suspense } from 'react';
import RegisterForm from '@/components/ui/forms/RegisterForm';

export const metadata = {
  title: 'Sign up',
};

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-200 px-4 py-10 dark:bg-neutral-800">
      <div className="w-full max-w-lg">
        <Suspense
          fallback={
            <div className="rounded-xl border border-neutral-200 bg-neutral-100 p-7 text-center text-sm text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
              Loading…
            </div>
          }
        >
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  );
}
