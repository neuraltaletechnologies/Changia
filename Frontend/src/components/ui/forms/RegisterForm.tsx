'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import EmailInput from './input/EmailInput';
import PasswordInput from './input/PasswordInput';
import Checkbox from './input/Checkbox';
import AuthBtn from '../buttons/AuthBtn';
import GoogleBtn from '../buttons/GoogleBtn';
import { ApiClientError, registerRequest, setSession } from '@/lib/api-client';

export default function RegisterForm() {
  const router = useRouter();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    organizationName: '',
    password: '',
    confirmPassword: '',
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const setField = (field: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const nextErrors: Record<string, string> = {};
    if (!form.firstName.trim()) nextErrors.firstName = 'First name is required.';
    else if (form.firstName.trim().length < 2)
      nextErrors.firstName = 'First name must be at least 2 characters.';
    else if (form.firstName.trim().length > 100)
      nextErrors.firstName = 'First name must be 100 characters or fewer.';
    if (form.lastName && form.lastName.trim().length > 100)
      nextErrors.lastName = 'Last name must be 100 characters or fewer.';
    if (!form.email.trim()) nextErrors.email = 'Email is required.';
    else if (!/.+@.+\..+/.test(form.email.trim()))
      nextErrors.email = 'Please enter a valid email address.';
    if (!form.phone.trim()) nextErrors.phone = 'Phone number is required.';
    else if (!/^(\+?255|0)?[67][0-9]{8}$/.test(form.phone.replace(/[\s-]/g, '')))
      nextErrors.phone = 'Enter a valid Tanzanian phone number.';
    if (!form.organizationName.trim())
      nextErrors.organizationName = 'Organization name is required.';
    else if (form.organizationName.trim().length < 2)
      nextErrors.organizationName = 'Organization name must be at least 2 characters.';
    else if (form.organizationName.trim().length > 150)
      nextErrors.organizationName = 'Organization name must be 150 characters or fewer.';
    if (!form.password) nextErrors.password = 'Password is required.';
    else if (form.password.length < 8)
      nextErrors.password = 'Password must be at least 8 characters.';
    else if (form.password.length > 128)
      nextErrors.password = 'Password must be 128 characters or fewer.';
    if (form.confirmPassword !== form.password)
      nextErrors.confirmPassword = 'Passwords do not match.';
    if (!termsAccepted) nextErrors.terms = 'Please accept the terms and conditions to continue.';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      const { accessToken, user } = await registerRequest({
        firstName: form.firstName,
        lastName: form.lastName || undefined,
        email: form.email,
        phone: form.phone,
        password: form.password,
        confirmPassword: form.confirmPassword,
        organizationName: form.organizationName,
        termsAccepted,
      });
      // Auto sign-in after registration
      setSession(accessToken, user);
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'Unable to create your account. Please try again.'
      );
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-100 p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-800 sm:p-7">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-200">
          Create your organization
        </h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Already have an account?{' '}
          <Link
            href="/login"
            className="rounded-lg p-1 font-medium text-orange-400 decoration-2 ring-zinc-500 outline-hidden hover:underline focus-visible:ring-3 dark:text-orange-400 dark:ring-zinc-200 dark:focus:outline-hidden"
          >
            Sign in here
          </Link>
        </p>
        <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-500">
          One account creates your organization and makes you its administrator.
        </p>
      </div>

      {error ? (
        <div
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="mt-5">
        <GoogleBtn title="Sign up with Google" />
        <div className="flex items-center py-3 text-xs text-neutral-400 uppercase before:me-6 before:flex-[1_1_0%] before:border-t before:border-neutral-200 after:ms-6 after:flex-[1_1_0%] after:border-t after:border-neutral-200 dark:text-neutral-500 dark:before:border-neutral-600 dark:after:border-neutral-600">
          Or
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="grid gap-y-4">
            <div className="grid gap-y-4 sm:grid-cols-2 sm:gap-x-4">
              <div>
                <label
                  htmlFor="register-first-name"
                  className="mb-2 block text-sm text-neutral-800 dark:text-neutral-200"
                >
                  First name
                </label>
                <input
                  id="register-first-name"
                  name="firstName"
                  value={form.firstName}
                  onChange={(e) => setField('firstName')(e.target.value)}
                  maxLength={100}
                  required
                  aria-invalid={Boolean(errors.firstName)}
                  className="block w-full rounded-lg border bg-neutral-50 px-4 py-3 text-sm text-neutral-700 focus:outline-hidden dark:bg-neutral-700/30 dark:text-neutral-300"
                  placeholder="Amina"
                />
                {errors.firstName ? (
                  <p role="alert" className="mt-1 text-xs text-red-600">{errors.firstName}</p>
                ) : null}
              </div>
              <div>
                <label
                  htmlFor="register-last-name"
                  className="mb-2 block text-sm text-neutral-800 dark:text-neutral-200"
                >
                  Last name
                </label>
                <input
                  id="register-last-name"
                  name="lastName"
                  value={form.lastName}
                  onChange={(e) => setField('lastName')(e.target.value)}
                  maxLength={100}
                  aria-invalid={Boolean(errors.lastName)}
                  className="block w-full rounded-lg border bg-neutral-50 px-4 py-3 text-sm text-neutral-700 focus:outline-hidden dark:bg-neutral-700/30 dark:text-neutral-300"
                  placeholder="Msuya"
                />
                {errors.lastName ? (
                  <p role="alert" className="mt-1 text-xs text-red-600">{errors.lastName}</p>
                ) : null}
              </div>
            </div>

            <div>
              <label
                htmlFor="register-org-name"
                className="mb-2 block text-sm text-neutral-800 dark:text-neutral-200"
              >
                Organization name
              </label>
              <input
                id="register-org-name"
                name="organizationName"
                value={form.organizationName}
                onChange={(e) => setField('organizationName')(e.target.value)}
                maxLength={150}
                required
                aria-invalid={Boolean(errors.organizationName)}
                className="block w-full rounded-lg border bg-neutral-50 px-4 py-3 text-sm text-neutral-700 focus:outline-hidden dark:bg-neutral-700/30 dark:text-neutral-300"
                placeholder="Dr. Msuya Foundation"
              />
              {errors.organizationName ? (
                <p role="alert" className="mt-1 text-xs text-red-600">{errors.organizationName}</p>
              ) : null}
            </div>

            <EmailInput
              id="register-email"
              errorId="register-email-error"
              value={form.email}
              onChange={setField('email')}
              error={errors.email}
            />

            <div>
              <label
                htmlFor="register-phone"
                className="mb-2 block text-sm text-neutral-800 dark:text-neutral-200"
              >
                Phone number
              </label>
              <input
                id="register-phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setField('phone')(e.target.value)}
                required
                aria-invalid={Boolean(errors.phone)}
                placeholder="0712 345 678"
                className="block w-full rounded-lg border bg-neutral-50 px-4 py-3 text-sm text-neutral-700 focus:outline-hidden dark:bg-neutral-700/30 dark:text-neutral-300"
              />
              {errors.phone ? (
                <p role="alert" className="mt-1 text-xs text-red-600">{errors.phone}</p>
              ) : null}
            </div>

            <PasswordInput
              id="create-password"
              errorId="register-password-error"
              content="8+ characters required"
              value={form.password}
              onChange={setField('password')}
              error={errors.password}
            />
            <PasswordInput
              label="Confirm Password"
              id="confirm-password"
              errorId="confirm-password-error"
              content="Password does not match the password"
              value={form.confirmPassword}
              onChange={setField('confirmPassword')}
              error={errors.confirmPassword}
            />

            <Checkbox
              label="I accept the "
              id="terms-agree"
              checked={termsAccepted}
              onChange={setTermsAccepted}
            >
              <Link
                className="font-medium text-orange-400 decoration-2 hover:underline dark:text-orange-400"
                href="/terms"
                target="_blank"
              >
                Terms and Conditions
              </Link>
            </Checkbox>
            {errors.terms ? (
              <p role="alert" className="-mt-2 text-xs text-red-600">{errors.terms}</p>
            ) : null}

            <AuthBtn
              title={loading ? 'Creating account…' : 'Create account'}
              disabled={loading}
            />
          </div>
        </form>
      </div>
    </div>
  );
}
